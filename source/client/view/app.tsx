import type { ThemeProperties } from "@phreshos/core"
import usePromise from "@libs/react-promise"
import type { ProgramRelease } from "@server/core/program-releases"
import type { CSSProperties } from "react"

export default function App({ theme, close, catalog }: Properties) {
    const closing = usePromise(close)

    return <main
        className="programs"
        data-closing={closing.isPending || undefined}
        style={{
            "--theme-background": theme.background,
            "--theme-foreground": theme.foreground,
            "--theme-accent": theme.accent
        } as CSSProperties}
    >
        <header className="programs-header">
            <div>
                <span className="programs-eyebrow">Setup</span>
                <h1>Programs</h1>
            </div>

            <button
                className="close-setup"
                type="button"
                disabled={closing.isPending}
                onClick={() => void closing.safeExecute()}
            >
                {closing.isPending ? "Closing…" : "Close"}
            </button>
        </header>

        {closing.exception && <p className="operation-error" role="alert">{message(closing.exception.current)}</p>}

        <ProgramCatalog catalog={catalog} />
    </main>
}

function ProgramCatalog({ catalog }: Readonly<{ catalog: Catalog }>) {
    return <section className="program-catalog" aria-label="Official Programs">
        <header>
            <span>Available</span>
            {!catalog.isPending && !catalog.exception && <span className="catalog-count">
                {catalog.releases.length}
            </span>}
        </header>

        {catalog.isPending && <p className="catalog-state" role="status">Loading Programs…</p>}

        {catalog.exception !== undefined && <div className="catalog-state" role="alert">
            <p>{message(catalog.exception)}</p>
            <button type="button" onClick={catalog.retry}>Try again</button>
        </div>}

        {!catalog.isPending && !catalog.exception && catalog.releases.length === 0 && <p className="catalog-state">
            No released Programs were found.
        </p>}

        {catalog.releases.length > 0 && <div className="program-grid">
            {catalog.releases.map(release => <ProgramCard key={release.identity} release={release} />)}
        </div>}

        {catalog.continuationException !== undefined && <p className="catalog-more-error" role="alert">
            {message(catalog.continuationException)}
        </p>}

        {catalog.hasMore && !catalog.exception && <button
            className="catalog-more"
            type="button"
            disabled={catalog.isLoadingMore}
            onClick={catalog.more}
        >
            {catalog.isLoadingMore ? "Loading…" : "Load more"}
        </button>}
    </section>
}

function ProgramCard({ release }: Readonly<{ release: ProgramRelease }>) {
    return <article className="program-card">
        <img className="program-icon" src={release.icon} alt="" loading="lazy" />

        <div className="program-information">
            <div className="program-card-heading">
                <strong>{release.name}</strong>
                <span>v{release.version}</span>
            </div>

            <p>{release.description}</p>

            <div className="program-categories">
                {release.categories.map(category => <span key={category}>{category}</span>)}
            </div>
        </div>
    </article>
}

function message(value: unknown) {
    return value instanceof Error ? value.message : "Setup could not close"
}

type Properties = Readonly<{
    theme: Readonly<ThemeProperties>
    close: () => Promise<void>
    catalog: Catalog
}>

export type Catalog = Readonly<{
    releases: readonly ProgramRelease[]
    isPending: boolean
    exception: unknown
    continuationException: unknown
    isLoadingMore: boolean
    hasMore: boolean
    more: () => void
    retry: () => void
}>
