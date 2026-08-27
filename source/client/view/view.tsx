import { SystemProvider, useSystemAppearance, useSystemTheme } from "@phreshos/react"
import { AppearanceProvider, useResolveTheme } from "@phreshos/react-ui"
import Application from "@client/core/application"
import usePromise from "@libs/react-promise"
import type { InstallationSnapshot } from "@server/core/program-installer"
import type { ProgramReleasePage } from "@server/core/program-releases"
import { useEffect, useMemo, useRef, useState } from "react"
import App from "./app"
import "./style.css"

export default function View() {
    return <SystemProvider provide={["appearance", "theme"]} fallback={<ResourceState message="Preparing Setup…" />}>
        <Setup />
    </SystemProvider>
}

function Setup() {
    const appearance = useSystemAppearance()
    const theme = useSystemTheme()

    return <AppearanceProvider appearance={appearance} theme={theme}>
        <ResolvedSetup />
    </AppearanceProvider>
}

function ResolvedSetup() {
    const appearance = useSystemAppearance()
    const colors = {
        background: useResolveTheme(appearance.background),
        foreground: useResolveTheme(appearance.foreground),
        accent: useResolveTheme(appearance.accent)
    }
    const application = useMemo(() => new Application(), [])
    const preparation = usePromise(() => application.prepare(), [application])
    const catalog = useCatalog(application)
    const installation = useInstallation(application)

    if (preparation.isPending) return <ResourceState message="Preparing Setup…" />

    if (preparation.exception) return <ResourceState
        message={message(preparation.exception.current)}
        retry={() => void preparation.safeExecute()}
    />

    return <App appearance={colors} close={() => application.close()} catalog={catalog} installation={installation} />
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

function ResourceState({ message, retry }: Readonly<{ message: string, retry?: () => void }>) {
    return <main className="resource-state" role="status">
        <p>{message}</p>
        {retry && <button type="button" onClick={retry}>Try again</button>}
    </main>
}

function message(value: unknown) {
    return value instanceof Error ? value.message : "Setup could not start"
}
