import { z } from "zod"

const stableVersion = /^\d+\.\d+\.\d+$/

const asset = z.object({
    name: z.string(),
    browser_download_url: z.string().url()
}).passthrough()

const release = z.object({
    draft: z.boolean(),
    prerelease: z.boolean(),
    tag_name: z.string(),
    assets: z.array(asset)
}).passthrough()

const releaseList = z.array(release)

const repositoryList = z.array(z.object({
    name: z.string(),
    archived: z.boolean(),
    fork: z.boolean()
}).passthrough())

const programMetadata = z.object({
    schema: z.literal(1),
    identity: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    version: z.string().regex(stableVersion),
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(500),
    icon: z.literal("icon.png"),
    categories: z.array(z.string().trim().min(1).max(50)).max(20),
    keywords: z.array(z.string().trim().min(1).max(50)).max(50),
    website: z.string().url()
}).passthrough()

export type ProgramRelease = Readonly<{
    schema: 1
    identity: string
    version: string
    name: string
    description: string
    icon: string
    categories: readonly string[]
    keywords: readonly string[]
    website: string
    archive: string
    checksum: string
}>

type ProgramReleaseCandidate = Readonly<{
    identity: string
    version: string
    metadata: string
    icon: string
    archive: string
    checksum: string
}>

export type ProgramReleasePage = Readonly<{
    releases: readonly ProgramRelease[]
    page: number
    nextPage: number | null
}>

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

/** Resolves complete stable official Program releases from GitHub. */
export default class ProgramReleases {
    private catalog: readonly ProgramRelease[] | undefined
    private loading: Promise<readonly ProgramRelease[]> | undefined

    public constructor(private readonly fetcher: Fetcher = fetch) {}

    /** Loads the complete authoritative catalog exactly once for this Server run. */
    public async load(): Promise<void> {
        if (this.catalog) return

        const loading = this.loading ??= this.readCatalog()

        try {
            this.catalog = await loading
        } finally {
            if (!this.catalog) this.loading = undefined
        }
    }

    public latest(identity: string): ProgramRelease {
        const selected = this.loaded().find(release => release.identity === identity)

        if (!selected) throw new Error(`No stable ${identity} Program release is available`)

        return selected
    }

    public list(page: number, limit: number): ProgramReleasePage {
        const catalog = this.loaded()
        const start = (page - 1) * limit
        const releases = catalog.slice(start, start + limit)

        return Object.freeze({
            releases: Object.freeze(releases),
            page,
            nextPage: start + limit < catalog.length ? page + 1 : null
        })
    }

    private loaded() {
        if (!this.catalog) throw new Error("The Program catalog has not been loaded")

        return this.catalog
    }

    private async readCatalog(): Promise<readonly ProgramRelease[]> {
        const identities = new Set<string>()

        for (let page = 1; page <= maximumRepositoryPages; page++) {
            const repositories = await this.readRepositories(page)

            for (const repository of repositories) {
                if (!repository.archived && !repository.fork && repository.name.endsWith("-program")) {
                    identities.add(repository.name.slice(0, -"-program".length))
                }
            }

            if (repositories.length < repositoryPageSize) {
                const releases = (await Promise.all([...identities].map(identity => this.resolve(identity))))
                    .filter((value): value is ProgramRelease => value !== null)
                    .sort((left, right) => left.identity.localeCompare(right.identity))

                return Object.freeze(releases)
            }
        }

        throw new Error("The official Program catalog exceeds the safe repository limit")
    }

    private async readRepositories(page: number) {
        const response = await this.fetcher(
            `https://api.github.com/orgs/PhreshOS/repos?type=public&sort=full_name&per_page=${repositoryPageSize}&page=${page}`,
            { headers: githubHeaders }
        )

        if (!response.ok) {
            throw new Error(`The official Program catalog could not be read (${response.status} ${response.statusText})`)
        }

        return repositoryList.parse(await response.json())
    }

    private async resolve(identity: string): Promise<ProgramRelease | null> {
        const response = await this.fetcher(
            `https://api.github.com/repos/PhreshOS/${identity}-program/releases?per_page=100`,
            { headers: githubHeaders }
        )

        if (!response.ok) {
            throw new Error(`The ${identity} Program release list could not be read (${response.status} ${response.statusText})`)
        }

        const candidates = releaseList.parse(await response.json())
            .flatMap(value => candidate(identity, value))
            .sort((left, right) => compare(right.version, left.version))

        const selected = candidates[0]

        return selected ? await this.describe(selected) : null
    }

    private async describe(candidate: ProgramReleaseCandidate): Promise<ProgramRelease> {
        const response = await this.fetcher(candidate.metadata, { headers: githubHeaders })

        if (!response.ok) {
            throw new Error(`The ${candidate.identity} Program metadata could not be read (${response.status} ${response.statusText})`)
        }

        const metadata = programMetadata.parse(await response.json())

        if (metadata.identity !== candidate.identity || metadata.version !== candidate.version) {
            throw new Error(`The ${candidate.identity} Program metadata does not match its release`)
        }

        return Object.freeze({
            schema: metadata.schema,
            identity: candidate.identity,
            version: candidate.version,
            name: metadata.name,
            description: metadata.description,
            icon: candidate.icon,
            categories: Object.freeze([...metadata.categories]),
            keywords: Object.freeze([...metadata.keywords]),
            website: metadata.website,
            archive: candidate.archive,
            checksum: candidate.checksum
        })
    }
}

const repositoryPageSize = 100
const maximumRepositoryPages = 1_000

const githubHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "PhreshOS-Setup",
    "X-GitHub-Api-Version": "2022-11-28"
} as const

function candidate(identity: string, value: z.infer<typeof release>): ProgramReleaseCandidate[] {
    if (value.draft || value.prerelease) return []

    const prefix = `${identity}@`
    const archive = value.assets.find(item => item.name.startsWith(prefix) && item.name.endsWith(".zip"))

    if (!archive) return []

    const version = archive.name.slice(prefix.length, -".zip".length)

    if (!stableVersion.test(version) || value.tag_name !== `v${version}`) return []

    const checksum = value.assets.find(item => item.name === `${archive.name}.sha256`)
    const metadata = value.assets.find(item => item.name === "metadata.json")
    const icon = value.assets.find(item => item.name === "icon.png")

    if (!checksum || !metadata || !icon) return []

    return [{
        identity,
        version,
        metadata: metadata.browser_download_url,
        icon: icon.browser_download_url,
        archive: archive.browser_download_url,
        checksum: checksum.browser_download_url
    }]
}

function compare(left: string, right: string) {
    const leftParts = left.split(".").map(Number)
    const rightParts = right.split(".").map(Number)

    for (let index = 0; index < 3; index++) {
        const difference = leftParts[index] - rightParts[index]
        if (difference) return difference
    }

    return 0
}
