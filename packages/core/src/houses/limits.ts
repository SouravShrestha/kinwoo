// Mirrors max_houses_per_user() in the database, which is what actually enforces it. Raise both
// together to allow several houses; the switcher in the menu step already supports more than one.
export const MAX_HOUSES_PER_USER = 1;

export function canAddHouse(currentCount: number): boolean {
  return currentCount < MAX_HOUSES_PER_USER;
}
