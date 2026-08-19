import { rm } from "node:fs/promises"

process.env.NODE_ENV = "production"

await rm("dist", { recursive: true, force: true })

const { build } = await import("vite")

await build({ configFile: "vite.client.ts" })
