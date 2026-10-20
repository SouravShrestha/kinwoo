import { badRequest, handleExpenseRequest } from "@/app/api/_lib/expenseRoute";
import { readJsonObject } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleExpenseRequest(
    request,
    async (service) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      if (typeof body.enabled !== "boolean") return badRequest("enabled must be true or false");
      return service.setSimplifyDebts(houseId, body.enabled);
    },
    { uuids: [houseId] },
  );
}
