import { rm, writeFile } from "node:fs/promises"

process.env.NODE_ENV = "production"

await rm("dist", { recursive: true, force: true })

const { build } = await import("vite")

await build({ configFile: "vite.config.ts", ssr: { noExternal: true } })

await build({ configFile: "vite.client.ts" })

await writeFile("dist/server/package.json", JSON.stringify({ type: "module" }))
