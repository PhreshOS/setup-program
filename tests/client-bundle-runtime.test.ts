import { expect, test } from "vitest"
import configuration from "../vite.client"
import type { UserConfig } from "vite"

test("linked React SDKs share the Program renderer instance", () => {
    const config = configuration as UserConfig

    expect(config.resolve?.dedupe).toEqual(["react", "react-dom"])
})
