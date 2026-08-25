import type { ThemeProperties } from "@phreshos/core"
import usePromise from "@libs/react-promise"
import type { InstallationSnapshot, ProgramInstallation } from "@server/core/program-installer"
import type { ProgramRelease } from "@server/core/program-releases"
import type { CSSProperties } from "react"

export default function App({ theme, close, catalog, installation }: Properties) {
    const closing = usePromise(close)
    const installing = installation.snapshot?.status === "running"

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

            <div className="program-actions">
                <button
                    className="install-programs"
                    type="button"
                    disabled={
                        catalog.isPending
                        || catalog.exception !== undefined
                        || catalog.releases.length === 0
                        || installation.isPending
                        || installing
                        || installation.snapshot?.status === "completed"
                    }
                    onClick={installation.install}
                >
                    {installLabel(installation)}
                </button>

                <button
                    className="close-setup"
                    type="button"
                    disabled={closing.isPending || installing}
                    onClick={() => void closing.safeExecute()}
                >
                    {closing.isPending ? "Closing…" : "Close"}
                </button>
            </div>
        </header>

        <OperationState closing={closing.exception?.current} installation={installation} />

        <ProgramCatalog catalog={catalog} installation={installation.snapshot} />
    </main>
}

function OperationState({ closing, installation }: Readonly<{ closing: unknown, installation: Installation }>) {
    const snapshot = installation.snapshot

    if (closing !== undefined || installation.exception !== undefined) {
        return <p className="operation-error" role="alert">{message(closing ?? installation.exception)}</p>
    }

    if (!snapshot || snapshot.status === "idle") return <div />

    const active = snapshot.programs.find(program => !terminal(program.status))

    return <div className="installation-progress" role="status">
        <progress max={snapshot.total || 1} value={snapshot.completed} />
        <span>{snapshot.completed} of {snapshot.total}</span>
        <strong>{installationSummary(snapshot, active)}</strong>
    </div>
}

function ProgramCatalog({ catalog, installation }: Readonly<{ catalog: Catalog, installation?: InstallationSnapshot }>) {
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
            {catalog.releases.map(release => <ProgramEntry
                key={release.identity}
                release={release}
                installation={installation?.programs.find(program => program.identity === release.identity)}
            />)}
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

function ProgramEntry({ release, installation }: Readonly<{ release: ProgramRelease, installation?: ProgramInstallation }>) {
    return <article className="program-entry">
        {release.icon
            ? <img className="program-icon" src={release.icon} alt="" loading="lazy" />
            : <span className="program-icon" aria-hidden="true" />}

        <div className="program-summary">
            <header>
                <strong>{release.name}</strong>
                <span>v{release.version}</span>
            </header>

            <span className="program-identity">{release.identity}</span>

            <p>{release.description}</p>

            <div className="program-classification">
                <ProgramValues label="Categories" values={release.categories} />
                <ProgramValues label="Keywords" values={release.keywords} />
            </div>
        </div>

        <dl className="program-details">
            {release.website && <div>
                <dt>Website</dt>
                <dd title={release.website}>{release.website}</dd>
            </div>}
            {installation && <div>
                <dt>Installation</dt>
                <dd className={`installation-${installation.status}`} title={installation.error ?? undefined}>
                    {installation.error ?? installation.status.replaceAll("-", " ")}
                </dd>
            </div>}
        </dl>
    </article>
}

function ProgramValues({ label, values }: Readonly<{ label: string, values: readonly string[] }>) {
    return <div className="program-values">
        <span>{label}</span>
        <p>{values.join(" · ") || "—"}</p>
    </div>
}

function message(value: unknown) {
    if (value instanceof Error) return value.message
    if (typeof value === "string" && value) return value

    return "Setup could not complete the operation"
}

function installLabel(installation: Installation) {
    if (installation.isPending) return "Preparing…"

    const snapshot = installation.snapshot

    if (snapshot?.status === "running") return `Installing ${snapshot.completed}/${snapshot.total}`
    if (snapshot?.status === "completed") return "Installed"
    if (snapshot?.status === "failed") return "Try installation again"

    return "Install all"
}

function installationSummary(snapshot: InstallationSnapshot, active: ProgramInstallation | undefined) {
    if (snapshot.status === "completed") return "All Programs are installed"
    if (snapshot.status === "failed") return `${snapshot.programs.filter(program => program.status === "failed").length} failed`
    if (!active) return "Finishing installation…"

    return `${active.name}: ${active.status.replaceAll("-", " ")}`
}

function terminal(status: ProgramInstallation["status"]) {
    return status === "installed" || status === "already-installed" || status === "failed"
}

type Properties = Readonly<{
    theme: Readonly<ThemeProperties>
    close: () => Promise<void>
    catalog: Catalog
    installation: Installation
}>

type Installation = Readonly<{
    snapshot?: InstallationSnapshot
    isPending: boolean
    exception: unknown
    install: () => void
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
