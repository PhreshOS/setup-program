import assert from "node:assert/strict"
import type { HostProgram, Program } from "@phreshos/server"
import ProgramInstaller, { type InstallationSnapshot } from "../source/server/core/program-installer"
import type { PreparedProgramPackage } from "../source/server/core/program-package"
import type { ProgramRelease } from "../source/server/core/program-releases"

const releases = [release("existing"), release("alpha"), release("broken")]
const publications: InstallationSnapshot[] = []
const installed: string[] = []
const disposed: string[] = []

let finish!: (snapshot: InstallationSnapshot) => void
const finished = new Promise<InstallationSnapshot>(resolve => { finish = resolve })

const programs = {
    async find(identity: string) {
        if (identity !== "existing") return null

        return { installed: async () => true } as Program
    },
    async create(path: string) {
        const identity = path.split("/").at(-2)!

        return {
            async *install() {
                if (identity === "broken") throw new Error("Installation failed")
                yield { stream: "stdout", text: `Installing ${identity}\n` } as const
                installed.push(identity)
            },
            async forget() {}
        } as unknown as Program
    }
} as HostProgram

const installer = new ProgramInstaller(
    { all: async () => releases },
    programs,
    snapshot => {
        publications.push(snapshot)
        if (snapshot.status === "completed" || snapshot.status === "failed") finish(snapshot)
    },
    async (selected, verifying): Promise<PreparedProgramPackage> => {
        verifying()

        return {
            program: `/temporary/${selected.identity}/program.json`,
            dispose: async () => { disposed.push(selected.identity) }
        }
    }
)

const started = await installer.start()
const duplicate = await installer.start()

assert.equal(started.status, "running")
assert.equal(duplicate.revision, started.revision, "A running batch must not be started twice")

const final = await finished

assert.equal(final.status, "failed")
assert.equal(final.completed, 3)
assert.equal(final.total, 3)
assert.deepEqual(final.programs.map(program => [program.identity, program.status]), [
    ["existing", "already-installed"],
    ["alpha", "installed"],
    ["broken", "failed"]
])
assert.deepEqual(installed, ["alpha"])
assert.deepEqual(disposed, ["alpha", "broken"])
assert(publications.some(snapshot => snapshot.programs.some(program => program.status === "downloading")))
assert(publications.some(snapshot => snapshot.programs.some(program => program.status === "verifying")))
assert(publications.some(snapshot => snapshot.programs.some(program => program.status === "installing")))

function release(identity: string): ProgramRelease {
    return {
        schema: 1,
        identity,
        version: "1.0.0",
        name: identity,
        description: identity,
        icon: `https://example.test/${identity}/icon.png`,
        categories: [],
        keywords: [],
        website: `https://example.test/${identity}`,
        archive: `https://example.test/${identity}.zip`,
        checksum: `https://example.test/${identity}.zip.sha256`
    }
}
