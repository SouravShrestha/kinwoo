export type GateDecision = "nothing" | "redirect-to-login" | "collect-display-name";

export interface GateInput {
  authReady: boolean;
  isLoggedIn: boolean;
  profileReady: boolean;
  needsDisplayName: boolean;
  isPublicRoute: boolean;
}

// Deciding before either load settles makes the login screen flash and vanish.
export function gateDecision(input: GateInput): GateDecision {
  if (!input.authReady) return "nothing";

  if (!input.isLoggedIn) {
    return input.isPublicRoute ? "nothing" : "redirect-to-login";
  }

  if (!input.profileReady) return "nothing";

  return input.needsDisplayName ? "collect-display-name" : "nothing";
}
