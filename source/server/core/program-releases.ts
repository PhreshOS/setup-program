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

export type ProgramRelease = Readonly<{
    identity: string
    version: string
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
    public constructor(private readonly fetcher: Fetcher = fetch) {}

    public async latest(identity: string): Promise<ProgramRelease> {
        const selected = await this.resolve(identity)

        if (!selected) throw new Error(`No stable ${identity} Program release is available`)

        return selected
    }

    public async list(page: number, limit: number): Promise<ProgramReleasePage> {
        const response = await this.fetcher(
            `https://api.github.com/orgs/PhreshOS/repos?type=public&sort=full_name&per_page=${limit}&page=${page}`,
            { headers: githubHeaders }
        )

        if (!response.ok) {
            throw new Error(`The official Program catalog could not be read (${response.status} ${response.statusText})`)
        }

        const repositories = repositoryList.parse(await response.json())
        const identities = repositories
            .filter(value => !value.archived && !value.fork && value.name.endsWith("-program"))
            .map(value => value.name.slice(0, -"-program".length))

        const releases = (await Promise.all(identities.map(identity => this.resolve(identity))))
            .filter((value): value is ProgramRelease => value !== null)
            .sort((left, right) => left.identity.localeCompare(right.identity))

        return Object.freeze({
            releases: Object.freeze(releases),
            page,
            nextPage: repositories.length === limit ? page + 1 : null
        })
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

        return selected ?? null
    }
}

const githubHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "PhreshOS-Setup",
    "X-GitHub-Api-Version": "2022-11-28"
} as const

function candidate(identity: string, value: z.infer<typeof release>): ProgramRelease[] {
    if (value.draft || value.prerelease) return []

    const prefix = `${identity}@`
    const archive = value.assets.find(item => item.name.startsWith(prefix) && item.name.endsWith(".zip"))

    if (!archive) return []

    const version = archive.name.slice(prefix.length, -".zip".length)

    if (!stableVersion.test(version) || value.tag_name !== `v${version}`) return []

    const checksum = value.assets.find(item => item.name === `${archive.name}.sha256`)

    if (!checksum) return []

    return [{
        identity,
        version,
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
