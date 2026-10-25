import { cn } from "@/lib/utils";
import { Skeleton, SkeletonRegion, SkeletonText } from "./Skeleton";

// Every composition below copies the spacing and sizes of the component it stands in for.
// When a real layout changes, change its skeleton too.

const times = (count: number) => Array.from({ length: count }, (_, index) => index);

export function ItemCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-3 rounded-2xl border border-border bg-card p-3", className)}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      <div className="flex flex-col gap-0.5">
        <SkeletonText size="sm" className="w-3/4" />
        <SkeletonText size="xs" className="w-1/3" />
      </div>
    </div>
  );
}

export function ItemGridSkeleton({
  count = 6,
  withHeader = true,
}: {
  count?: number;
  withHeader?: boolean;
}) {
  return (
    <SkeletonRegion>
      {withHeader ? (
        <div className="mb-3 flex min-h-8 items-center">
          <SkeletonText size="sm" className="w-24" />
        </div>
      ) : null}
      <ul className="grid grid-cols-2 gap-3">
        {times(count).map((index) => (
          <li key={index}>
            <ItemCardSkeleton />
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  );
}

export function ItemCarouselSkeleton() {
  return (
    <SkeletonRegion className="space-y-4">
      <SkeletonText size="sm" className="w-36" />
      <ul className="-mx-6 flex gap-3 overflow-hidden px-6">
        {times(3).map((index) => (
          <li key={index} className="w-[calc((100%+3rem)/2.8)] shrink-0">
            <ItemCardSkeleton />
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  );
}

export function QuickAddBarSkeleton() {
  return <Skeleton className="h-[54px] w-full rounded-full" />;
}

export function HouseHeaderSkeleton() {
  return (
    <SkeletonRegion className="w-48">
      <SkeletonText size="lg" className="w-40" />
      <div className="mt-0.5">
        <SkeletonText size="xs" className="w-28" />
      </div>
    </SkeletonRegion>
  );
}

export function BalanceCardSkeleton() {
  return (
    <SkeletonRegion className="flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-1 flex-col justify-between gap-4 py-6 pl-2 pr-5">
        <div>
          <SkeletonText size="sm" align="end" className="w-[90%]" />
          <SkeletonText size="sm" align="end" className="w-3/5" />
        </div>
        <SkeletonText size="xl" align="end" className="w-2/5" />
      </div>
    </SkeletonRegion>
  );
}

export function BalanceSummarySkeleton() {
  return (
    <SkeletonRegion>
      <SkeletonText size="xl" className="w-3/4" />
      <ul className="mt-5 space-y-4">
        {times(2).map((index) => (
          <li key={index} className="flex items-center gap-3">
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <SkeletonText size="sm" className="w-1/2" />
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  );
}

export function ExpenseActionsSkeleton() {
  return (
    <SkeletonRegion className="-mx-4 flex gap-2 overflow-hidden px-6">
      {times(3).map((index) => (
        <Skeleton key={index} className="h-[38px] w-28 shrink-0 rounded-xl" />
      ))}
    </SkeletonRegion>
  );
}

export function ListRowsSkeleton({
  count = 4,
  leading = "avatar",
  spaced = false,
  className,
}: {
  count?: number;
  leading?: "avatar" | "icon" | "none";
  spaced?: boolean;
  className?: string;
}) {
  return (
    <SkeletonRegion className={className}>
      <div className={cn("flex flex-col", spaced && "gap-3")}>
        {times(count).map((index) => (
          <div key={index} className="flex min-h-16 items-center py-2">
            {leading === "none" ? null : (
              <Skeleton
                className={cn(
                  "mr-3 size-10 shrink-0",
                  leading === "avatar" ? "rounded-full" : "rounded-lg",
                )}
              />
            )}
            <span className="block min-w-0 flex-1">
              <SkeletonText size="base" className="w-2/5" />
              <span className="mt-0.5 block">
                <SkeletonText size="sm" className="w-3/5" />
              </span>
            </span>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function AssignRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRegion className="flex flex-col gap-2">
      {times(count).map((index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
        >
          <span className="block min-w-0 flex-1 pr-2">
            <SkeletonText size="base" className="w-2/5" />
            <SkeletonText size="xs" className="w-16" />
          </span>
          <Skeleton className="h-7 w-16 shrink-0 rounded-lg" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function NotificationSettingsSkeleton({ groups = 3 }: { groups?: number }) {
  return (
    <SkeletonRegion>
      <div className="mt-6 flex h-14 items-center">
        <SkeletonText size="base" className="w-40" />
        <Skeleton className="ml-auto h-7 w-12 shrink-0 rounded-full" />
      </div>
      {times(groups).map((group) => (
        <div key={group} className="mt-8">
          <SkeletonText size="sm" className="w-24" />
          <div className="mt-3">
            {times(3).map((row) => (
              <div key={row} className="flex min-h-14 items-center gap-4">
                <span className="block flex-1">
                  <SkeletonText size="base" className="w-3/5" />
                </span>
                <Skeleton className="size-5 shrink-0 rounded-[6px]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function ExpenseRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonRegion>
      {times(count).map((index) => (
        <div key={index} className="flex items-center px-4 py-5">
          <span className="block w-8 shrink-0">
            <SkeletonText size="xs" align="center" className="w-6" />
            <SkeletonText size="base" align="center" className="w-5" />
          </span>
          <Skeleton className="ml-3 mr-4 size-10 shrink-0 rounded-lg" />
          <span className="mr-3 flex min-w-0 flex-1 flex-col gap-0.5">
            <SkeletonText size="base" className="w-3/5" />
            <SkeletonText size="xs" className="w-2/5" />
          </span>
          <span className="flex w-16 shrink-0 flex-col gap-0.5">
            <SkeletonText size="xs" align="end" className="w-12" />
            <SkeletonText size="base" align="end" className="w-16" />
          </span>
        </div>
      ))}
    </SkeletonRegion>
  );
}

// Different line counts and widths per row, so the list reads like real sentences.
const ACTIVITY_PATTERNS = [
  { lines: ["w-full", "w-1/2"], detail: null },
  { lines: ["w-4/5"], detail: "w-2/5" },
  { lines: ["w-full", "w-3/4"], detail: null },
  { lines: ["w-2/3"], detail: null },
  { lines: ["w-5/6", "w-1/3"], detail: "w-1/2" },
] as const;

function ActivityRowSkeleton({ index, first }: { index: number; first: boolean }) {
  const pattern = ACTIVITY_PATTERNS[index % ACTIVITY_PATTERNS.length]!;
  return (
    <div className={cn("flex items-start py-6", !first && "border-t border-border")}>
      <span className="relative mr-5 mt-px shrink-0">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="absolute -bottom-1 -right-1 size-4 rounded-full ring-2 ring-background" />
      </span>
      <span className="mr-3 block min-w-0 flex-1">
        {pattern.lines.map((width) => (
          <SkeletonText key={width} size="base" className={width} />
        ))}
        {pattern.detail ? (
          <span className="mt-1 block">
            <SkeletonText size="sm" className={pattern.detail} />
          </span>
        ) : null}
        <span className="mt-3 block">
          <SkeletonText size="xs" className="w-16" />
        </span>
      </span>
    </div>
  );
}

export function ActivityRowsSkeleton({
  count = 5,
  withHeading = true,
}: {
  count?: number;
  withHeading?: boolean;
}) {
  const split = withHeading && count > 3 ? 3 : count;
  const days = [times(split), times(count - split).map((index) => index + split)];
  return (
    <SkeletonRegion>
      {days.map((rows, day) =>
        rows.length === 0 ? null : (
          <section key={day}>
            {withHeading ? (
              <div className="py-2">
                <SkeletonText size="sm" className={day === 0 ? "w-14" : "w-20"} />
              </div>
            ) : null}
            {rows.map((index) => (
              <ActivityRowSkeleton key={index} index={index} first={index === rows[0]} />
            ))}
          </section>
        ),
      )}
    </SkeletonRegion>
  );
}

export function FieldSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonRegion className={cn("flex flex-col gap-3", className)}>
      <SkeletonText size="sm" className="w-20" />
      <Skeleton className="h-[54px] w-full rounded-2xl" />
    </SkeletonRegion>
  );
}

export function CreateHouseSkeleton() {
  return (
    <SkeletonRegion>
      <div className="mb-2">
        <SkeletonText size="3xl" className="w-3/5" />
      </div>
      <div className="mb-10">
        <SkeletonText size="sm" className="w-4/5" />
      </div>
      <div className="flex flex-col gap-3">
        <SkeletonText size="sm" className="w-20" />
        <Skeleton className="h-[54px] w-full rounded-2xl" />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <SkeletonText size="sm" className="w-16" />
        <Skeleton className="h-[54px] w-full rounded-2xl" />
      </div>
      <Skeleton className="mt-10 min-h-14 w-full rounded-xl" />
    </SkeletonRegion>
  );
}

function AmountLineSkeleton() {
  return (
    <div className="flex h-11 items-center gap-3 border-b border-border pb-1 box-content">
      <Skeleton className="size-7 shrink-0 rounded-full" />
      <Skeleton className="h-7 w-28" />
    </div>
  );
}

export function ItemFormSkeleton({ variant }: { variant: "single" | "batch" }) {
  return (
    <SkeletonRegion className="space-y-5 pb-8">
      <div className="flex gap-3">
        <Skeleton className="size-12 shrink-0 rounded-xl" />
        <Skeleton className="h-12 min-w-0 flex-1 rounded-xl" />
      </div>
      {variant === "single" ? (
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-20 shrink-0 rounded-xl" />
          <Skeleton className="h-12 w-20 shrink-0 rounded-xl" />
          <Skeleton className="h-12 min-w-0 flex-1 rounded-xl" />
        </div>
      ) : null}
      <div className="py-3">
        <AmountLineSkeleton />
      </div>
      {variant === "batch"
        ? times(3).map((index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-xl" />
              <span className="block min-w-0 flex-1">
                <SkeletonText size="base" className="w-3/5" />
                <SkeletonText size="sm" className="w-2/5" />
              </span>
              <Skeleton className="h-12 w-28 shrink-0 rounded-xl" />
            </div>
          ))
        : null}
    </SkeletonRegion>
  );
}

export function ExpenseFormSkeleton() {
  return (
    <SkeletonRegion className="space-y-5 pb-8">
      <div className="flex gap-3">
        <Skeleton className="size-12 shrink-0 rounded-xl" />
        <Skeleton className="h-12 min-w-0 flex-1 rounded-xl" />
      </div>
      <div className="flex items-start gap-3 py-3">
        <div className="min-w-0 flex-1">
          <AmountLineSkeleton />
        </div>
        <Skeleton className="h-12 w-36 shrink-0 rounded-xl" />
      </div>
      <div className="flex items-center gap-x-2">
        <SkeletonText size="base" className="w-14" />
        <Skeleton className="h-9 w-20 rounded-lg" />
        <SkeletonText size="base" className="w-16" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="mt-1 py-1">
        <SkeletonText size="base" className="w-28" />
      </div>
    </SkeletonRegion>
  );
}

export function ExpenseFormPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-md px-6">
      <div className="flex items-center justify-between pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <Skeleton className="size-10 rounded-lg" />
        <SkeletonText size="lg" className="w-28" />
        <Skeleton className="size-10 rounded-lg" />
      </div>
      <ExpenseFormSkeleton />
    </main>
  );
}

function PersonLineSkeleton({ avatar, label }: { avatar: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className={cn("shrink-0 rounded-full", avatar)} />
      <SkeletonText size="base" className={label} />
    </div>
  );
}

export function ExpenseDetailSkeleton() {
  return (
    <SkeletonRegion className="flex flex-col gap-7">
      <div className="flex gap-4">
        <Skeleton className="size-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <SkeletonText size="lg" className="w-3/5" />
          <div className="flex h-[calc(34px*var(--font-scale,1))] items-center">
            <Skeleton className="h-7 w-1/3" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {times(2).map((index) => (
          <div key={index} className="flex items-center gap-2">
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <SkeletonText size="sm" className="w-3/5" />
          </div>
        ))}
      </div>
      <div className="my-1 h-px bg-border" />
      <div>
        <PersonLineSkeleton avatar="size-9" label="w-1/2" />
        <ul className="ml-[18px]">
          {times(2).map((index) => (
            <li key={index} className="flex h-12 items-center">
              <div className="relative h-full w-5 shrink-0" aria-hidden>
                <div
                  className="absolute left-0 top-0 w-px bg-border"
                  style={{ bottom: index === 1 ? "50%" : 0 }}
                />
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
              </div>
              <PersonLineSkeleton avatar="size-[26px]" label="w-40" />
            </li>
          ))}
        </ul>
      </div>
    </SkeletonRegion>
  );
}

export function PaymentDetailSkeleton() {
  return (
    <SkeletonRegion className="mt-16 flex flex-col items-center px-6">
      <div className="flex items-center gap-6">
        <Skeleton className="size-[72px] rounded-full" />
        <Skeleton className="size-11 rounded-lg" />
        <Skeleton className="size-[72px] rounded-full" />
      </div>
      <div className="mt-6 w-full">
        <SkeletonText size="xl" align="center" className="w-3/5" />
      </div>
      <div className="mt-1 w-full">
        <SkeletonText size="xs" align="center" className="w-1/3" />
      </div>
      <div className="mt-6 flex h-[calc(56px*var(--font-scale,1))] items-center">
        <Skeleton className="h-9 w-40" />
      </div>
    </SkeletonRegion>
  );
}

export function SettleUpSkeleton() {
  return (
    <SkeletonRegion>
      <div className="mt-4 px-6">
        <SkeletonText size="xl" className="w-3/4" />
      </div>
      <div className="mt-8">
        {times(3).map((index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-4 px-6 py-5",
              index < 2 && "border-b border-border",
            )}
          >
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <span className="block min-w-0 flex-1">
              <SkeletonText size="base" className="w-2/5" />
              <span className="mt-0.5 block">
                <SkeletonText size="xs" className="w-3/5" />
              </span>
            </span>
            <span className="block w-16 shrink-0">
              <SkeletonText size="xs" align="end" className="w-10" />
              <SkeletonText size="base" align="end" className="w-16" />
            </span>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function MemberBalanceRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRegion className="mt-10">
      {times(count).map((index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border px-6 py-6">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <span className="block min-w-0 flex-1">
            <SkeletonText size="base" className="w-4/5" />
          </span>
          <span className="-mr-2 size-10 shrink-0" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function TotalsSkeleton() {
  return (
    <SkeletonRegion>
      <div className="mt-10 px-6">
        <div className="mx-10">
          <Skeleton className="aspect-[320/220] w-full rounded-lg" />
          <div className="mt-2">
            <SkeletonText size="xs" align="center" className="w-1/2" />
          </div>
        </div>
      </div>
      <div className="mt-16 px-6">
        <SkeletonText size="base" align="center" className="w-4/5" />
        <div className="mt-6 flex gap-4">
          {times(2).map((index) => (
            <div key={index} className="min-w-0 flex-1">
              <SkeletonText size="base" align="center" className="w-20" />
              <div className="mt-2">
                <SkeletonText size="2xl" align="center" className="w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function PrivateSpendingHeaderSkeleton() {
  return (
    <SkeletonRegion className="px-6 pb-4 pt-2">
      <SkeletonText size="xl" className="w-3/4" />
      <div className="mt-2">
        <SkeletonText size="sm" className="w-full" />
      </div>
    </SkeletonRegion>
  );
}

export function AvatarGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonRegion className="-mx-3 flex flex-wrap">
      {times(count).map((index) => (
        <div key={index} className="w-1/3 p-3">
          <Skeleton className="aspect-square w-full rounded-full" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function MemberStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonRegion>
      <ul className="flex w-max gap-2">
        {times(count).map((index) => (
          <li key={index} className="flex w-18 flex-col items-center gap-2">
            <Skeleton className="size-12 rounded-full" />
            <span className="block w-full">
              <SkeletonText size="xs" align="center" className="w-10" />
              <SkeletonText size="xs" align="center" className="w-6" />
            </span>
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  );
}

export function ItemDetailSkeleton() {
  return (
    <SkeletonRegion>
      <div className="space-y-6">
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
          <span className="h-10" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <Skeleton className="h-12 min-w-0 flex-1 rounded-xl" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-20 shrink-0 rounded-xl" />
          <Skeleton className="h-12 w-20 shrink-0 rounded-xl" />
          <Skeleton className="ml-auto h-12 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2">
          {times(3).map((index) => (
            <Skeleton key={index} className="h-10 flex-1 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="mt-8 flex items-center gap-3 pb-4">
        <Skeleton className="min-h-12 flex-1 rounded-xl" />
        <Skeleton className="min-h-12 flex-1 rounded-xl" />
      </div>
    </SkeletonRegion>
  );
}

export function InviteSkeleton() {
  return (
    <SkeletonRegion>
      <div className="pb-2">
        <SkeletonText size="sm" className="w-3/4" />
      </div>
      <div className="mt-6 flex items-center gap-6">
        <Skeleton className="size-32 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <SkeletonText size="sm" className="w-full" />
          <Skeleton className="mt-3 h-14 w-40 rounded-xl" />
          <div className="mt-2 flex h-10 items-center justify-end">
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <SkeletonText size="sm" className="w-28" />
        <Skeleton className="h-[54px] w-full rounded-2xl" />
      </div>
      <Skeleton className="mt-6 min-h-14 w-full rounded-xl" />
      <div className="mt-6">
        <SkeletonText size="sm" className="w-28" />
        <Skeleton className="mt-3 h-12 w-full rounded-xl" />
      </div>
      <div className="mt-8">
        <SkeletonText size="sm" className="w-32" />
        <ListRowsSkeleton count={3} className="mt-2" />
      </div>
    </SkeletonRegion>
  );
}

export function JoinPreviewSkeleton() {
  return (
    <SkeletonRegion>
      <SkeletonText size="2xl" className="w-2/3" />
      <div className="mt-0.5">
        <SkeletonText size="sm" className="w-1/2" />
      </div>
      <div className="mt-5 flex items-center">
        <Skeleton className="size-10 rounded-full" />
        <span className="ml-4 block flex-1">
          <SkeletonText size="sm" className="w-24" />
        </span>
      </div>
      <div className="mt-5 border-t border-border pt-5">
        <SkeletonText size="sm" className="w-20" />
        <div className="mt-3 flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <SkeletonText size="base" className="w-32" />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="min-h-14 w-full rounded-xl" />
        <Skeleton className="min-h-14 w-full rounded-xl" />
      </div>
    </SkeletonRegion>
  );
}

export function PageSkeleton() {
  return (
    <main className="px-6 pb-24 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="mb-8 mt-3">
        <SkeletonText size="xl" className="w-40" />
      </div>
      <ListRowsSkeleton count={6} />
    </main>
  );
}
