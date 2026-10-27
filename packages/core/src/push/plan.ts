export type PushPermission = "granted" | "denied" | "undetermined";

export type PushAction = "register" | "request" | "skip";

// "request" asks for permission and then registers if it was granted. A denied permission is
// never asked again here: the settings switch sends the user to system settings instead.
export function pushAction(input: {
  enabled: boolean;
  permission: PushPermission;
  isDevice: boolean;
}): PushAction {
  if (!input.enabled || !input.isDevice) return "skip";
  if (input.permission === "granted") return "register";
  return input.permission === "undetermined" ? "request" : "skip";
}
