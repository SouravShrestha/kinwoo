# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Housemates sharing a home who need to split costs and coordinate what to buy. They log expenses, add items to a shared list, and settle up with each other. Primary market is India (kinwoo.in).

## Product Purpose

Kinwoo keeps a shared house's money and shopping in one place: track who paid for what, see simplified balances, and record settlements. Success is housemates always knowing what they owe without arguing.

## Positioning

House-centric rather than group-centric. A shared shopping list sits next to the expense ledger, and a bought item can become an expense. Debts are simplified by default.

## Operating Context

Used on the go (phone, often one-handed at a shop or right after paying) and at a desk. Web and mobile are equally important. Email sign-in uses a 6-digit OTP; Google sign-in is available except on iOS. Push and web push notifications keep housemates in sync.

## Capabilities and Constraints

- Houses (max 3 per user), private by default; members, expenses, items, settlements, payments.
- Any member can manage settlements, record payments, and mark items bought.
- Notifications with per-type muting.
- Avatars: default random avatars or uploaded JPEG photos; no external avatar URLs.
- Web: Next.js 15 on Cloudflare Workers, installable PWA. Mobile: Expo (Android, iOS).
- Shared design tokens in `packages/tokens`.
- Currency and locale details beyond India are undecided.

## Brand Commitments

Name: Kinwoo. Domain: kinwoo.in. No other voice or identity constraints confirmed.

## Evidence on Hand

Working app, legal pages, and OG/app icon assets under `apps/web/src/app` and `assets/`. No testimonials, customer counts, or benchmarks exist; do not invent them.

## Product Principles

- Web and mobile get equal care; behaviour matches across both.
- The house is the unit, not the individual expense.
- Privacy by default.
- Fast to log, clear to settle.

## Accessibility & Inclusion

No formal standard confirmed.
