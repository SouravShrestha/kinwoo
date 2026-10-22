---
inclusion: auto
name: Cross-platform parity
description: Apply when changing UI, screens, components, or user-facing behaviour in apps/web (Next.js) or apps/mobile (Expo). Ensures the other platform is reviewed for a matching change.
---

# Cross-platform parity

`apps/web` (Next.js) and `apps/mobile` (Expo) are two front-ends over the same
product. When a change lands on one, the other usually needs a matching change.

## Rule

Whenever you change UI or user-facing behaviour in one app, check the other app
to see whether it needs an equivalent change.

- Web change in `apps/web/` → check `apps/mobile/` for the counterpart.
- Mobile change in `apps/mobile/` → check `apps/web/` for the counterpart.

This covers: screens/pages, components, navigation, copy/labels, validation,
empty/loading/error states, and any logic that affects what the user sees or does.

## How to check

1. Find the counterpart screen or component in the other app (search by feature
   name, route, label text, or shared concept).
2. Decide whether parity applies:
   - **Needs the same change** → make it in the same change set.
   - **Already consistent** → no action.
   - **Intentionally platform-specific** → leave it, and say why.
3. If shared logic is involved, prefer lifting it into `packages/*` (`@kinwoo/core`
   or `@kinwoo/client`) instead of duplicating it per platform.

## Reporting

When you finish a UI change, state explicitly what you did about the other
platform: the matching change you made, that parity already held, or why the
difference is intentional. Do not silently touch only one app.

> Note: the two apps use different styling systems (web: Tailwind v4, mobile:
> Tailwind v3 via NativeWind), so parity means equivalent behaviour and layout
> intent, not identical class names. Only `@kinwoo/tokens` is shared.
