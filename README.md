# opapp-frontend

`opapp-frontend` is the shared frontend framework and business core for OPApp.

This repo holds the long-lived application layers:

- `contracts`: stable cross-boundary contracts
- `framework`: runtime and app mechanics
- `domains`: business facts, rules, and calculations
- `ui`: presentation primitives and interaction patterns
- `capabilities`: user-facing capability composition
- `apps`: integration and validation entries
- `tooling`: repo-level engineering support

Platform host responsibilities stay in separate repos.

## Git Commit Prep

Before committing frontend changes, run `corepack pnpm commit:check`. That
covers the repo's default `typecheck` plus the fast frontend test suite.

Keep frontend commits scoped to this repo and use the existing commit subject
style: `frontend: ...`.

Keep workstation-local helper artifacts out of git so the public repo only
tracks product code, contracts, and supporting engineering tooling.
