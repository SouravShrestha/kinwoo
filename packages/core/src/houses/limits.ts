// Mirrors max_houses_per_user() in the database, which is what actually enforces it.
export const MAX_HOUSES_PER_USER = 3;

export const HOUSE_LIMIT_MESSAGE = `You can be in up to ${MAX_HOUSES_PER_USER} houses.`;

export function canAddHouse(currentCount: number): boolean {
  return currentCount < MAX_HOUSES_PER_USER;
}
