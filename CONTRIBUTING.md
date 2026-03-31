# Contributing to opapp-frontend

Thanks for helping improve OPApp's shared frontend stack.

## License

By contributing to this repository, you agree that your contribution is
provided under the repository's `MPL-2.0` license unless a file or directory
explicitly says otherwise.

## Local setup

1. Install Node.js 24 and enable Corepack.
2. Run `corepack pnpm install`.
3. Use the sibling `opapp-desktop` repo's `npm run dev:windows` for the
   Metro-backed Windows inner loop.
4. Use `npm run verify:windows:dev` or `npm run verify:windows` from
   `opapp-desktop` when you want the fast dev check or packaged/prod-like
   Windows result.

## Before opening a pull request

1. Run `corepack pnpm commit:check`.
2. Keep changes scoped to this repository unless you are intentionally changing
   a shared contract with `opapp-desktop` or `opapp-mobile`.
3. Update docs when you change bundle contracts, runtime assumptions, or repo
   boundaries.
4. Confirm you are not committing secrets, personal env files, generated
   artifacts, or local `.private-*` content.

## Repo boundaries

- `contracts`, `framework`, `domains`, `ui`, and `capabilities` are part of
  the public source tree.
- Optional local extensions may live under `apps/companion-app/.private-*`,
  but public code must remain buildable and testable without those directories.
- Do not commit third-party scraped datasets or unverifiable HBR facts. Public
  tracked data must stay provenance-backed.

## Pull request notes

- Prefer focused PRs with clear user-facing or engineering impact.
- Call out cross-repo impact when bundle manifests, rollout fields, surface ids,
  or OTA-related contracts change.
- Include the exact verification commands you ran.

## Community standards

Please follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
