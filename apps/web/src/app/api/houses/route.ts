import { badRequest, handleHouseRequest, readJsonObject } from "@/app/api/_lib/houseRoute";
import { isOptional } from "@/app/api/_lib/route";

export async function GET(request: Request) {
  return handleHouseRequest(request, ({ service, userId }) => service.listHouses(userId), {
    key: "houses",
  });
}

export async function POST(request: Request) {
  return handleHouseRequest(
    request,
    async ({ service, userId }) => {
      const body = await readJsonObject(request);
      if (!body) return badRequest("Invalid JSON body");

      const { name, address } = body;
      if (typeof name !== "string") return badRequest("name must be a string");
      if (!isOptional(address, "string")) {
        return badRequest("address must be a string");
      }

      return service.createHouse(userId, { name, address });
    },
    { key: "house", status: 201 },
  );
}
