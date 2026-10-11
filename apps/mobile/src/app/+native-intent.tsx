// Android delivers the OAuth redirect as an intent too; /auth/callback is web-only here and
// would land on the 404 screen. Swallow it so the adapter's code exchange is the only handler.
const AUTH_CALLBACK = /^(?:kinwoo:\/\/)?\/?auth\/callback(?:[/?#]|$)/;

// The OS may hand over the full kinwoo:// URL or just the path; both resolve to the join route.
const JOIN_LINK = /^(?:kinwoo:\/\/)?\/?join\/([^/?#]+)/;

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

  const join = JOIN_LINK.exec(path);
  if (join) return `/join/${join[1]}`;

  return path;
}
