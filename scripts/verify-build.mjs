import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import config from "../phresh.config.ts"
import manifest from "../package.json" with { type: "json" }

assert.equal(config.identity, "setup")
assert.equal(config.name, "Setup")
assert.equal(config.version, manifest.version)
assert.equal(config.server, undefined)
assert.equal(config.client?.location, "dist/client")
assert.equal(config.client?.layer, "over")
assert.deepEqual(config.client?.size, { width: "1/2", height: "1/2" })
assert.deepEqual(config.client?.position, { x: "1/4", y: "1/4" })

const page = readFileSync("dist/client/index.html", "utf8")
const client = readdirSync("dist/client/assets").map(file => readFileSync(`dist/client/assets/${file}`, "utf8")).join("\n")

assert.match(page, /<html/i)
assert.match(client, /surfaceSet/)
assert.match(client, /Your space is ready/)
assert.match(client, /prefers-reduced-motion/)
assert.equal(existsSync("dist/server"), false)
