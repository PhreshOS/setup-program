import usePromise from "@libs/react-promise"
import { Button, ProgressBar, ScrollArea, useAppearance, useThemedValue } from "@phreshos/react-ui"
import type { InstallationSnapshot, ProgramInstallation } from "@server/core/program-installer"
import type { ProgramRelease } from "@server/core/program-releases"

export default function App({ close, catalog, installation }: Properties) {
    const foreground = useThemedValue(useAppearance().colors).foreground
    const closing = usePromise(close)
    const installing = installation.snapshot?.status === "running"

    return <main
        className="programs"
        style={{ color: foreground }}
        data-closing={closing.isPending || undefined}
    >
        <header className="programs-header">
            <div>
                <span className="programs-eyebrow">Setup</span>
                <h1>Programs</h1>
            </div>

            <div className="program-actions">
                <Button
                    color="primary:base"
                    size="small"
                    disabled={
                        catalog.isPending
                        || catalog.exception !== undefined
                        || catalog.releases.length === 0
                        || installation.isPending
                        || installing
                        || installation.snapshot?.status === "completed"
                    }
                    onPress={installation.install}
                >
                    {installLabel(installation)}
                </Button>

                <Button
                    size="small"
                    disabled={closing.isPending || installing}
                    onPress={() => void closing.safeExecute()}
                >
                    {closing.isPending ? "Closing…" : "Close"}
                </Button>
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
        <ProgressBar
            color="primary:base"
            size="small"
            minValue={0}
            maxValue={snapshot.total || 1}
            value={snapshot.completed}
            valueLabel={`${snapshot.completed} of ${snapshot.total}`}
            label={installationSummary(snapshot, active)}
        />
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

        {catalog.isPending && <div className="catalog-state" role="status">
            <ProgressBar indeterminate aria-label="Loading Programs" size="small" />
        </div>}

        {catalog.exception !== undefined && <div className="catalog-state" role="alert">
            <p>{message(catalog.exception)}</p>
            <Button size="small" onPress={catalog.retry}>Try again</Button>
        </div>}

        {!catalog.isPending && !catalog.exception && catalog.releases.length === 0 && <p className="catalog-state">
            No released Programs were found.
        </p>}

        {catalog.releases.length > 0 && <ScrollArea className="program-list">
            <div className="program-grid">
                {catalog.releases.map(release => <ProgramEntry
                    key={release.identity}
                    release={release}
                    installation={installation?.programs.find(program => program.identity === release.identity)}
                />)}
            </div>
        </ScrollArea>}

        {catalog.continuationException !== undefined && <p className="catalog-more-error" role="alert">
            {message(catalog.continuationException)}
        </p>}

        {catalog.hasMore && !catalog.exception && <Button
            className="catalog-more"
            size="small"
            disabled={catalog.isLoadingMore}
            onPress={catalog.more}
        >
            {catalog.isLoadingMore ? "Loading…" : "Load more"}
        </Button>}
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
                <dd title={installation.error ?? undefined}>
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
