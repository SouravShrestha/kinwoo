import type { ProfilePreferences } from "@/api/profile/IProfileRepository";

import { badRequest, handleProfileRequest, readJsonObject } from "@/app/api/_lib/profileRoute";

export async function PATCH(request: Request) {
  return handleProfileRequest(
    request,
    async ({ service, userId }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      // Only the fields sent are changed; ProfileService checks each value.
      const preferences: ProfilePreferences = {};
      if ("locale" in body) preferences.locale = body.locale as string;
      if ("theme" in body) preferences.theme = body.theme as ProfilePreferences["theme"];
      if ("notificationsEnabled" in body) {
        preferences.notificationsEnabled = body.notificationsEnabled as boolean;
      }

      return service.setPreferences(userId, preferences);
    },
    { key: "profile" },
  );
}
