import { NextResponse } from "next/server";

import { ProfileRepository } from "@/api/profile/ProfileRepository";
import { ProfileService } from "@/api/profile/ProfileService";
import { createRouteClient, getVerifiedUser } from "@/integrations/supabase/client.route";

export async function GET(request: Request) {
  const { supabase, applyCookies } = createRouteClient(request);

  const user = await getVerifiedUser(request);
  if (!user) {
    return applyCookies(NextResponse.json({ error: "Not logged in" }, { status: 401 }));
  }

  const service = new ProfileService(new ProfileRepository(supabase));
  const result = await service.listAvatars();

  if (result.status === "error") {
    return applyCookies(NextResponse.json({ error: "Could not load avatars" }, { status: 503 }));
  }

  return applyCookies(
    NextResponse.json({ avatars: result.avatars }, { headers: { "Cache-Control": "no-store" } }),
  );
}
