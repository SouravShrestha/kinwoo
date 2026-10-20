import { badRequest, handleProfileRequest, readJsonObject } from "@/app/api/_lib/profileRoute";

export async function PATCH(request: Request) {
  return handleProfileRequest(
    request,
    async ({ service, userId }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      if (typeof body.displayName !== "string") return badRequest("displayName must be a string");
      return service.setDisplayName(userId, body.displayName);
    },
    { key: "profile" },
  );
}
