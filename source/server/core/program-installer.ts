import type { SystemProgramEntity } from "@phreshos/server"
import ProgramPackage, { type PreparedProgramPackage } from "./program-package"
import type { ProgramRelease } from "./program-releases"

export type ProgramInstallationStatus =
    | "pending"
    | "downloading"
    | "verifying"
    | "installing"
    | "installed"
    | "already-installed"
    | "failed"

export type ProgramInstallation = Readonly<{
    identity: string
    name: string
    status: ProgramInstallationStatus
    error: string | null
}>

export type InstallationSnapshot = Readonly<{
    revision: number
    status: "idle" | "running" | "completed" | "failed"
    completed: number
    total: number
    programs: readonly ProgramInstallation[]
}>

type ProgramCatalog = Readonly<{ all: () => Promise<readonly ProgramRelease[]> }>
type ProgramRegistry = Readonly<{
    find: (identity: string) => Promise<Pick<SystemProgramEntity, "installed"> | null>
    create: (source: string) => Promise<Pick<SystemProgramEntity, "install" | "forget">>
}>
type PackagePreparer = (release: ProgramRelease, verifying: () => void) => Promise<PreparedProgramPackage>
type Publisher = (snapshot: InstallationSnapshot) => void

/** Owns the one authoritative install-all operation for this Setup Server. */
export default class ProgramInstaller {
    private current: InstallationSnapshot = idleSnapshot

    public constructor(
        private readonly releases: ProgramCatalog,
        private readonly programs: ProgramRegistry,
        private readonly publish: Publisher,
        private readonly prepare: PackagePreparer = (release, verifying) => new ProgramPackage(release).prepare(verifying)
    ) {}

    public snapshot() {
        return this.current
    }

    public async start() {
        if (this.current.status === "running" || this.current.status === "completed") return this.current

        const releases = await this.releases.all()

        this.replace("running", releases.map(release => ({
            identity: release.identity,
            name: release.name,
            status: "pending",
            error: null
        })))

        void this.run(releases)

        return this.current
    }

    private async run(releases: readonly ProgramRelease[]) {
        for (const release of releases) {
            try { await this.install(release) }
            catch (exception) { this.update(release.identity, "failed", message(exception)) }
        }

        this.replace(
            this.current.programs.some(program => program.status === "failed") ? "failed" : "completed",
            this.current.programs
        )
    }

    private async install(release: ProgramRelease) {
        const existing = await this.programs.find(release.identity)

        if (existing) {
            if (await existing.installed()) {
                this.update(release.identity, "already-installed")
                return
            }

            throw new Error(`${release.name} already exists as an uninstalled runtime Program`)
        }

        this.update(release.identity, "downloading")

        const prepared = await this.prepare(release, () => this.update(release.identity, "verifying"))

        try {
            const program = await this.programs.create(prepared.program)

            try {
                this.update(release.identity, "installing")
                for await (const _chunk of program.install()) {
                    // Setup represents installation state; command output is
                    // consumed here so the authoritative operation can flow.
                }
                this.update(release.identity, "installed")
            } catch (exception) {
                await program.forget().catch(() => undefined)
                throw exception
            }
        } finally {
            await prepared.dispose()
        }
    }

    private update(identity: string, status: ProgramInstallationStatus, error: string | null = null) {
        this.replace("running", this.current.programs.map(program => (
            program.identity === identity ? { ...program, status, error } : program
        )))
    }

    private replace(status: InstallationSnapshot["status"], programs: readonly ProgramInstallation[]) {
        const immutable = Object.freeze(programs.map(program => Object.freeze({ ...program })))

        this.current = Object.freeze({
            revision: this.current.revision + 1,
            status,
            completed: immutable.filter(program => terminalStatuses.has(program.status)).length,
            total: immutable.length,
            programs: immutable
        })

        this.publish(this.current)
    }
}

function message(value: unknown) {
    return value instanceof Error ? value.message : String(value)
}

const terminalStatuses = new Set<ProgramInstallationStatus>(["installed", "already-installed", "failed"])

const idleSnapshot: InstallationSnapshot = Object.freeze({
    revision: 0,
    status: "idle",
    completed: 0,
    total: 0,
    programs: Object.freeze([])
})
