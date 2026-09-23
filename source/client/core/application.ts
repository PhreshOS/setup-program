import { context } from "@phreshos/client"
import type { WindowState } from "@phreshos/core"
import type { InstallationSnapshot } from "@server/core/program-installer"
import type { ProgramRelease, ProgramReleasePage } from "@server/core/program-releases"
import { ownsPresentation, presentationGeometry } from "./presentation"

/** Client application exposing Setup capabilities as local operations. */
export default class Application {
    private ownsPresentation = false
    private surfaceVisible = false
    private presentation = Promise.resolve()

    public present(window: WindowState) {
        return this.sequence(async () => {
            this.ownsPresentation = ownsPresentation(window.layer)
            if (!this.ownsPresentation) return

            const transaction = context.presentation.transaction()
            const changes = [transaction.setGeometry(presentationGeometry(window))]

            if (!this.surfaceVisible) changes.push(transaction.setSurface(true))
            if (window.front && !window.minimized) changes.push(context.presentation.raise())

            await Promise.all(changes)
            this.surfaceVisible = true
        })
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

    public close() {
        return this.sequence(async () => {
            if (this.ownsPresentation && this.surfaceVisible) {
                await context.presentation.transactionAndWait().setSurface(false)
                this.surfaceVisible = false
            }

            try {
                await (await context.process()).exit()
            } catch (exception) {
                if (this.ownsPresentation) {
                    await context.presentation.transactionAndWait().setSurface(true)
                    this.surfaceVisible = true
                }

                throw exception
            }
        })
    }

    private sequence<Result>(operation: () => Promise<Result>) {
        // Window events define projection order. Serializing their commands
        // prevents an older async projection from overtaking a newer one.
        const result = this.presentation.then(operation, operation)
        this.presentation = result.then(() => undefined, () => undefined)
        return result
    }
}
