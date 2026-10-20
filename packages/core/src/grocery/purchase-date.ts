export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type CalendarDay = { date: Date; inMonth: boolean };

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export const CALENDAR_WEEKS = 6;

// Always six Sunday-first weeks, padded with the neighbouring months' days, so the picker keeps
// the same height from month to month.
export function monthGrid(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1);
  return Array.from({ length: CALENDAR_WEEKS * 7 }, (_, index) => {
    const date = new Date(year, month, 1 - first.getDay() + index);
    return { date, inMonth: date.getMonth() === month };
  });
}

// Today is left to the server clock; an earlier day is stamped at noon so any timezone shift
// within a day keeps it on the picked date.
export function boughtAtForDate(picked: Date, now: Date = new Date()): string | null {
  if (isSameLocalDay(picked, now)) return null;
  return new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), 12).toISOString();
}
