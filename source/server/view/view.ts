import { current, host } from "@phreshos/server"
import Application from "@server/core/application"
import ProgramInstaller from "@server/core/program-installer"
import ProgramReleases from "@server/core/program-releases"
import { programReleaseListRequest, programReleaseRequest } from "./contract"

export default async function view() {
    const releases = new ProgramReleases()
    const installer = new ProgramInstaller(
        releases,
        host.program,
        snapshot => current.client.publish("program.installation", snapshot)
    )
    const application = new Application(releases, installer)

    current.answer("program.release", async function ({ payload }) {
        const request = programReleaseRequest.parse(payload)

        return await application.programRelease(request.program)
    })

    current.answer("program.releases", async function ({ payload }) {
        const request = programReleaseListRequest.parse(payload)

        return await application.programReleases(request.page, request.limit, request.retry)
    })

    current.answer("program.installation", function () {
        return application.installation()
    })

    current.answer("program.install-all", async function () {
        return await application.installAll()
    })
}
