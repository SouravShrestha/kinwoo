# Kinwoo

Kinwoo is a monorepo with a Next.js web app (deployed to Cloudflare Workers via OpenNext) and an Expo mobile app (Android, plus iOS without Google sign-in). The web app is the primary surface and is installable as a PWA.

## Structure

```
apps/web        Next.js 15 app, Cloudflare Workers via OpenNext
apps/mobile     Expo 57 + NativeWind app
packages/core   Platform-agnostic logic, zero runtime dependencies
packages/client API + auth seam shared by both apps
packages/tokens Design tokens -> CSS variables (web) and hex map (mobile)
packages/icons  Shared SVG icons, one geometry source per platform renderer
scripts/        Repo checks (package boundaries)
supabase/       Config and migrations
```

## Getting started

Requires Node.js 20+ (22.6+ to regenerate tokens).

```bash
npm install
npm run tokens:generate
npm run dev           # web at http://localhost:3000
npm run dev:mobile    # Expo dev server
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and `apps/mobile/.env.example` to `apps/mobile/.env.local`, then work through the Supabase setup below. Logins will not work until steps 1-9 are done.

## Authentication

Email sign-in is a 6-digit OTP; Google is OAuth. Google is unavailable on iOS, because App Store review expects Sign in with Apple alongside any other third-party provider and we do not offer it yet. The UI branches on the `canSignInWithGoogle` capability rather than on the platform, so nothing else changes.

How it fits together:

- `packages/core/src/auth` — pure helpers: open-redirect hardening, display-name validation, the public-route list.
- `packages/client/src/auth` — the `AuthAdapter` interface, the session state machine, the OTP phase reducer, and the gate decision. No platform APIs.
- `apps/web/src/lib/auth-adapter.ts` and `apps/mobile/src/lib/auth-adapter.ts` — the two implementations.
- `apps/web/src/integrations/supabase/client.route.ts` — the server seam. Cookie writes are buffered per request because a Worker cannot mutate a response after it is constructed, so **every** exit path of a route handler must call `applyCookies`, including 401s and catch blocks. A test enforces this.
- `getVerifiedUser` accepts a session cookie (web) or an `Authorization: Bearer` token (mobile).

### Supabase setup

1. Create a project at supabase.com. Two projects (test + production) matches what `eas.json` and CI already assume.
2. From **Settings → API** copy the Project URL, the `anon` key and the `service_role` key.
3. Migrations are applied by CI (test on every `main` merge, production on release). Locally: `supabase link --project-ref <ref>` then `supabase db push`. The `avatars` storage bucket is not part of the migrations: create it by hand (public) in each project.
4. **Authentication → Providers → Email**: enabled, with "Confirm email" on.
5. **Authentication → Emails → Magic Link**: the template body must contain `{{ .Token }}`. This is the step people miss — with only `{{ .ConfirmationURL }}` Supabase sends a link instead of a code, and the OTP screen can never succeed.
6. **Authentication → Providers → Google**: paste the Client ID and Secret from Google Cloud (below).
7. **Authentication → URL Configuration → Site URL**: this environment's public origin.
8. Same page, **Redirect URLs**. Missing entries fail silently:
   ```
   http://localhost:3000/auth/callback
   https://test.kinwoo.in/auth/callback
   https://kinwoo.in/auth/callback
   kinwoo://auth/callback
   ```
   The custom-scheme entry is what makes the Android deep-link return work.
9. **Project Settings → Auth → SMTP**: configure a real provider. The built-in sender allows roughly two OTP emails per hour per address, which you will hit within minutes of testing.

Free-tier projects pause after 7 days of inactivity; logins fail with network errors until you unpause.

### Google Cloud (needed for step 6)

1. **APIs & Services → OAuth consent screen**: External, add yourself as a test user, scopes `email`, `profile`, `openid`.
2. **Credentials → Create OAuth client ID → Web application**.
3. Authorized redirect URI — only this one:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   Supabase owns the provider handshake; the app never receives Google's redirect directly. Adding your own domain here is the usual reason nothing happens.
4. One OAuth client per Supabase project, since the ref differs.

### Database

`supabase/migrations/20261205000000_baseline.sql` creates `public.profiles`, one row per auth user, inserted by a `handle_new_user` trigger on `auth.users`. RLS allows a user to read and update only their own row; `UPDATE` is granted per column so a client cannot rewrite `id` or `created_at`. There is no INSERT or DELETE policy — rows arrive via the trigger and leave via the cascade from `auth.users`.

`display_name` starts NULL, which is how the apps know first-run setup is unfinished and show the display-name sheet. Google sign-ins arrive with a name already and skip it.

## Deployment

### Cloudflare

1. **API token** with `Workers Scripts: Edit`, `Workers KV Storage: Edit`, `Account Settings: Read`, plus `Zone: Read` and `Workers Routes: Edit` for the custom domains.
2. Copy the **Account ID** from the Workers dashboard.
3. Runtime secret, per environment — CI deliberately does not pass this:
   ```bash
   cd apps/web
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env test
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
   ```
   The `NEXT_PUBLIC_*` values are build-time and inlined by CI, so they do not go here.
4. **KV namespaces** `kinwoo-cache-test` and `kinwoo-cache-prod` back the incremental cache (`open-next.config.ts`). Their ids are already in `apps/web/wrangler.toml`; to recreate them, run `wrangler kv namespace create <name>` and paste the new ids.
5. **Custom domains.** `workers_dev` and `preview_urls` are both off, so the routes in `wrangler.toml` are the only way to reach a deployed Worker. `kinwoo.in` has to be on Cloudflare DNS.

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

## Commands

| Command                   | What it does                                |
| ------------------------- | ------------------------------------------- |
| `npm run typecheck`       | Typecheck every workspace                   |
| `npm test`                | Run every workspace's tests                 |
| `npm run lint`            | Boundary checks + ESLint                    |
| `npm run build`           | Build every workspace                       |
| `npm run format`          | Prettier                                    |
| `npm run preview`         | Build for Cloudflare and run `wrangler dev` |
| `npm run deploy`          | Build for Cloudflare and deploy             |
| `npm run tokens:generate` | Regenerate `packages/tokens/generated/*`    |

## CI/CD

- `ci-feature.yml`: on every non-`main` push — typecheck, test, build, lint, and the database tests (`db-test.yml`). Nothing is deployed, so branches never overwrite the shared test Worker.
- `ci-main.yml`: on `main` — same checks, then apply migrations to the test Supabase project and deploy the test Worker. If the database tests also pass, release-please opens or updates the (draft) release PR. Merging it applies migrations to the production Supabase project, deploys the production Worker and builds the Android `.aab` via `mobile-deploy.yml`.
- `deploy-test.yml`: manual (Actions → Deploy Test → Run workflow, pick a branch). Builds that branch and deploys it to the test Worker. Migrations are applied only if you tick the box, since the test database is shared. The next push to `main` overwrites it.
- `db-test.yml`: starts a local Supabase, applies every migration to an empty database and runs the pgTAP tests.

## Placeholders to replace

- Placeholder icons in `apps/mobile/assets` and `apps/web/public/icons` — currently solid black squares scaled from the Expo placeholder

## License

[MIT](LICENSE)
