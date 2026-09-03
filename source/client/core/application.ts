import { context } from "@phreshos/client"
import type { InstallationSnapshot } from "@server/core/program-installer"
import type { ProgramRelease, ProgramReleasePage } from "@server/core/program-releases"

/** Client application exposing Setup capabilities as local operations. */
export default class Application {
    public prepare() {
        return context.localWindow.transaction({ duration: 240, easing: "ease-out" }).addSurface()
    }

    public programRelease(program: string) {
        return context.server.ask<ProgramRelease>("program.release", { program })
    }

    public programReleases(page = 1, limit = 20, retry = false) {
        return context.server.ask<ProgramReleasePage>("program.releases", { page, limit, retry })
    }

    public installation() {
        return context.server.ask<InstallationSnapshot>("program.installation")
    }

    public installAll() {
        return context.server.ask<InstallationSnapshot>("program.install-all")
    }

    public subscribeInstallation(subscriber: (snapshot: InstallationSnapshot) => void) {
        return context.subscribe("program.installation", message => {
            subscriber(message.payload as InstallationSnapshot)
        })
    }

    public async close() {
        await context.localWindow.transaction({ duration: 240, easing: "ease-in", wait: true }).removeSurface()

        try {
            await (await context.process()).exit()
        } catch (exception) {
            await context.localWindow.transaction(
                { duration: 240, easing: "ease-out", wait: true }
            ).addSurface()

            throw exception
        }
    }
}
