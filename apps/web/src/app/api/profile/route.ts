import { handleProfileRequest } from "@/app/api/_lib/profileRoute";

export async function GET(request: Request) {
  return handleProfileRequest(request, ({ service, userId }) => service.getProfile(userId), {
    key: "profile",
  });
}
