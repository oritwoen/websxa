# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-06
**Commit:** pending
**Branch:** main

## OVERVIEW

`askweb` is a unified web search provider for agents and CLI. The goal is to normalize multiple web search backends behind one stable TypeScript API and one stable command-line interface, so agent runtimes do not need provider-specific glue.

## STRUCTURE

```
src/
├── index.ts              # Public API barrel and normalized provider catalog
└── cli.ts                # citty-based CLI entry point for local and scripted usage
test/
└── index.test.ts         # Basic contract tests for the public API
.github/workflows/
├── test.yml              # CI: typecheck -> build -> test
└── release.yml           # npm publish on v* tags
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add public exports | `src/index.ts` | Keep the public surface small and explicit |
| Extend CLI | `src/cli.ts` | Add subcommands with `citty`; keep text and JSON output stable |
| Add tests | `test/` | Mirror public behavior, not implementation details |
| Change build outputs | `build.config.ts` + `package.json` | Keep `entries` and `exports` aligned |
| Change CI flow | `.github/workflows/test.yml` | Order stays `typecheck -> build -> test` |
| Change release flow | `.github/workflows/release.yml` | Publish only from `v*` tags |

## CONVENTIONS

- ESM-only package, no CommonJS output
- `obuild` owns build artifacts; `tsc` is typecheck-only
- Public API stays export-barrel-driven from `src/index.ts`
- CLI should be thin and call reusable functions from `src/index.ts`
- Prefer normalized models over provider-shaped raw objects
- CLI must support both human-readable and machine-readable JSON output
- Keep provider names and capability flags as literal unions where possible
- Default to minimal dependencies; only add HTTP/cache layers when provider adapters land

## ANTI-PATTERNS

- Do not leak provider-specific response formats into public API
- Do not couple CLI formatting with core data models
- Do not add `as any`, `@ts-ignore`, or placeholder unsafe types
- Do not introduce CJS compatibility shims
- Do not add network code directly in the CLI
- Do not make tests depend on external services

## COMMANDS

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test:run
pnpm release
```
