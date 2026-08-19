# Contributing

Setup is the official first-run PhreshOS Program. Changes belong here when
they preserve a clear path from a newly installed System to a ready desktop.

## Development

Install the pinned toolchain and verify the repository:

```sh
bun install --frozen-lockfile
bun run verify
```

The repository must remain independently installable, buildable, and
packageable without the PhreshOS workspace around it.

## Pull requests

Keep each pull request focused on one coherent setup behavior and explain the
user-visible state transition it introduces.
