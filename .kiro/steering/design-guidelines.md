---
inclusion: always
---

# Design Guidelines

## Interactive elements

- All buttons and interactive elements must use `hover:cursor-pointer`.

## External links (mobile only)

- On mobile (`apps/mobile`), open external links in an in-app browser via `WebBrowser.openBrowserAsync` from `expo-web-browser`. Do not use `Linking.openURL`, which sends the user out to the system browser and leaves the app.

## Icons

- SVGs should be converted to components then used, unless specifically asked for.

## Loading and processing

- Every loading or processing state is shown with the top loading bar (`TopLoader` in `apps/web` and `apps/mobile`, mounted in `AppProviders`). Do not add spinners, `ActivityIndicator` or `animate-spin` elements.
- The bar is driven by `useIsBusy` from `@kinwoo/client/activity`: any pending first-load query or in-flight mutation shows it automatically.
- For async work that is not a query or mutation (auth calls, storage, navigation hand-offs), call `useBusyWhile(isBusy)` from `@kinwoo/client/activity`.
- `Button` with `loading` already registers with the bar, disables itself and keeps its label. Do not render a spinner inside it.
- While data loads, render a skeleton shaped like the content, next to the bar. Use `Skeleton` and `SkeletonRegion` from `components/skeleton/Skeleton` and the compositions in `components/skeleton/skeletons` (same names in `apps/web` and `apps/mobile`). Add a new composition there instead of styling blocks inline. Never show a skeleton for a background refetch; the existing content stays.
- A skeleton must have the same spacing and sizes as the real content, so nothing shifts when data arrives. Copy the real component's padding, gaps, avatar and icon sizes, and use `SkeletonText` for text lines so each takes the real line height. Change the skeleton whenever the real layout changes.
