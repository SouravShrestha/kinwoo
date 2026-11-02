---
name: Kinwoo
description: Shared-house expenses and shopping, kept in ink on paper with one sage tick.
colors:
  ink: "#0e0e0e"
  paper: "#fefefe"
  card-paper: "#fbfbfb"
  muted-paper: "#f1f1f1"
  dialog-header-paper: "#f4f4f4"
  rule: "#e5e5e5"
  dialog-rule: "#dcdcdc"
  pencil: "#6b6b6b"
  sage: "#4e8e60"
  brick: "#c0392b"
  amber: "#b45309"
  slate-blue: "#2563a8"
  night-ink: "#0e0e0e"
  night-card: "#1a1a1a"
  night-sheet: "#161616"
  night-rule: "#262626"
  night-pencil: "#9a9a9a"
  night-sage: "#5ea771"
  night-brick: "#e06a5c"
  night-amber: "#f0b429"
  night-blue: "#6aa8e8"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  wordmark:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  field:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
  code:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    letterSpacing: "8px"
rounded:
  sm: "7.6px"
  md: "9.6px"
  lg: "11.6px"
  xl: "13.6px"
  2xl: "15.6px"
  full: "9999px"
spacing:
  sheet-x: "24px"
  control-gap: "10px"
  tab-bar: "64px"
  column: "448px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.display}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
    height: "56px"
  button-accent:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.paper}"
    typography: "{typography.display}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
    height: "56px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
    height: "56px"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.brick}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
    height: "56px"
  text-field:
    backgroundColor: "{colors.muted-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.2xl}"
    padding: "0 16px"
    height: "54px"
  sheet:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.2xl}"
    padding: "0 24px 32px"
  tab-bar:
    backgroundColor: "{colors.paper}"
    height: "64px"
    width: "448px"
---

# Design System: Kinwoo

## Overview

**Creative North Star: "The Shared Ledger"**

Kinwoo looks like a household account book: ink on paper, ruled lines, plain figures. Almost everything is black and white. One sage green marks the moments that matter, such as confirming, being owed, or being settled. The interface never performs. It records who paid, what is needed and what is owed, and then gets out of the way so a housemate can log a purchase one-handed in a shop.

Surfaces are flat. Structure comes from hairline rules and a faint tonal step between paper and muted paper, never from shadow or gradient. Controls are large (54-56px tall) and generously rounded so they read as friendly and are easy to hit. Poppins gives headings and buttons a rounded, human voice; Inter keeps figures and lists neutral and legible. Light and dark themes are equals, and web and mobile share the same tokens so the two apps feel like one product.

**Key Characteristics:**

- Near-monochrome: ink, paper, and one sage accent.
- Flat, ruled, tonal: no shadows, hairline borders, muted fills.
- Large tap targets, rounded corners (about 14-16px on controls).
- Phone-width column (max 448px) on every screen size; sheets slide up from the bottom.
- Press feedback by fading to 70% opacity, matching native.
- Identical token set on web and mobile.

## Colors

A paper-and-ink palette with a single sage accent and three muted status hues. Values below are the light theme; dark theme has a counterpart for each (night-* tokens), and `primary` flips between ink and paper.

### Primary

- **Ink** (#0e0e0e; dark: #fefefe): Primary buttons, text, focus outlines, the active tab. In dark mode the primary button becomes paper-on-ink.

### Secondary

- **Sage** (#4e8e60; dark #5ea771): The accent. Accent buttons and positive confirmations ("you are owed", settled, bought). Text on sage is paper (dark: ink).

### Neutral

- **Paper** (#fefefe; dark #0e0e0e): Page, sheet and dialog background.
- **Card Paper** (#fbfbfb; dark #1a1a1a): Cards sitting on paper.
- **Muted Paper** (#f1f1f1; dark #1a1a1a): Text-field fills, hover fills, quiet panels.
- **Dialog Header Paper** (#f4f4f4; dark #141414): Dialog header strip.
- **Rule** (#e5e5e5; dark #262626): Hairline borders and dividers. Dialog rule is #dcdcdc.
- **Pencil** (#6b6b6b; dark #9a9a9a): Secondary text, placeholders, ghost button labels.

### Status

- **Brick** (#c0392b; dark #e06a5c): Destructive actions and errors; also the footer heart.
- **Amber** (#b45309; dark #f0b429): Warnings.
- **Slate Blue** (#2563a8; dark #6aa8e8): Informational notices.

### Named Rules

**The One Tick Rule.** Sage appears on a small share of any screen. It signals a positive outcome, never decoration.

**The Same Ink Rule.** Every color comes from the token set in `packages/tokens`; neither app defines its own. Edit tokens, regenerate, never hand-edit generated files.

## Typography

**Display Font:** Poppins (with system-ui, sans-serif)
**Body Font:** Inter (with system-ui, sans-serif)

**Character:** Poppins is round and friendly and carries buttons, headings, and the wordmark. Inter, at medium weight by default, keeps lists and amounts neutral. The body default weight is 500, not 400, which gives text a slightly firm, printed feel.

### Hierarchy

- **Wordmark** (Poppins 700, 2.25rem, tight tracking, uppercase): The footer sign-off, set in Rule color so it recedes.
- **Display / Button** (Poppins 500, 1rem, 1.5): Button labels, section headings. Weight 400 is allowed for quiet buttons.
- **Body** (Inter 500, 1rem, 1.5): Lists, descriptions, amounts.
- **Field** (Inter 500, 1.125rem): Email and name inputs.
- **Code** (Inter 500, 1rem, 8px letter-spacing, centered): The 6-digit OTP entry.
- **Label** (Inter or Poppins, 0.75-0.875rem, Pencil): Metadata, captions.

All sizes scale with `--font-scale`, a user-controlled setting, so never hard-code pixel type.

### Named Rules

**The Scale Rule.** Type sizes are expressed through the theme text scale so the user's font-size setting applies everywhere.

**The Weight Pairing Rule (mobile).** React Native cannot choose weight from one face. Pick a weight utility that also sets the family; never combine `font-display` with `font-bold`.

## Layout

Single column, capped at 448px (max-w-md) and centered on wide screens, with side borders on large viewports so the app reads as a phone-shaped sheet of paper. A fixed 64px tab bar sits at the bottom with safe-area padding. Sheets and dialogs use 24px side padding and 32px bottom padding (or the safe-area inset if larger). Controls stack vertically with 10px gaps between icon and label and full-width buttons. Density is relaxed: tap targets are at least 54px, and the touch layer disables double-tap zoom and text selection outside inputs to feel native. Content respects `100dvh` so sheets never overflow the viewport.

## Elevation & Depth

Flat by default and nearly shadowless. Depth is conveyed by tonal steps (paper, card paper, muted paper), hairline Rule borders, and a 50% black backdrop behind sheets and dialogs. Sheets are distinguished by position (anchored to the bottom, rounded top corners) and a small drag handle, not by a shadow. Press state is opacity 70%.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest and stay flat. Separate with a rule or a tonal step; do not add a shadow.

**The Uncut Ring Rule.** A keyboard focus ring is never clipped. The default ring is 2px ink with a 2px offset, so it needs 4px of free space on every side. Inside a scroller (`overflow-x-auto` clips the other axis too), give the scroller 6px of padding and cancel it with a matching negative margin so layout does not move. Where a neighbour paints over the ring, such as full-width list rows under sticky headings, draw the ring inside the element with a negative offset (`-outline-offset-2`) and give the row a little horizontal padding and rounded corners for it.

Soft, consistent rounding derived from one base radius of 0.6rem. Buttons use the xl step (about 14px), text fields and sheets the 2xl step (about 16px), small chips and tags lg or md. Avatars, badges, switches, and the sheet handle are fully round. Borders are 1px in Rule color. Outline buttons and destructive buttons are transparent so they inherit whatever surface they sit on, page or sheet.

## Components

### Buttons

- **Shape:** Rounded-xl (about 14px), full width, min height 56px, 12px/20px padding, 10px gap between icon and label.
- **Primary:** Ink fill, paper label (swaps in dark). Hover fades to 90%.
- **Accent:** Sage fill, paper label. Used for the confirming action.
- **Outline:** Transparent with a Rule border and ink label; hover fills Muted Paper.
- **Ghost:** Transparent, Pencil label, hover fills Muted Paper.
- **Destructive:** Transparent with a Brick border and Brick label.
- **Focus / Disabled / Loading:** 2px ink outline offset 2px on keyboard focus; disabled and loading drop to 50% opacity and block interaction; loading sets `aria-busy`.

### Text Fields

- **Style:** 54px tall, full width, Muted Paper fill, 1px Rule border, rounded-2xl, 16px horizontal padding, Pencil placeholder.
- **Variants:** email (1.125rem), name (1rem), and the OTP code field (centered, 8px letter-spacing).
- **Focus:** 2px ink outline offset 2px.

### Sheets and Dialogs

- **Style:** Bottom-anchored, max 448px, Sheet background, rounded-t-2xl, 24px side padding, 4px by 40px handle in 30% Pencil.
- **Behavior:** Slide up and down with a fading 50% black backdrop. Close button is a 36px round hit area at the top right. Panels scroll internally under `100dvh - 1.5rem`.

### Navigation

- **Tab bar:** Fixed bottom, 64px, Paper background, top Rule border, items evenly divided, side borders on large viewports. Active tab is ink; inactive is Pencil.

### Pull to refresh

- A 12-tick spinner drawn in Pencil that fills with pull progress and then steps around once loading.

## Do's and Don'ts

### Do:

- **Do** take every color from the token set; use `bg-primary`, `text-muted-foreground`, `border-border` and friends, never raw hex.
- **Do** keep sage for positive outcomes (settled, bought, owed to you) and let ink carry the rest.
- **Do** make every tap target at least 54px tall, and keep primary actions full width.
- **Do** show keyboard focus with the 2px ink outline offset 2px, and check it is not clipped by a scroller or covered by a sticky header (see The Uncut Ring Rule).
- **Do** keep web and mobile visually equivalent; change tokens once and regenerate.
- **Do** set type through the text scale so the font-size setting works.

### Don't:

- **Don't** add shadows or decorative gradients; separate surfaces with rules and tonal steps.
- **Don't** introduce a second accent color or use sage for decoration.
- **Don't** hand-edit `packages/tokens/generated/*`.
- **Don't** fix a layout to pixel widths beyond the 448px column; the app stays phone-width everywhere.
- **Don't** combine `font-display` with `font-bold` on mobile.
- **Don't** let text be selectable outside inputs; the app behaves like a native one.
