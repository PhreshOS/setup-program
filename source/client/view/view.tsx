import { DesktopProvider, SystemProvider, useDesktopPreferences, useSystemAppearance, useWindowState } from "@phreshos/react"
import { context, desktop, system } from "@phreshos/client"
import { Button, ProgressBar, UIProvider, useAppearance, useThemedValue } from "@phreshos/react-ui"
import Application from "@client/core/application"
import usePromise from "@libs/react-promise"
import type { WindowState } from "@phreshos/core"
import type { InstallationSnapshot } from "@server/core/program-installer"
import type { ProgramReleasePage } from "@server/core/program-releases"
import { useEffect, useMemo, useRef, useState } from "react"
import App from "./app"
import "./style.css"

export default function View() {
    return <SystemProvider system={system} fallback={<ResourceState />}>
        <DesktopProvider desktop={desktop} fallback={<ResourceState />}>
            <Setup />
        </DesktopProvider>
    </SystemProvider>
}

function Setup() {
    const appearance = useSystemAppearance()
    const preferences = useDesktopPreferences()

    return <UIProvider appearance={appearance} preferences={preferences}>
        <ResolvedSetup />
    </UIProvider>
}

function ResolvedSetup() {
    const window = useWindowState(context.window)

    return window
        ? <PresentedSetup window={window} />
        : <ResourceState />
}

function PresentedSetup({ window }: Readonly<{ window: WindowState }>) {
    const application = useMemo(() => new Application(), [])
    const presented = useRef(false)
    const revealed = useRef(false)
    const preparation = usePromise(() => application.present(window), [
        application,
        window.layer,
        window.position,
        window.size,
        window.minimized,
        window.maximized,
        window.front
    ])
    const catalog = useCatalog(application)
    const installation = useInstallation(application)

    if (preparation.exception) return <ResourceState
        message={message(preparation.exception.current)}
        retry={() => void preparation.safeExecute()}
    />

    if (!presented.current && preparation.isPending) return null

    if (!preparation.isPending) presented.current = true

    // The first catalog and installation snapshots define one complete Setup view.
    // Retrying or receiving later updates must not hide that view again.
    if (!revealed.current && (catalog.isPending || installation.isPending)) {
        return <ResourceState />
    }

    revealed.current = true

    return <App close={() => application.close()} catalog={catalog} installation={installation} />
}

function useCatalog(application: Application) {
    const [attempt, setAttempt] = useState(0)
    const initial = usePromise(() => application.programReleases(1, 20, attempt > 0), [application, attempt])
    const continuation = usePromise((page: number) => application.programReleases(page))
    const [additional, setAdditional] = useState<readonly ProgramReleasePage[]>([])
    const pages = initial.solve ? [initial.solve, ...additional] : []
    const releases = pages.flatMap(page => page.releases)
    const nextPage = pages.at(-1)?.nextPage ?? null

    async function more() {
        if (!nextPage || continuation.isPending) return

        const page = await continuation.safeExecute(nextPage)

        if (page) setAdditional(current => (
            current.some(value => value.page === page.page) ? current : [...current, page]
        ))
    }

    function retry() {
        setAdditional([])
        setAttempt(current => current + 1)
    }

    return {
        releases,
        isPending: initial.isPending,
        exception: initial.exception?.current,
        continuationException: continuation.exception?.current,
        isLoadingMore: continuation.isPending,
        hasMore: nextPage !== null,
        more: () => void more(),
        retry
    }
}

function useInstallation(application: Application) {
    const snapshot = usePromise(() => application.installation(), [application])
    const starting = usePromise(() => application.installAll())
    const ready = useRef(false)
    const buffered = useRef<InstallationSnapshot | undefined>(undefined)

    useEffect(() => application.subscribeInstallation(next => {
        if (!ready.current) {
            if (!buffered.current || next.revision >= buffered.current.revision) buffered.current = next
            return
        }

        snapshot.dispatch(current => next.revision >= current.revision ? next : current)
    }), [application, snapshot.dispatch])

    useEffect(() => {
        if (!snapshot.solve) {
            ready.current = false
            return
        }

        ready.current = true

        const next = buffered.current

        buffered.current = undefined

        if (next && next.revision >= snapshot.solve.revision) snapshot.dispatch(next)
    }, [snapshot.dispatch, snapshot.solve])

    async function install() {
        const next = await starting.safeExecute()

        if (next && snapshot.solve) {
            snapshot.dispatch(current => next.revision >= current.revision ? next : current)
        }
    }

    return {
        snapshot: snapshot.solve,
        isPending: snapshot.isPending,
        exception: snapshot.exception?.current ?? starting.exception?.current,
        install: () => void install()
    }
}

function ResourceState({ message, retry }: Readonly<{ message?: string, retry?: () => void }>) {
    const foreground = useThemedValue(useAppearance().colors).foreground

    return <main className="resource-state" role={retry ? "alert" : "status"} style={{ color: foreground }}>
        {retry ? <p>{message}</p> : <ProgressBar indeterminate aria-label="Preparing Setup" size="small" />}
        {retry && <Button size="small" onPress={retry}>Try again</Button>}
    </main>
}

function message(value: unknown) {
    return value instanceof Error ? value.message : "Setup could not start"
}
