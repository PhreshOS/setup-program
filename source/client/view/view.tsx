import { HostProvider, useHostTheme } from "@phreshos/react"
import Application from "@client/core/application"
import usePromise from "@libs/react-promise"
import type { ProgramReleasePage } from "@server/core/program-releases"
import { useMemo, useState } from "react"
import App from "./app"
import "./style.css"

export default function View() {
    return <HostProvider provide={["theme"]} fallback={<ResourceState message="Preparing Setup…" />}>
        <Setup />
    </HostProvider>
}

function Setup() {
    const theme = useHostTheme()
    const application = useMemo(() => new Application(), [])
    const preparation = usePromise(() => application.prepare(), [application])
    const catalog = useCatalog(application)

    if (preparation.isPending) return <ResourceState message="Preparing Setup…" />

    if (preparation.exception) return <ResourceState
        message={message(preparation.exception.current)}
        retry={() => void preparation.safeExecute()}
    />

    return <App theme={theme} close={() => application.close()} catalog={catalog} />
}

function useCatalog(application: Application) {
    const initial = usePromise(() => application.programReleases(), [application])
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
        void initial.safeExecute()
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

function ResourceState({ message, retry }: Readonly<{ message: string, retry?: () => void }>) {
    return <main className="resource-state" role="status">
        <p>{message}</p>
        {retry && <button type="button" onClick={retry}>Try again</button>}
    </main>
}

function message(value: unknown) {
    return value instanceof Error ? value.message : "Setup could not start"
}
