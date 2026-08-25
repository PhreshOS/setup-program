import assert from "node:assert/strict"
import ProgramReleases from "../source/server/core/program-releases"

let requested = ""
let catalogRequested = ""
let requestCount = 0

const releases = new ProgramReleases(async function (input) {
    requestCount++
    const url = String(input)

    if (url.includes("/orgs/PhreshOS/repos?")) {
        catalogRequested = url

        return Response.json([
            { name: "phresh-program", archived: false, fork: false },
            { name: "system", archived: false, fork: false }
        ])
    }

    if (url.endsWith("/metadata.json")) {
        return Response.json({
            schema: 1,
            identity: "phresh",
            version: "0.1.12",
            name: "Phresh Program",
            description: "A Program for testing PhreshOS.",
            icon: "icon.png",
            categories: ["Development"],
            keywords: ["example"],
            website: "https://example.test/phresh"
        })
    }

    requested = url

    return Response.json([
        githubRelease("0.1.8"),
        githubRelease("0.2.0", { prerelease: true }),
        githubRelease("0.1.12"),
        githubRelease("0.1.13", { assets: [] })
    ])
})

await releases.load()

assert.deepEqual(await releases.latest("phresh"), {
    schema: 1,
    identity: "phresh",
    version: "0.1.12",
    name: "Phresh Program",
    description: "A Program for testing PhreshOS.",
    icon: "https://example.test/0.1.12/icon.png",
    categories: ["Development"],
    keywords: ["example"],
    website: "https://example.test/phresh",
    archive: "https://example.test/phresh@0.1.12.zip",
    checksum: "https://example.test/phresh@0.1.12.zip.sha256"
})

assert.equal(requested, "https://api.github.com/repos/PhreshOS/phresh-program/releases?per_page=100")

assert.deepEqual(await releases.list(1, 20), {
    releases: [{
        schema: 1,
        identity: "phresh",
        version: "0.1.12",
        name: "Phresh Program",
        description: "A Program for testing PhreshOS.",
        icon: "https://example.test/0.1.12/icon.png",
        categories: ["Development"],
        keywords: ["example"],
        website: "https://example.test/phresh",
        archive: "https://example.test/phresh@0.1.12.zip",
        checksum: "https://example.test/phresh@0.1.12.zip.sha256"
    }],
    page: 1,
    nextPage: null
})

assert.equal(catalogRequested, "https://api.github.com/orgs/PhreshOS/repos?type=public&sort=full_name&per_page=100&page=1")

const loadedRequestCount = requestCount

await releases.load()
await releases.latest("phresh")
await releases.list(1, 20)

assert.equal(requestCount, loadedRequestCount, "The loaded catalog must not request GitHub again")

function githubRelease(version: string, overrides: Record<string, unknown> = {}) {
    return {
        draft: false,
        prerelease: false,
        tag_name: `v${version}`,
        assets: [
            { name: `phresh@${version}.zip`, browser_download_url: `https://example.test/phresh@${version}.zip` },
            { name: `phresh@${version}.zip.sha256`, browser_download_url: `https://example.test/phresh@${version}.zip.sha256` },
            { name: "metadata.json", browser_download_url: `https://example.test/${version}/metadata.json` },
            { name: "icon.png", browser_download_url: `https://example.test/${version}/icon.png` }
        ],
        ...overrides
    }
}
