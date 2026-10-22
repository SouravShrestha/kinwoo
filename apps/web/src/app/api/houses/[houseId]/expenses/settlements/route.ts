import { badRequest, handleExpenseRequest, readSettlementInput } from "@/app/api/_lib/expenseRoute";
import { readJsonObject } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleExpenseRequest(request, (service) => service.listSettlements(houseId), {
    key: "settlements",
    uuids: [houseId],
  });
}

export async function POST(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleExpenseRequest(
    request,
    async (service) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      const input = readSettlementInput(body);
      if (typeof input === "string") return badRequest(input);
      return service.recordSettlement(houseId, input);
    },
    { key: "settlement", uuids: [houseId] },
  );
}
