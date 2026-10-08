# Contributing to Kinwoo

## Setup

Node.js 20+.

```bash
npm install
npm run tokens:generate
npm run dev
```

Environment variables live in `apps/web/.env.local` and `apps/mobile/.env` (see the `.env.example` files).

## Before opening a pull request

```bash
npm run format
npm run typecheck
npm test
npm run lint
```

## Branches and commits

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`.
- Use [Conventional Commits](https://www.conventionalcommits.org/); release-please builds the changelog and version from them.

## Architecture rules

See [AGENTS.md](AGENTS.md#architecture-rules). In short: `core` stays dependency-free, `client` depends only on `core`, colours come from `@kinwoo/tokens`, and server-side services follow the repository pattern.

## Releases

Merging to `main` lets release-please open a release PR. Merging that PR tags the release, deploys the web app to production and starts an Android build.

## Conduct and license

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Contributions are under the [MIT license](LICENSE).
