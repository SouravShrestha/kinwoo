import { handleExpenseRequest } from "../../../../_lib/expenseRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleExpenseRequest(request, (service) => service.getBalances(houseId), {
    key: "balances",
    uuids: [houseId],
  });
}
