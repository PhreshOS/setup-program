import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import App, { type Catalog } from "../source/client/view/app"

const idleInstallation = {
    snapshot: { revision: 0, status: "idle" as const, completed: 0, total: 0, programs: [] },
    isPending: false,
    exception: undefined,
    install: () => undefined
}

describe("Setup initial UI", () => {
    it("keeps installation unavailable while the catalog is pending", () => {
        const catalog: Catalog = {
            releases: [],
            isPending: true,
            exception: undefined,
            continuationException: undefined,
            isLoadingMore: false,
            hasMore: false,
            more: () => undefined,
            retry: () => undefined
        }

        const markup = renderToStaticMarkup(<App close={async () => undefined} catalog={catalog} installation={idleInstallation} />)
        const root = markup.match(/^<main[^>]*>/)?.[0]
        const installButton = markup.match(/<button[^>]*>/)?.[0]

        expect(root).not.toContain("background")
        expect(markup).toContain('role="progressbar"')
        expect(markup).toContain('aria-label="Loading Programs"')
        expect(markup).not.toContain("Loading Programs…")
        expect(installButton).toContain("disabled")
        expect(markup).toContain("Install all")
    })

    it("presents installation progress against its authoritative total", () => {
        const catalog: Catalog = {
            releases: [{
                identity: "terminal",
                version: "0.1.34",
                name: "Terminal",
                description: "A terminal Program",
                icon: null,
                categories: ["System"],
                keywords: ["terminal"],
                website: null,
                archive: "https://example.com/terminal.zip",
                checksum: "https://example.com/terminal.zip.sha256"
            }],
            isPending: false,
            exception: undefined,
            continuationException: undefined,
            isLoadingMore: false,
            hasMore: false,
            more: () => undefined,
            retry: () => undefined
        }
        const installation = {
            snapshot: {
                revision: 2,
                status: "running" as const,
                completed: 1,
                total: 2,
                programs: [{ identity: "terminal", name: "Terminal", status: "installing" as const, error: null }]
            },
            isPending: false,
            exception: undefined,
            install: () => undefined
        }

        const markup = renderToStaticMarkup(<App close={async () => undefined} catalog={catalog} installation={installation} />)

        expect(markup).toContain('aria-valuenow="1"')
        expect(markup).toContain('aria-valuemax="2"')
        expect(markup).toContain("1 of 2")
        expect(markup).toContain("Terminal: installing")
    })
})
