import { describe, expect, it } from "vitest"
import { ownsPresentation, presentationGeometry } from "../source/client/core/presentation"

describe("Setup presentation geometry", () => {
  it("owns only raw Desktop layers", () => {
    expect(ownsPresentation("wallpaper")).toBe(false)
    expect(ownsPresentation("under")).toBe(true)
    expect(ownsPresentation("window")).toBe(false)
    expect(ownsPresentation("over")).toBe(true)
    expect(ownsPresentation("shell")).toBe(true)
  })

  it("projects ordinary authoritative geometry without reinterpretation", () => {
    expect(presentationGeometry({
      position: { x: "1/4", y: "1/4" },
      size: { width: "1/2", height: "1/2" },
      minimized: false,
      maximized: false
    })).toEqual({ x: "1/4", y: "1/4", width: "1/2", height: "1/2" })
  })

  it("interprets maximization as the full raw layer", () => {
    expect(presentationGeometry({
      position: { x: 40, y: 20 },
      size: { width: 600, height: 400 },
      minimized: false,
      maximized: true
    })).toEqual({ x: 0, y: 0, width: "100%", height: "100%" })
  })

  it("gives minimization precedence and removes interactive geometry", () => {
    expect(presentationGeometry({
      position: { x: 40, y: 20 },
      size: { width: 600, height: 400 },
      minimized: true,
      maximized: true
    })).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})
