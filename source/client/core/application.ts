import { current } from "@phreshos/client"
import type { InstallationSnapshot } from "@server/core/program-installer"
import type { ProgramRelease, ProgramReleasePage } from "@server/core/program-releases"

/** Client application exposing Setup capabilities as local operations. */
export default class Application {
    public prepare() {
        return current.window.local.surface.set({ radius: "large" }, { duration: 240, easing: "ease-out" })
    }

    public programRelease(program: string) {
        return current.server.ask<ProgramRelease>("program.release", { program })
    }

    public programReleases(page = 1, limit = 20, retry = false) {
        return current.server.ask<ProgramReleasePage>("program.releases", { page, limit, retry })
    }

    public installation() {
        return current.server.ask<InstallationSnapshot>("program.installation")
    }

    public installAll() {
        return current.server.ask<InstallationSnapshot>("program.install-all")
    }

    public subscribeInstallation(subscriber: (snapshot: InstallationSnapshot) => void) {
        return current.subscribe("program.installation", message => {
            subscriber(message.payload as InstallationSnapshot)
        })
    }

    public async close() {
        await current.window.local.surface.set(
            { opacity: 0, radius: "large" },
            { duration: 240, easing: "ease-in", wait: true }
        )

        try {
            await (await current.process()).exit()
        } catch (exception) {
            await current.window.local.surface.set(
                { radius: "large" },
                { duration: 240, easing: "ease-out", wait: true }
            )

            throw exception
        }
    }
}
