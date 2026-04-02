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

## Open Source

This repository is licensed under `MPL-2.0`. The root `package.json` keeps
`"private": true` only to prevent accidental npm publication of the workspace
root; it does not mean the source repository itself is closed.

Optional local extensions may live under `apps/companion-app/.private-*`.
Those directories are intentionally excluded from git so the public repository
only carries the shared frontend code, contracts, and supporting tooling.

## Git Commit Prep

Before committing frontend changes, run `corepack pnpm commit:check`. That
covers frozen-lockfile validation plus the repo's default `typecheck` and fast
frontend test suite.

If you change any workspace `package.json` or dependency declaration, include
the matching `pnpm-lock.yaml` update in the same diff instead of leaving CI to
discover the drift later.

Windows dev / prod preview remains owned by `opapp-desktop`. When you need to
see the current Windows effect, run `npm run dev:windows`,
`npm run verify:windows:dev`, or `npm run verify:windows` from the sibling
desktop repo instead of adding frontend-local Windows entrypoints.

Keep frontend commits scoped to this repo and use the existing commit subject
style: `frontend: ...`.

Keep workstation-local helper artifacts out of git so the public repo only
tracks product code, contracts, and supporting engineering tooling.

## Contributing

Contribution workflow, repo boundaries, and submission expectations live in
[CONTRIBUTING.md](./CONTRIBUTING.md).

Please follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
when collaborating in issues, reviews, and pull requests.

## Security

For responsible disclosure guidance, see
[SECURITY.md](./SECURITY.md).
