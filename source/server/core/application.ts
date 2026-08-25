import ProgramReleases from "./program-releases"

/** Owns Setup's application operations and authoritative external resources. */
export default class Application {
    public constructor(private readonly releases = new ProgramReleases()) {}

    public programRelease(program: string) {
        return this.releases.latest(program)
    }

    public programReleases(page: number, limit: number) {
        return this.releases.list(page, limit)
    }
}
