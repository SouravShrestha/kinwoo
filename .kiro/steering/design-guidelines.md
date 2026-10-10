---
inclusion: always
---

# Design Guidelines

## Interactive elements

- All buttons and interactive elements must use `hover:cursor-pointer`.

## External links (mobile only)

- On mobile (`apps/mobile`), open external links in an in-app browser via `WebBrowser.openBrowserAsync` from `expo-web-browser`. Do not use `Linking.openURL`, which sends the user out to the system browser and leaves the app.
