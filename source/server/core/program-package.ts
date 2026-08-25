import type { ProgramRelease } from "./program-releases"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import AdmZip from "adm-zip"

export type PreparedProgramPackage = Readonly<{
    program: string
    dispose: () => Promise<void>
}>

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

/** Downloads, verifies, and safely opens one official Program package. */
export default class ProgramPackage {
    public constructor(
        private readonly release: ProgramRelease,
        private readonly fetcher: Fetcher = fetch
    ) {}

    public async prepare(verifying: () => void = () => undefined): Promise<PreparedProgramPackage> {
        const [archive, checksum] = await Promise.all([
            this.download(this.release.archive, maximumArchiveBytes),
            this.download(this.release.checksum, maximumChecksumBytes)
        ])

        verifying()
        verifyChecksum(this.release, archive, checksum.toString("utf8"))

        const directory = await mkdtemp(join(tmpdir(), `phresh-setup-${this.release.identity}-`))

        try {
            await extract(archive, directory)
            await verifyProgram(directory, this.release)

            return Object.freeze({
                program: join(directory, "program.json"),
                dispose: () => rm(directory, { recursive: true, force: true })
            })
        } catch (exception) {
            await rm(directory, { recursive: true, force: true })
            throw exception
        }
    }

    private async download(url: string, maximum: number) {
        const response = await this.fetcher(url, {
            headers: { "User-Agent": "PhreshOS-Setup" },
            signal: AbortSignal.timeout(downloadTimeout)
        })

        if (!response.ok) {
            throw new Error(`A ${this.release.identity} Program asset could not be downloaded (${response.status} ${response.statusText})`)
        }

        const reader = response.body?.getReader()

        if (!reader) throw new Error(`A ${this.release.identity} Program asset returned no content`)

        const chunks: Uint8Array[] = []
        let length = 0

        while (true) {
            const next = await reader.read()

            if (next.done) break

            length += next.value.byteLength

            if (length > maximum) {
                await reader.cancel()
                throw new Error(`A ${this.release.identity} Program asset exceeds its safe size limit`)
            }

            chunks.push(next.value)
        }

        return Buffer.concat(chunks, length)
    }
}

function verifyChecksum(release: ProgramRelease, archive: Buffer, checksum: string) {
    const name = `${release.identity}@${release.version}.zip`
    const match = /^([a-f0-9]{64})\s+(.+)$/i.exec(checksum.trim())

    if (!match || match[2] !== name) throw new Error(`The checksum for ${name} is invalid`)

    const digest = createHash("sha256").update(archive).digest("hex")

    if (digest !== match[1]?.toLowerCase()) throw new Error(`The downloaded ${name} does not match its SHA-256 checksum`)
}

async function extract(bytes: Buffer, directory: string) {
    const archive = new AdmZip(bytes)
    const entries = archive.getEntries()

    if (entries.length > maximumArchiveEntries) throw new Error("The Program package contains too many files")

    let extractedBytes = 0

    for (const entry of entries) {
        const name = entry.entryName.replaceAll("\\", "/")
        const destination = resolve(directory, name)
        const within = relative(directory, destination)

        if (!name || name.startsWith("/") || name.split("/").includes("..") || isAbsolute(within) || within.startsWith("..")) {
            throw new Error(`The Program package contains an unsafe path: ${entry.entryName}`)
        }

        if (entry.isDirectory) {
            await mkdir(destination, { recursive: true, mode: 0o700 })
            continue
        }

        const content = entry.getData()

        extractedBytes += content.byteLength

        if (extractedBytes > maximumExtractedBytes) throw new Error("The Program package exceeds its safe extracted size limit")

        await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
        await writeFile(destination, content, { mode: 0o600 })
    }
}

async function verifyProgram(directory: string, release: ProgramRelease) {
    let value: unknown

    try { value = JSON.parse(await readFile(join(directory, "program.json"), "utf8")) }
    catch { throw new Error(`The ${release.identity} Program package has no valid program.json`) }

    if (!record(value) || value.identity !== release.identity || value.version !== release.version) {
        throw new Error(`The ${release.identity} Program package identity or version does not match its release`)
    }
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

const downloadTimeout = 120_000
const maximumArchiveBytes = 512 * 1_024 * 1_024
const maximumChecksumBytes = 4 * 1_024
const maximumExtractedBytes = 1_024 * 1_024 * 1_024
const maximumArchiveEntries = 100_000
