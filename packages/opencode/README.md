# opencode core

This package contains the OpenCode core runtime, CLI, server, provider integration layer, session engine, tools, storage, and tests.

## Development

Run package commands from this directory:

```bash
cd packages/opencode
bun typecheck
bun test --timeout 30000
```

The repo root `bun dev` command runs this package during normal local development.

## Provider Capability Matrix

Provider support is derived from configured provider and model metadata in `src/provider/capability.ts`. The matrix records declared model features, normalized support status, and known provider quirks used by runtime compatibility checks.

Print the derived matrix:

```bash
bun run provider:matrix
```

Run opt-in provider smoke probes:

```bash
bun run provider:smoke -- --all-configured --json
```

Smoke probes skip providers without credentials. Failures are reported only for configured providers selected by the command.

Useful targeted probes:

```bash
bun run provider:smoke -- --provider openai --model your-model-id --feature text,tools --json
bun run provider:smoke -- --all-configured --feature text,tools,image,reasoning,cache
```

## Relevant Paths

- `src/provider/capability.ts`: derived provider and model capability entries
- `src/session/llm.ts`: model request shaping and provider compatibility behavior
- `script/provider-matrix.ts`: JSON matrix printer
- `script/provider-smoke.ts`: live smoke probe runner
- `test/provider/`: deterministic provider capability and smoke script tests
