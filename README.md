<div align="center">
  <img src="apps/web/src/app/icon.png" alt="Kinwoo" width="72" height="72" />

  <h1>Kinwoo</h1>

  <p>Shared expenses and shopping lists for housemates.</p>

  <p>
    <a href="https://app.kinwoo.in">Web app</a> ·
    <a href="CHANGELOG.md">Changelog</a> ·
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>

  <p>
    <a href="../../actions/workflows/ci-main.yml"><img alt="CI" src="../../actions/workflows/ci-main.yml/badge.svg" /></a>
    <img alt="Version" src="https://img.shields.io/badge/version-1.6.1-blue" />
    <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20-339933" />
  </p>
</div>

> [!IMPORTANT]
> This is a private repository. Do not share code, credentials or screenshots outside the team.

## Table of contents

- [About](#about)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Authentication](#authentication)
- [Database](#database)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Commands](#commands)
- [Contributing](#contributing)
- [License](#license)

## About

Kinwoo keeps a shared house's money and shopping in one place. Housemates log who paid for what, see simplified balances, and record settlements. A shared shopping list sits next to the ledger, and a bought item can become an expense.

- Houses (up to 3 per user), private by default, with invite links
- Expenses, simplified balances, settlements and payments
- Shared shopping list; mark items bought and turn them into expenses
- Push notifications (Android and web push) with per-type muting
- Email OTP and Google sign-in (Google is unavailable on iOS)
- Installable PWA; Android and iOS apps from the same codebase

The primary market is India ([kinwoo.in](https://kinwoo.in)).

## Tech stack

| Area     | Technology                                                                |
| -------- | ------------------------------------------------------------------------- |
| Web      | Next.js 15 (App Router), Tailwind CSS v4, Cloudflare Workers via OpenNext |
| Mobile   | Expo 57, React Native, NativeWind 4 (Tailwind v3)                         |
| Backend  | Supabase (Postgres, Auth, Storage, Edge Functions)                        |
| Monorepo | npm workspaces, Turborepo                                                 |
| Tooling  | TypeScript, Vitest, pgTAP, ESLint, Prettier, release-please               |

## Repository structure

```
apps/
  web/            Next.js app, deployed to Cloudflare Workers
  mobile/         Expo app (Android, iOS)
packages/
  core/           Platform-agnostic logic, zero runtime dependencies
  client/         API and auth layer shared by both apps
  tokens/         Design tokens -> CSS variables (web) and hex map (mobile)
  icons/          Shared SVG icons
supabase/
  migrations/     SQL migrations, applied by CI
  functions/      Edge functions (send-push)
scripts/          Repo checks and generators
```

Package boundaries are enforced by `scripts/check-boundaries.mjs` and ESLint. See [AGENTS.md](AGENTS.md) for the architecture rules, and [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md) for design and product context.

## Getting started

### Prerequisites

- Node.js 20+ (22.6+ to regenerate tokens)
- npm 10
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker (Colima works) for a local database
- Expo Go or an Android emulator for mobile

### Install and run

```bash
npm install
npm run tokens:generate
npm run dev:up        # start Colima and local Supabase (optional)
npm run dev           # web at http://localhost:3000
npm run dev:mobile    # Expo dev server
```

Create `apps/web/.env.local` and `apps/mobile/.env.local` with the variables below. Sign-in will not work until the [Supabase setup](#supabase) is complete.

## Environment variables

**Web** (`apps/web/.env.local`)

| Variable                                  | Required | Notes                                                  |
| ----------------------------------------- | -------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                | Yes      | Supabase project URL                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`           | Yes      | Supabase `anon` key                                    |
| `NEXT_PUBLIC_SITE_URL`                    | Yes      | Public origin. Falls back to `localhost:3000` if unset |
| `SUPABASE_SERVICE_ROLE_KEY`               | Yes      | Server only. Never expose to the client                |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`            | No       | Enables web push                                       |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`  | No       | Feedback form delivery                                 |
| `NEXT_PUBLIC_OTP_RESEND_COOLDOWN_SECONDS` | No       | OTP resend cooldown                                    |

**Mobile** (`apps/mobile/.env.local`)

| Variable                                  | Required | Notes                        |
| ----------------------------------------- | -------- | ---------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`                | Yes      | Same as web                  |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`           | Yes      | Same as web                  |
| `EXPO_PUBLIC_API_URL`                     | Yes      | Web app origin the app calls |
| `EXPO_PUBLIC_SITE_URL`                    | No       | Public origin for links      |
| `EXPO_PUBLIC_OTP_RESEND_COOLDOWN_SECONDS` | No       | OTP resend cooldown          |

`NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are inlined at build time. Keep secrets out of them.

## Authentication

Email sign-in is a 6-digit OTP; Google is OAuth. Google is unavailable on iOS, because App Store review expects Sign in with Apple alongside any other third-party provider and we do not offer it yet. The UI branches on the `canSignInWithGoogle` capability rather than on the platform.

- `packages/core/src/auth`: open-redirect hardening, display-name validation, the public-route list.
- `packages/client/src/auth`: the `AuthAdapter` interface, session state machine, OTP phase reducer and gate decision. No platform APIs.
- `apps/web/src/lib/auth-adapter.ts` and `apps/mobile/src/lib/auth-adapter.ts`: the two implementations.
- `apps/web/src/integrations/supabase/client.route.ts`: the server seam. Cookie writes are buffered per request because a Worker cannot mutate a response after it is constructed, so **every** exit path of a route handler must call `applyCookies`, including 401s and catch blocks. A test enforces this.
- `getVerifiedUser` accepts a session cookie (web) or an `Authorization: Bearer` token (mobile).

### Supabase

1. Create a project at supabase.com. Two projects (test + production) matches what `eas.json` and CI already assume.
2. From **Settings → API** copy the Project URL, the `anon` key and the `service_role` key.
3. Migrations are applied by CI (test on every `main` merge, production on release). Locally: `supabase link --project-ref <ref>` then `supabase db push`. The `avatars` storage bucket is not part of the migrations: create it by hand in each project: public, 1 MiB limit, allowed types `image/png`, `image/jpeg`, `image/webp`. Create a second bucket, `uploaded_avatars`, for user-uploaded photos: public, 1 MiB limit, allowed type `image/jpeg`.
4. **Authentication → Providers → Email**: enabled, with "Confirm email" on.
5. **Authentication → Emails → Magic Link**: the template body must contain `{{ .Token }}`. This is the step people miss — with only `{{ .ConfirmationURL }}` Supabase sends a link instead of a code, and the OTP screen can never succeed.
6. **Authentication → Providers → Google**: paste the Client ID and Secret from Google Cloud (below).
7. **Authentication → URL Configuration → Site URL**: this environment's public origin.
8. Same page, **Redirect URLs**. Missing entries fail silently:
   ```
   http://localhost:3000/auth/callback
   https://test.kinwoo.in/auth/callback
   https://app.kinwoo.in/auth/callback
   kinwoo://auth/callback
   ```
   The custom-scheme entry is what makes the Android deep-link return work.
9. **Project Settings → Auth → SMTP**: configure a real provider. The built-in sender allows roughly two OTP emails per hour per address, which you will hit within minutes of testing.

Free-tier projects pause after 7 days of inactivity; logins fail with network errors until you unpause.

### Google OAuth (needed for Supabase step 6)

1. **APIs & Services → OAuth consent screen**: External, add yourself as a test user, scopes `email`, `profile`, `openid`.
2. **Credentials → Create OAuth client ID → Web application**.
3. Authorized redirect URI — only this one:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   Supabase owns the provider handshake; the app never receives Google's redirect directly. Adding your own domain here is the usual reason nothing happens.
4. One OAuth client per Supabase project, since the ref differs.

## Database

`supabase/migrations/20261205000000_baseline.sql` creates `public.profiles`, one row per auth user, inserted by a `handle_new_user` trigger on `auth.users`. RLS allows a user to read and update only their own row; `UPDATE` is granted per column so a client cannot rewrite `id` or `created_at`. There is no INSERT or DELETE policy — rows arrive via the trigger and leave via the cascade from `auth.users`.

`display_name` starts NULL, which is how the apps know first-run setup is unfinished and show the display-name sheet. Google sign-ins arrive with a name already and skip it.

Migration naming has a repo-specific rule; read the Database migrations section of [AGENTS.md](AGENTS.md) before adding one.

## Deployment

### Cloudflare

1. **API token** with `Workers Scripts: Edit`, `Workers KV Storage: Edit`, `Account Settings: Read`, plus `Zone: Read` and `Workers Routes: Edit` for the custom domains.
2. Copy the **Account ID** from the Workers dashboard.
3. Runtime secrets, per environment — CI deliberately does not pass these:

   ```bash
   cd apps/web
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env test
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
   wrangler secret put TELEGRAM_BOT_TOKEN --env test
   wrangler secret put TELEGRAM_BOT_TOKEN --env production
   wrangler secret put TELEGRAM_CHAT_ID --env test
   wrangler secret put TELEGRAM_CHAT_ID --env production
   ```

   The `NEXT_PUBLIC_*` values are build-time and inlined by CI, so they do not go here.

   The `/feedback` form posts to `POST /api/feedback`, which forwards the message to Telegram and stores nothing. `TELEGRAM_BOT_TOKEN` comes from BotFather; `TELEGRAM_CHAT_ID` is the chat to notify (comma-separated for several). For local dev, put both in `apps/web/.env.local`. The route checks the request origin, allows 1 request per IP per 60s (the `RATE_LIMITER` binding in `wrangler.toml`, in-memory locally), and silently drops honeypot hits.

4. **KV namespaces** `kinwoo-cache-test` and `kinwoo-cache-prod` back the incremental cache (`open-next.config.ts`). Their ids are already in `apps/web/wrangler.toml`; to recreate them, run `wrangler kv namespace create <name>` and paste the new ids.
5. **Custom domains.** `workers_dev` and `preview_urls` are both off, so the routes in `wrangler.toml` are the only way to reach a deployed Worker. `kinwoo.in` has to be on Cloudflare DNS. Test is served at `test.kinwoo.in` and production at `app.kinwoo.in`; the apex and `www` are left for the landing page.

### GitHub

1. Environments named exactly `test` and `production` — the workflows reference both by name.
2. Repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access Tokens), and `EXPO_TOKEN` if you keep Android builds.
3. In each environment, as secrets or variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the public half of the web push key pair, see Web push below). The `production` environment needs its own copies; it does not inherit from `test`.
4. In each environment, a secret `SUPABASE_DB_PASSWORD` holding that project's database password. Migrations cannot be applied without it. Add required reviewers to `production` to gate the release.
5. **Settings → Actions → General → Workflow permissions**: read and write, and allow Actions to create pull requests. release-please cannot open the release PR otherwise.

`NEXT_PUBLIC_SITE_URL` is not cosmetic: unset, it falls back to `localhost:3000` and inlines that into `metadataBase`, `robots.txt`, `sitemap.xml` and the PWA `start_url`.

### Web push (optional)

Browser notifications use a VAPID key pair per Supabase project. Without it the web app shows "This browser doesn't support push notifications" and `send-push` skips browsers; Android push is unaffected.

1. `npx web-push generate-vapid-keys`.
2. Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (GitHub environment, and `apps/web/.env.local`). It is inlined at build time.
3. Set the function secrets: `supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:you@example.com` (locally, add the same three to `supabase/functions/.env`).
4. The service worker is registered in production builds only, so test push with `npm run build` and `npm start`, or on a deployed Worker. iPhone and iPad need the app added to the Home Screen first.

### Expo / EAS (optional)

Only needed if you want Android builds alongside the web app.

1. `eas init` in `apps/mobile`, then replace `extra.eas.projectId` in `app.config.ts`. `eas.json` sets `appVersionSource: "remote"`, so builds fail without a real project.
2. The Supabase URL and anon key are not in `eas.json`. `mobile-deploy.yml` passes the environment's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the build as `EXPO_PUBLIC_*` (`development` builds use `test`, `production` uses `production`). For a manual `eas build --local`, export the two `EXPO_PUBLIC_*` variables first.
3. `EXPO_TOKEN` from expo.dev → Access Tokens, added as a repository secret.
4. `eas credentials` to generate and store an Android keystore.

## CI/CD

| Workflow            | Trigger            | What it does                                                                                          |
| ------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| `ci-feature.yml`    | Push to non-`main` | Typecheck, test, build, lint and database tests. Deploys nothing                                      |
| `ci-main.yml`       | Push to `main`     | Same checks, then migrates the test project and deploys the test Worker. Updates the release PR       |
| `db-test.yml`       | Called by CI       | Applies every migration to an empty local Supabase and runs the pgTAP tests                           |
| `deploy-test.yml`   | Manual             | Deploys a chosen branch to the test Worker; migrations only if ticked. Next `main` push overwrites it |
| `mobile-deploy.yml` | Manual             | Android build: `development` gives an `.apk`, `production` an `.aab`                                  |

### Releases

Versioning and the changelog are handled by [release-please](https://github.com/googleapis/release-please) from Conventional Commits. Merging the release PR migrates the production Supabase project and deploys the production Worker. For a mobile release, run `mobile-deploy.yml` with the `production` profile and the release tag as the ref.

## Commands

| Command                       | What it does                                        |
| ----------------------------- | --------------------------------------------------- |
| `npm run dev`                 | Web dev server                                      |
| `npm run dev:mobile`          | Expo dev server                                     |
| `npm run dev:up` / `dev:down` | Start / stop Colima and local Supabase              |
| `npm run typecheck`           | Typecheck every workspace                           |
| `npm test`                    | Run every workspace's tests and edge function tests |
| `npm run lint`                | Boundary checks and ESLint                          |
| `npm run format`              | Prettier                                            |
| `npm run build`               | Build every workspace                               |
| `npm run preview`             | Build for Cloudflare and run `wrangler dev`         |
| `npm run deploy`              | Build for Cloudflare and deploy                     |
| `npm run db:reset`            | Reset the local database                            |
| `npm run db:test`             | Run pgTAP tests locally                             |
| `npm run db:types`            | Regenerate database types                           |
| `npm run tokens:generate`     | Regenerate `packages/tokens/generated/*`            |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). In short: branch from `main`, use Conventional Commits, and run `npm run typecheck && npm test && npm run lint` before opening a pull request.

## License

See [LICENSE](LICENSE).
