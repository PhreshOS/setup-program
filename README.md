# Setup

The PhreshOS welcome and initial setup Program.

[Installation](https://docs.phreshos.com/installation) ·
[Programs](https://docs.phreshos.com/runtime/programs) ·
[Source](https://github.com/PhreshOS/setup-program)

## Role

Setup discovers verified official Program releases and presents the catalog
used to prepare a new System. Its Server owns release discovery, verification,
installation, and the Program's default startup launch; its Client renders the
catalog and invokes those capabilities.

The Program owns only the first-run catalog workflow. Generic Program
installation, System service setup, and release publication remain with the
System, CLI, and individual Program repositories.

## Installation

```sh
phresh install setup --run
```

See [Installation](https://docs.phreshos.com/installation) for the surrounding
System setup workflow.

## Development

```sh
bun install --frozen-lockfile
bun run verify
bun run dev
```

Build, run the production definition, or package a release with:

```sh
bun run build
bun run start
bun run pack
```

`verify` checks release discovery, installation, both Endpoints, and the
production Program artifact.

## Related repositories

- [PhreshOS System](https://github.com/PhreshOS/system) owns Program state and
  executes the setup workflow.
- [`@phreshos/cli`](https://github.com/PhreshOS/cli) owns generic Program and
  System installation commands.
- [PhreshOS Install](https://github.com/PhreshOS/install) bootstraps the CLI and
  System before this Program runs.
- [Phresh Program](https://github.com/PhreshOS/phresh-program) is the starter
  offered after setup.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repository workflow and
[SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

Licensed under the [MIT License](LICENSE). Copyright © 2026 Zohayr SLILEH.
