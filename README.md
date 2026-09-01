# Setup

The official PhreshOS welcome and initial setup Program.

Setup discovers official Program releases and presents the catalog used to
prepare a new System.

## Model

The Server owns release discovery, package verification, installation, and the
Program's default startup launch. The Client renders the catalog and invokes
those capabilities without understanding GitHub, archives, checksums, or
Endpoint Traffic.

A discoverable Program release contains its generated declaration, archive,
checksum, and declared icon. Setup reads the declaration and icon before the
owner chooses installation.

Setup runs as a frameless desktop Program. Its local representation remains View
state; Program discovery and installation remain authoritative Server work.

## Installation

```sh
phresh install setup --run
```

## Development

```sh
bun install --frozen-lockfile
bun run verify
bun run dev
```

Build, attach the production definition, or package a release with:

```sh
bun run build
bun run start
bun run pack
```

`verify` checks release discovery, installation, both Endpoints, and the
production Program artifact.

## Repository boundary

This repository owns the first-run catalog and official Program installation
workflow. Generic Program installation, System service setup, and release
publication remain owned by the CLI, System, and individual Program
repositories.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repository workflow and
[SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Zohayr SLILEH.
