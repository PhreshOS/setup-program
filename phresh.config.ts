import { defineConfig } from "@phreshos/core"

/**
 * This is the Program's authoring declaration, not a runtime configuration
 * loaded by either endpoint. The Phresh CLI reads it and derives the concrete
 * Program description needed for development, production, installation, or
 * packaging.
 *
 * Production uses the built locations and commands declared below.
 * Development replaces only each endpoint's location and start command with
 * its `development` declaration. Packaging relocates the production files
 * into the Program archive. Relative paths begin at this project directory.
 */
export default defineConfig({

    // Permanent public address of the Program. It is kebab-case because the
    // system also uses it as the installed directory name. Unlike `name`, it
    // is an identifier and must remain stable across releases.
    identity: "setup",

    // Human-facing metadata shown by the desktop and authoring tools. None of
    // these values determines the Program's identity.
    name: "Setup",
    description: "The first welcome to PhreshOS.",
    version: "0.1.20",

    // One authored PNG. Installation gives it a canonical name and the system
    // derives the standard hosted icon sizes from it.
    icon: "icon.png",

    categories: ["System"],
    keywords: ["setup", "programs", "installation"],
    website: "https://github.com/PhreshOS/setup-program",

    // Prepares the production Client directory. The CLI runs it from this
    // project before `phresh start`, `phresh install`, and `phresh pack`.
    // `phresh dev` does not build and uses the declarations below instead.
    buildCommand: "vite-node scripts/build.ts",

    // The Server owns access to official release metadata. The Client never
    // talks to GitHub directly; it reaches this capability through its paired
    // Server endpoint.
    server: {
        location: "dist/server",
        startCommand: "node main.js",
        development: {
            startCommand: "vite-node source/server/main.ts"
        }
    },

    // The Client declaration also defines the initial Window created for it.
    // It contains presentation defaults only; live Window state belongs to
    // each running Process.
    client: {

        // Production directory containing the browser application's
        // `index.html` and all files reachable from it.
        location: "dist/client",

        // Initial Window values. Setup occupies the centered middle half of
        // both workspace dimensions and uses the frameless over layer.
        title: "Setup",
        size: { width: "1/2", height: "1/2" },
        position: { x: "1/4", y: "1/4" },
        layer: "over",

        // Geometry accepts finite pixel numbers or linear values. Fractions
        // and percentages are relative to the selected desktop layer, and a
        // pixel offset may be combined with either form.
        // size: { width: "50% + 20", height: 440 },
        // position: { x: "1/2 + 10", y: 40 },

        // `window` is the ordinary framed layer. `under` and `over` are
        // structurally isolated, frameless desktop layers. Its iframe may
        // explicitly request a representation-local Window Surface.

        // The initial Window may also be declared to open minimized.
        // minimize: true,

        development: {

            // Development Clients are addressed by URL rather than a local
            // artifact directory. The CLI starts this optional tool, waits for
            // the URL to respond, and only then launches the Program. The dev
            // server must allow the desktop origin through CORS; this project's
            // Vite configuration does so.
            url: "http://localhost:5200/",
            startCommand: "vite dev --config vite.client.ts"
        }
    }
})
