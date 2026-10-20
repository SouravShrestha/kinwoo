import { badRequest, handleExpenseRequest, readExpenseInput } from "@/app/api/_lib/expenseRoute";
import { readJsonObject } from "@/app/api/_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string; expenseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId, expenseId } = await params;
  return handleExpenseRequest(request, (service) => service.getExpense(houseId, expenseId), {
    key: "expense",
    uuids: [houseId, expenseId],
  });
}

export async function PATCH(request: Request, { params }: Context) {
  const { houseId, expenseId } = await params;
  return handleExpenseRequest(
    request,
    async (service) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      const input = readExpenseInput(body);
      if (typeof input === "string") return badRequest(input);
      return service.updateExpense(houseId, expenseId, input);
    },
    { key: "expense", uuids: [houseId, expenseId] },
  );
}

export async function DELETE(request: Request, { params }: Context) {
  const { houseId, expenseId } = await params;
  return handleExpenseRequest(request, (service) => service.deleteExpense(expenseId), {
    uuids: [houseId, expenseId],
  });
}
