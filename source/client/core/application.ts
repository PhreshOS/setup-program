import { context, system } from "@phreshos/client"
import type { InstallationSnapshot } from "@server/core/program-installer"
import type { ProgramRelease, ProgramReleasePage } from "@server/core/program-releases"

/** Client application exposing Setup capabilities as local operations. */
export default class Application {
    public async prepare() {
        const { transaction } = await system.appearance.snapshot()
        return context.presentation.transaction(transaction).setSurface(true)
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
        const { transaction } = await system.appearance.snapshot()
        await context.presentation.transactionAndWait(transaction).setSurface(false)

        try {
            await (await context.process()).exit()
        } catch (exception) {
            await context.presentation.transactionAndWait(transaction).setSurface(true)

            throw exception
        }
    }
}
