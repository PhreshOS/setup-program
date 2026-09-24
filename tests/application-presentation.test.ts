import type { WindowState } from "@phreshos/core"
import { expect, test, vi } from "vitest"

const presentation = vi.hoisted(() => {
    const calls: string[] = []
    let finishGeometry!: () => void
    const geometryFinished = new Promise<void>(resolve => { finishGeometry = resolve })

    return {
        calls,
        finishGeometry,
        context: {
            presentation: {
                transactionAndWait: () => ({
                    setGeometry: async () => {
                        calls.push("geometry:start")
                        await geometryFinished
                        calls.push("geometry:finished")
                    },
                    setSurface: vi.fn()
                }),
                transaction: () => ({
                    setGeometry: async () => { calls.push("geometry:update") },
                    setSurface: async () => { calls.push("surface") }
                }),
                raise: async () => { calls.push("raise") }
            }
        }
    }
})

vi.mock("@phreshos/client", () => ({ context: presentation.context }))

import Application from "../source/client/core/application"

const window = {
    layer: "over",
    position: { x: 40, y: 30 },
    size: { width: 600, height: 400 },
    minimized: false,
    maximized: false,
    front: true
} as WindowState

test("initial raw presentation reaches its geometry before showing its Surface", async () => {
    const application = new Application()
    const first = application.present(window)

    await Promise.resolve()
    expect(presentation.calls).toEqual(["geometry:start"])

    presentation.finishGeometry()
    await first

    expect(presentation.calls).toEqual([
        "geometry:start",
        "geometry:finished",
        "surface",
        "raise"
    ])

    await application.present({ ...window, position: { x: 80, y: 60 } })

    expect(presentation.calls.slice(-2)).toEqual(["geometry:update", "raise"])
})
