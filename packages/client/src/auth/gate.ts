export type GateDecision = "nothing" | "redirect-to-login" | "collect-display-name";

export interface GateInput {
  /** False while the first session lookup is still in flight. */
  authReady: boolean;
  isLoggedIn: boolean;
  /** False while the profile request is still in flight. */
  profileReady: boolean;
  needsDisplayName: boolean;
  isPublicRoute: boolean;
}

/**
 * The single place that decides what the auth gate should do.
 *
 * Extracted from the components so the ordering is testable: deciding before
 * either load settles is what produces a login screen that flashes and then
 * vanishes.
 */
export function gateDecision(input: GateInput): GateDecision {
  // Nothing is known yet. Showing anything here would be a guess.
  if (!input.authReady) return "nothing";

  if (!input.isLoggedIn) {
    return input.isPublicRoute ? "nothing" : "redirect-to-login";
  }

  // Logged in, but we do not yet know whether setup is finished.
  if (!input.profileReady) return "nothing";

  return input.needsDisplayName ? "collect-display-name" : "nothing";
}
