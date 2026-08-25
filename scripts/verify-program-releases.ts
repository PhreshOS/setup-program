import assert from "node:assert/strict"
import ProgramReleases from "../source/server/core/program-releases"

let requested = ""
let catalogRequested = ""

const releases = new ProgramReleases(async function (input) {
    const url = String(input)

    if (url.includes("/orgs/PhreshOS/repos?")) {
        catalogRequested = url

        return Response.json([
            { name: "phresh-program", archived: false, fork: false },
            { name: "system", archived: false, fork: false }
        ])
    }

    requested = url

    return Response.json([
        githubRelease("0.1.8"),
        githubRelease("0.2.0", { prerelease: true }),
        githubRelease("0.1.12"),
        githubRelease("0.1.13", { assets: [] })
    ])
})

assert.deepEqual(await releases.latest("phresh"), {
    identity: "phresh",
    version: "0.1.12",
    archive: "https://example.test/phresh@0.1.12.zip",
    checksum: "https://example.test/phresh@0.1.12.zip.sha256"
})

assert.equal(requested, "https://api.github.com/repos/PhreshOS/phresh-program/releases?per_page=100")

assert.deepEqual(await releases.list(1, 20), {
    releases: [{
        identity: "phresh",
        version: "0.1.12",
        archive: "https://example.test/phresh@0.1.12.zip",
        checksum: "https://example.test/phresh@0.1.12.zip.sha256"
    }],
    page: 1,
    nextPage: null
})

assert.equal(catalogRequested, "https://api.github.com/orgs/PhreshOS/repos?type=public&sort=full_name&per_page=20&page=1")

function githubRelease(version: string, overrides: Record<string, unknown> = {}) {
    return {
        draft: false,
        prerelease: false,
        tag_name: `v${version}`,
        assets: [
            { name: `phresh@${version}.zip`, browser_download_url: `https://example.test/phresh@${version}.zip` },
            { name: `phresh@${version}.zip.sha256`, browser_download_url: `https://example.test/phresh@${version}.zip.sha256` }
        ],
        ...overrides
    }
}
