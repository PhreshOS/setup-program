# Setup

The initial PhreshOS welcome Program.

Setup has paired Client and Server endpoints. Server Core owns official Program
release discovery and resolves the newest complete stable release from the
corresponding `PhreshOS/<identity>-program` repository. Client Core exposes that
operation locally without making View understand GitHub or endpoint traffic.
The Client View presents the discovered releases as a paginated official
Program catalog with explicit loading and failure states.

```bash
bun install
phresh dev
```

For the production shape, build and attach the Program with:

```bash
phresh start
```

The Program declaration lives in `phresh.config.ts`.

Setup is frameless, so its local Surface uses the Theme's `large` radius level,
matching the outer radius of standard Windows.
