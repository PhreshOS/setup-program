import { externalDependencies } from "@/vite.server"
import { writeFile } from "node:fs/promises"
import packageConfig from "@/package.json"

process.env.NODE_ENV = "production"

const { build } = await import("vite")

const dependencies: Partial<typeof packageConfig.dependencies> = {}

for (const externalDependency of externalDependencies) {

    dependencies[externalDependency] = packageConfig.dependencies[externalDependency]
}

await build({ configFile: "vite.server.ts", ssr: { noExternal: true } })

await build({ configFile: "vite.client.ts" })

await writeFile("dist/server/package.json", JSON.stringify({ type: "module", dependencies }))
