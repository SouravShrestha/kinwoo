import { handleExpenseRequest } from "@/app/api/_lib/expenseRoute";

type Context = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { houseId } = await params;
  return handleExpenseRequest(request, (service) => service.getTotals(houseId), {
    key: "totals",
    uuids: [houseId],
  });
}
