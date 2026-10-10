import { NextResponse } from "next/server";

import { ProfileRepository } from "@/api/profile/ProfileRepository";
import { ProfileService } from "@/api/profile/ProfileService";
import type { ProfilePreferences } from "@/api/profile/IProfileRepository";
import { createRouteClient, getVerifiedUser } from "@/integrations/supabase/client.route";
import { profileResponse } from "../../_lib/profileResponse";

export async function PATCH(request: Request) {
  const { supabase, applyCookies } = createRouteClient(request);

  const user = await getVerifiedUser(request);
  if (!user) {
    return applyCookies(NextResponse.json({ error: "Not logged in" }, { status: 401 }));
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return applyCookies(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }));
  }

  const preferences: ProfilePreferences = {};
  if ("locale" in body) preferences.locale = body.locale as string;
  if ("theme" in body) preferences.theme = body.theme as ProfilePreferences["theme"];
  if ("notificationsEnabled" in body) {
    preferences.notificationsEnabled = body.notificationsEnabled as boolean;
  }

  const service = new ProfileService(new ProfileRepository(supabase));
  const result = await service.setPreferences(user.id, preferences);

  return applyCookies(profileResponse(result));
}
