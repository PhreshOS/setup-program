import ProgramReleases from "./program-releases"

/** Owns Setup's application operations and authoritative external resources. */
export default class Application {
    private constructor(private readonly releases: ProgramReleases) {}

    public static async open(releases = new ProgramReleases()) {
        await releases.load()

        return new Application(releases)
    }

    public programRelease(program: string) {
        return this.releases.latest(program)
    }

    public programReleases(page: number, limit: number) {
        return this.releases.list(page, limit)
    }
}
