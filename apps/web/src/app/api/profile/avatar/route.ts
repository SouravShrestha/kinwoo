import { NextResponse } from "next/server";

import { ProfileRepository } from "@/api/profile/ProfileRepository";
import { ProfileService } from "@/api/profile/ProfileService";
import { createRouteClient, getVerifiedUser } from "@/integrations/supabase/client.route";
import { profileResponse } from "../../_lib/profileResponse";

export async function PATCH(request: Request) {
  const { supabase, applyCookies } = createRouteClient(request);

  const user = await getVerifiedUser(request);
  if (!user) {
    return applyCookies(NextResponse.json({ error: "Not logged in" }, { status: 401 }));
  }

  let avatarUrl: unknown;
  try {
    ({ avatarUrl } = (await request.json()) as { avatarUrl?: unknown });
  } catch {
    return applyCookies(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }));
  }

  if (typeof avatarUrl !== "string") {
    return applyCookies(
      NextResponse.json({ error: "avatarUrl must be a string" }, { status: 400 }),
    );
  }

  const service = new ProfileService(new ProfileRepository(supabase));
  const result = await service.setAvatar(user.id, avatarUrl);

  return applyCookies(profileResponse(result));
}
