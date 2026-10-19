import { parseExpenseCursor } from "@kinwoo/core/expenses";

import { badRequest, handleExpenseRequest, readExpenseInput } from "../../../_lib/expenseRoute";
import { readJsonObject } from "../../../_lib/groceryRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;
  const rawCursor = new URL(request.url).searchParams.get("cursor");
  const after = rawCursor === null ? null : parseExpenseCursor(rawCursor);

  return handleExpenseRequest(
    request,
    async (service) => {
      if (rawCursor !== null && !after) return badRequest("Invalid cursor");
      return service.listExpenses(houseId, after);
    },
    { key: "page", uuids: [houseId] },
  );
}

export async function POST(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleExpenseRequest(
    request,
    async (service) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");
      const input = readExpenseInput(body);
      if (typeof input === "string") return badRequest(input);
      return service.createExpense(houseId, input);
    },
    { key: "expense", uuids: [houseId] },
  );
}
