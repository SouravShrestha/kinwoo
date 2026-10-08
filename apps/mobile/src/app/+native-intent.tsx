/**
 * On Android the OAuth redirect is delivered as an intent *as well as* being
 * returned by openAuthSessionAsync. expo-router would then try to navigate to
 * /auth/callback, which is a web-only route and does not exist here, so the
 * app would land on the 404 screen moments after a successful login.
 *
 * Swallowing it leaves the adapter's own code exchange as the only handler.
 */
const AUTH_CALLBACK = /^(?:kinwoo:\/\/)?\/?auth\/callback(?:[/?#]|$)/;

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string | null {
  if (AUTH_CALLBACK.test(path)) {
    // A cold start has nowhere to return to, so send it to the root instead.
    return initial ? "/" : null;
  }

  return path;
}
