import ProgramInstaller from "./program-installer"
import ProgramReleases from "./program-releases"

/** Owns Setup's application operations and authoritative external resources. */
export default class Application {
    public constructor(
        private readonly releases: ProgramReleases,
        private readonly installer: ProgramInstaller
    ) {}

    public programRelease(program: string) {
        return this.releases.latest(program)
    }

    public programReleases(page: number, limit: number, retry = false) {
        return this.releases.list(page, limit, retry)
    }

    public installation() {
        return this.installer.snapshot()
    }

    public installAll() {
        return this.installer.start()
    }
}
