# AGENTS.md

Guidance for AI coding agents working in this repo.

## Stack

npm workspaces + Turborepo. `apps/web` is Next.js 15 (App Router) on Cloudflare Workers via OpenNext, styled with Tailwind v4. `apps/mobile` is Expo 57 + NativeWind 4 (Tailwind v3). Shared code lives in `packages/*`, all named `@kinwoo/*`.

## Architecture rules

- **`@kinwoo/core`** has no runtime dependencies and no DOM, Node or framework imports. It runs on Hermes, browsers and Workers.
- **`@kinwoo/client`** may depend only on `@kinwoo/core`; everything else is a peer dependency. No `window`, `document`, `localStorage` or `navigator`: inject platform behaviour instead.
- **`@kinwoo/tokens`** is the single source for colours. Edit `packages/tokens/src/tokens.ts`, then run `npm run tokens:generate`. Never hand-edit `packages/tokens/generated/*`; a test fails if it is stale.
- `scripts/check-boundaries.mjs` and the rules in `eslint.config.js` enforce the above. Run `npm run lint`.
- **Repository pattern:** services use interfaces and live in feature folders under `apps/web/src/api/<domain>/` (`I<Name>Repository`, `<Name>Repository`, `I<Name>Service`, `<Name>Service`). See `api/health` for the template. Route handlers stay thin and only call a service.
- `apps/mobile/tsconfig.json` extends Expo's base, not `tsconfig.base.json`.
- Web uses Tailwind v4 (`@theme inline`); mobile uses Tailwind v3 via NativeWind. The two configs cannot be shared; tokens are what they share.

## Conventions

- Prettier: 100 columns, double quotes, trailing commas.
- Conventional Commits (`feat:`, `fix:`, `chore:`…): release-please reads them.
- Comment only where the logic is non-obvious.
- Before finishing: `npm run typecheck && npm test && npm run lint`.
