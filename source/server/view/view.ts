import { current } from "@phreshos/server"
import Application from "@server/core/application"
import { programReleaseListRequest, programReleaseRequest } from "./contract"

export default async function view() {
    const application = await Application.open()

    current.answer("program.release", async function ({ payload }) {
        const request = programReleaseRequest.parse(payload)

        return await application.programRelease(request.program)
    })

    current.answer("program.releases", async function ({ payload }) {
        const request = programReleaseListRequest.parse(payload)

        return await application.programReleases(request.page, request.limit)
    })
}
