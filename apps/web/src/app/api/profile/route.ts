import { NextResponse } from "next/server";

import { ProfileRepository } from "@/api/profile/ProfileRepository";
import { ProfileService } from "@/api/profile/ProfileService";
import { createRouteClient, getVerifiedUser } from "@/integrations/supabase/client.route";
import { profileResponse } from "../_lib/profileResponse";

export async function GET(request: Request) {
  const { supabase, applyCookies } = createRouteClient(request);

  const user = await getVerifiedUser(request);
  if (!user) {
    return applyCookies(NextResponse.json({ error: "Not logged in" }, { status: 401 }));
  }

  const service = new ProfileService(new ProfileRepository(supabase));
  const result = await service.getProfile(user.id, user.socialAvatarUrl);

  return applyCookies(profileResponse(result));
}
