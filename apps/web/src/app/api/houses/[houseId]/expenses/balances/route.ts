import { handleExpenseRequest } from "@/app/api/_lib/expenseRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;
  const simplify = new URL(request.url).searchParams.get("simplify") === "1";
  return handleExpenseRequest(request, (service) => service.getBalances(houseId, simplify), {
    key: "balances",
    uuids: [houseId],
  });
}
