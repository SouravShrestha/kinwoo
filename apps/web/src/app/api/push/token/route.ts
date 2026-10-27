import { badRequest, handlePushRequest, readJsonObject } from "@/app/api/_lib/pushRoute";

export async function POST(request: Request) {
  return handlePushRequest(request, async ({ service }) => {
    const body = await readJsonObject(request);
    if (!body) return badRequest("Invalid JSON body");
    return service.registerToken(body.token);
  });
}

export async function DELETE(request: Request) {
  return handlePushRequest(request, async ({ service }) => {
    const body = await readJsonObject(request);
    if (!body) return badRequest("Invalid JSON body");
    return service.unregisterToken(body.token);
  });
}
