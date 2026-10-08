import { NextResponse } from "next/server";

import type { ProfileResult } from "@/api/profile/IProfileService";

/** Maps the domain result onto HTTP. The only place that mapping lives. */
export function profileResponse(result: ProfileResult): NextResponse {
  switch (result.status) {
    case "ok":
      return NextResponse.json(
        { profile: result.profile },
        { headers: { "Cache-Control": "no-store" } },
      );
    case "not-found":
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    case "invalid":
      return NextResponse.json({ error: result.message }, { status: 400 });
    case "error":
      return NextResponse.json({ error: "Could not load the profile" }, { status: 503 });
  }
}
