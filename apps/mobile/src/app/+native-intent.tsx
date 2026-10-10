// Android delivers the OAuth redirect as an intent too; /auth/callback is web-only here and
// would land on the 404 screen. Swallow it so the adapter's code exchange is the only handler.
const AUTH_CALLBACK = /^(?:kinwoo:\/\/)?\/?auth\/callback(?:[/?#]|$)/;

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string | null {
  if (AUTH_CALLBACK.test(path)) {
    return initial ? "/" : null;
  }

  return path;
}
