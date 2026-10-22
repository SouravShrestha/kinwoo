import { badRequest, handleExpenseRequest } from "@/app/api/_lib/expenseRoute";
import { readJsonObject } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; settlementId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { houseId, settlementId } = await params;
  return handleExpenseRequest(
    request,
    async (service) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      if (!Number.isInteger(body.amountPaise))
        return badRequest("amountPaise must be a whole number");
      return service.updateSettlement(settlementId, body.amountPaise as number);
    },
    { uuids: [houseId, settlementId] },
  );
}

export async function DELETE(request: Request, { params }: Context) {
  const { houseId, settlementId } = await params;
  return handleExpenseRequest(request, (service) => service.deleteSettlement(settlementId), {
    uuids: [houseId, settlementId],
  });
}
