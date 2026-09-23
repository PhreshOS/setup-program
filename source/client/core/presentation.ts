import type { WindowGeometry, WindowLayer, WindowState } from "@phreshos/core"

/** Interprets authoritative Setup state for its Program-owned raw presentation. */
export function presentationGeometry(window: Pick<WindowState, "position" | "size" | "minimized" | "maximized">): WindowGeometry {
    if (window.minimized) return { x: 0, y: 0, width: 0, height: 0 }
    if (window.maximized) return { x: 0, y: 0, width: "100%", height: "100%" }

    return { ...window.position, ...window.size }
}

export function ownsPresentation(layer: WindowLayer) {
    return layer === "under" || layer === "over" || layer === "shell"
}
