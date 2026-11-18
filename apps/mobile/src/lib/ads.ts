const AD_EVERY_ROWS = 10;

/** One banner every 10 rows, plus one after the last row if it isn't already a 10th. */
export function showAdAfter(index: number, total: number): boolean {
  return (index + 1) % AD_EVERY_ROWS === 0 || index === total - 1;
}
