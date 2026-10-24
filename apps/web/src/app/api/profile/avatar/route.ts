import { badRequest, handleProfileRequest, readJsonObject } from "@/app/api/_lib/profileRoute";

export async function PATCH(request: Request) {
  return handleProfileRequest(
    request,
    async ({ service, userId }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      if (typeof body.avatarUrl !== "string") return badRequest("avatarUrl must be a string");
      return service.setAvatar(userId, body.avatarUrl);
    },
    { key: "profile" },
  );
}
