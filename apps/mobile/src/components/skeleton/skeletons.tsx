import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton, SkeletonRegion, SkeletonText } from "./Skeleton";

// Every composition below copies the spacing and sizes of the component it stands in for.
// When a real layout changes, change its skeleton too.

const SCREEN_PADDING = 24;
const CARD_GAP = 12;
const VISIBLE_CARDS = 2.8;

const times = (count: number) => Array.from({ length: count }, (_, index) => index);

export function ItemCardSkeleton({ width }: { width?: number }) {
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-3" style={{ width }}>
      <View className="flex-row items-center justify-between">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="size-7 rounded-full" />
      </View>
      <View className="gap-0.5">
        <SkeletonText size="sm" className="w-3/4" />
        <SkeletonText size="xs" className="w-1/3" />
      </View>
    </View>
  );
}

export function ItemGridSkeleton({
  count = 6,
  withHeader = true,
}: {
  count?: number;
  withHeader?: boolean;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - SCREEN_PADDING * 2 - CARD_GAP) / 2;
  return (
    <SkeletonRegion className="px-6 pt-2">
      {withHeader ? (
        <View className="mb-3 min-h-8 justify-center">
          <SkeletonText size="sm" className="w-24" />
        </View>
      ) : null}
      <View className="flex-row flex-wrap" style={{ gap: CARD_GAP }}>
        {times(count).map((index) => (
          <ItemCardSkeleton key={index} width={cardWidth} />
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function ItemCarouselSkeleton() {
  const { width } = useWindowDimensions();
  return (
    <SkeletonRegion className="gap-4">
      <SkeletonText size="sm" className="w-36" />
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -SCREEN_PADDING }}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: CARD_GAP }}
      >
        {times(3).map((index) => (
          <ItemCardSkeleton key={index} width={width / VISIBLE_CARDS} />
        ))}
      </ScrollView>
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
      <View className="mt-0.5">
        <SkeletonText size="xs" className="w-28" />
      </View>
    </SkeletonRegion>
  );
}

export function BalanceCardSkeleton() {
  return (
    <SkeletonRegion className="w-full flex-row items-stretch overflow-hidden rounded-lg border border-border bg-card">
      <View className="flex-1 justify-between gap-4 py-6 pl-2 pr-5">
        <View>
          <SkeletonText size="sm" align="end" className="w-[90%]" />
          <SkeletonText size="sm" align="end" className="w-3/5" />
        </View>
        <SkeletonText size="xl" align="end" className="w-2/5" />
      </View>
    </SkeletonRegion>
  );
}

export function BalanceSummarySkeleton() {
  return (
    <SkeletonRegion>
      <SkeletonText size="xl" className="w-3/4" />
      <View className="mt-5 gap-4">
        {times(2).map((index) => (
          <View key={index} className="flex-row items-center gap-3">
            <Skeleton className="size-5 rounded-full" />
            <View className="flex-1">
              <SkeletonText size="sm" className="w-1/2" />
            </View>
          </View>
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function ExpenseActionsSkeleton() {
  return (
    <SkeletonRegion className="flex-row gap-2">
      {times(3).map((index) => (
        <Skeleton key={index} className="h-[38px] w-28 rounded-xl" />
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
      <View className={spaced ? "gap-3" : ""}>
        {times(count).map((index) => (
          <View key={index} className="min-h-16 flex-row items-center py-2">
            {leading === "none" ? null : (
              <Skeleton
                className={`mr-3 size-10 ${leading === "avatar" ? "rounded-full" : "rounded-lg"}`}
              />
            )}
            <View className="flex-1">
              <SkeletonText size="base" className="w-2/5" />
              <View className="mt-0.5">
                <SkeletonText size="sm" className="w-3/5" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function AssignRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRegion className="gap-2">
      {times(count).map((index) => (
        <View
          key={index}
          className="flex-row items-center justify-between rounded-xl border border-border/60 px-4 py-3"
        >
          <View className="flex-1 pr-2">
            <SkeletonText size="base" className="w-2/5" />
            <SkeletonText size="xs" className="w-16" />
          </View>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </View>
      ))}
    </SkeletonRegion>
  );
}

export function NotificationSettingsSkeleton({ groups = 3 }: { groups?: number }) {
  return (
    <SkeletonRegion>
      <View className="mt-6 h-14 flex-row items-center">
        <Skeleton className="h-4 w-40" />
        <View className="flex-1" />
        <Skeleton className="h-7 w-12 rounded-full" />
      </View>
      {times(groups).map((group) => (
        <View key={group} className="mt-8">
          <SkeletonText size="sm" className="w-24" />
          <View className="mt-3">
            {times(3).map((row) => (
              <View key={row} className="min-h-14 flex-row items-center gap-4">
                <View className="flex-1">
                  <SkeletonText size="base" className="w-3/5" />
                </View>
                <Skeleton className="size-5 rounded-[6px]" />
              </View>
            ))}
          </View>
        </View>
      ))}
    </SkeletonRegion>
  );
}

export function ExpenseRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonRegion>
      {times(count).map((index) => (
        <View key={index} className="flex-row items-center px-4 py-5">
          <View className="w-8">
            <SkeletonText size="xs" align="center" className="w-6" />
            <SkeletonText size="base" align="center" className="w-5" />
          </View>
          <Skeleton className="ml-3 mr-4 size-10 rounded-lg" />
          <View className="mr-3 min-w-0 flex-1 gap-0.5">
            <SkeletonText size="base" className="w-3/5" />
            <SkeletonText size="xs" className="w-2/5" />
          </View>
          <View className="w-16 gap-0.5">
            <SkeletonText size="xs" align="end" className="w-12" />
            <SkeletonText size="base" align="end" className="w-16" />
          </View>
        </View>
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
    <View className={`flex-row items-start py-6 ${first ? "" : "border-t border-border"}`}>
      <View className="mr-5 mt-px">
        <Skeleton className="size-9 rounded-lg" />
        <View className="absolute -bottom-1 -right-1 rounded-full border-2 border-background">
          <Skeleton className="size-4 rounded-full" />
        </View>
      </View>
      <View className="mr-3 flex-1">
        {pattern.lines.map((width) => (
          <SkeletonText key={width} size="base" className={width} />
        ))}
        {pattern.detail ? (
          <View className="mt-1">
            <SkeletonText size="sm" className={pattern.detail} />
          </View>
        ) : null}
        <View className="mt-3">
          <SkeletonText size="xs" className="w-16" />
        </View>
      </View>
    </View>
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
          <View key={day}>
            {withHeading ? (
              <View className="py-2">
                <SkeletonText size="sm" className={day === 0 ? "w-14" : "w-20"} />
              </View>
            ) : null}
            {rows.map((index) => (
              <ActivityRowSkeleton key={index} index={index} first={index === rows[0]} />
            ))}
          </View>
        ),
      )}
    </SkeletonRegion>
  );
}

export function FieldSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonRegion className={`gap-3 ${className ?? ""}`}>
      <SkeletonText size="sm" className="w-20" />
      <Skeleton className="h-[54px] w-full rounded-2xl" />
    </SkeletonRegion>
  );
}

export function CreateHouseSkeleton() {
  return (
    <SkeletonRegion>
      <View className="mb-2">
        <SkeletonText size="3xl" className="w-3/5" />
      </View>
      <View className="mb-10">
        <SkeletonText size="sm" className="w-4/5" />
      </View>
      <View className="gap-3">
        <SkeletonText size="sm" className="w-20" />
        <Skeleton className="h-[54px] w-full rounded-2xl" />
      </View>
      <View className="mt-6 gap-3">
        <SkeletonText size="sm" className="w-16" />
        <Skeleton className="h-[54px] w-full rounded-2xl" />
      </View>
      <Skeleton className="mt-10 h-14 w-full rounded-xl" />
    </SkeletonRegion>
  );
}

function AmountLineSkeleton() {
  return (
    <View className="h-[49px] flex-row items-center gap-3 border-b border-border">
      <Skeleton className="size-7 rounded-full" />
      <Skeleton className="h-7 w-28" />
    </View>
  );
}

export function ItemFormSkeleton({ variant }: { variant: "single" | "batch" }) {
  return (
    <SkeletonRegion className="gap-5 pb-8">
      <View className="flex-row gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
      </View>
      {variant === "single" ? (
        <View className="flex-row items-center gap-3">
          <Skeleton className="h-12 w-20 rounded-xl" />
          <Skeleton className="h-12 w-20 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </View>
      ) : null}
      <View className="py-3">
        <AmountLineSkeleton />
      </View>
      {variant === "batch"
        ? times(3).map((index) => (
            <View key={index} className="flex-row items-center gap-3">
              <Skeleton className="size-12 rounded-xl" />
              <View className="min-w-0 flex-1">
                <SkeletonText size="base" className="w-3/5" />
                <SkeletonText size="sm" className="w-2/5" />
              </View>
              <Skeleton className="h-12 w-28 rounded-xl" />
            </View>
          ))
        : null}
    </SkeletonRegion>
  );
}

export function ExpenseFormSkeleton() {
  return (
    <SkeletonRegion className="gap-5 pb-8">
      <View className="flex-row gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
      </View>
      <View className="flex-row items-start gap-3 py-3">
        <View className="flex-1">
          <AmountLineSkeleton />
        </View>
        <Skeleton className="h-12 w-36 rounded-xl" />
      </View>
      <View className="flex-row items-center gap-x-2">
        <SkeletonText size="base" className="w-14" />
        <Skeleton className="h-9 w-20 rounded-lg" />
        <SkeletonText size="base" className="w-16" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </View>
      <View className="mt-1 py-1">
        <SkeletonText size="base" className="w-28" />
      </View>
    </SkeletonRegion>
  );
}

export function ExpenseFormPageSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 20 }}>
      <View className="flex-row items-center justify-between pb-8">
        <Skeleton className="size-10 rounded-lg" />
        <SkeletonText size="lg" className="w-28" />
        <Skeleton className="size-10 rounded-lg" />
      </View>
      <ExpenseFormSkeleton />
    </View>
  );
}

function PersonLineSkeleton({ avatar, label }: { avatar: string; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <Skeleton className={`rounded-full ${avatar}`} />
      <View className="flex-1">
        <SkeletonText size="base" className={label} />
      </View>
    </View>
  );
}

export function ExpenseDetailSkeleton() {
  return (
    <SkeletonRegion className="gap-7">
      <View className="flex-row gap-4">
        <Skeleton className="size-16 rounded-xl" />
        <View className="min-w-0 flex-1 gap-1.5">
          <SkeletonText size="lg" className="w-3/5" />
          <View className="h-[34px] justify-center">
            <Skeleton className="h-7 w-1/3" />
          </View>
        </View>
      </View>
      <View className="gap-4">
        {times(2).map((index) => (
          <View key={index} className="flex-row items-center gap-2">
            <Skeleton className="size-5 rounded-full" />
            <View className="flex-1">
              <SkeletonText size="sm" className="w-3/5" />
            </View>
          </View>
        ))}
      </View>
      <View className="my-1 h-px bg-border" />
      <View>
        <PersonLineSkeleton avatar="size-9" label="w-1/2" />
        <View className="ml-[18px]">
          {times(2).map((index) => (
            <View key={index} className="h-12 flex-row items-center">
              <View className="h-full w-5">
                <View
                  className="absolute left-0 top-0 w-px bg-border"
                  style={index === 1 ? { height: "50%" } : { bottom: 0 }}
                />
                <View className="absolute inset-x-0 top-1/2 h-px bg-border" />
              </View>
              <PersonLineSkeleton avatar="size-[26px]" label="w-40" />
            </View>
          ))}
        </View>
      </View>
    </SkeletonRegion>
  );
}

export function PaymentDetailSkeleton() {
  return (
    <SkeletonRegion className="mt-16 items-center px-6">
      <View className="flex-row items-center gap-6">
        <Skeleton className="size-[72px] rounded-full" />
        <Skeleton className="size-11 rounded-lg" />
        <Skeleton className="size-[72px] rounded-full" />
      </View>
      <View className="mt-6 w-full">
        <SkeletonText size="xl" align="center" className="w-3/5" />
      </View>
      <View className="mt-1 w-full">
        <SkeletonText size="xs" align="center" className="w-1/3" />
      </View>
      <View className="mt-6 h-14 justify-center">
        <Skeleton className="h-9 w-40" />
      </View>
    </SkeletonRegion>
  );
}

export function SettleUpSkeleton() {
  return (
    <SkeletonRegion>
      <View className="mt-4 px-6">
        <SkeletonText size="xl" className="w-3/4" />
      </View>
      <View className="mt-8">
        {times(3).map((index) => (
          <View
            key={index}
            className={`flex-row items-center gap-4 px-6 py-5 ${index < 2 ? "border-b border-border" : ""}`}
          >
            <Skeleton className="size-12 rounded-full" />
            <View className="flex-1">
              <SkeletonText size="base" className="w-2/5" />
              <View className="mt-0.5">
                <SkeletonText size="xs" className="w-3/5" />
              </View>
            </View>
            <View className="w-16">
              <SkeletonText size="xs" align="end" className="w-10" />
              <SkeletonText size="base" align="end" className="w-16" />
            </View>
          </View>
        ))}
      </View>
    </SkeletonRegion>
  );
}

export function MemberBalanceRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRegion className="mt-10">
      {times(count).map((index) => (
        <View key={index} className="flex-row items-center gap-3 border-b border-border px-6 py-6">
          <Skeleton className="size-11 rounded-full" />
          <View className="flex-1">
            <SkeletonText size="base" className="w-4/5" />
          </View>
          <View className="-mr-2 size-10" />
        </View>
      ))}
    </SkeletonRegion>
  );
}

export function TotalsSkeleton() {
  return (
    <SkeletonRegion>
      <View className="mt-10 px-6">
        <View className="mx-10">
          <Skeleton className="aspect-[320/220] w-full rounded-lg" />
          <View className="mt-2">
            <SkeletonText size="xs" align="center" className="w-1/2" />
          </View>
        </View>
      </View>
      <View className="mt-16 px-6">
        <SkeletonText size="base" align="center" className="w-4/5" />
        <View className="mt-6 flex-row gap-4">
          {times(2).map((index) => (
            <View key={index} className="flex-1">
              <SkeletonText size="base" align="center" className="w-20" />
              <View className="mt-2">
                <SkeletonText size="2xl" align="center" className="w-24" />
              </View>
            </View>
          ))}
        </View>
      </View>
    </SkeletonRegion>
  );
}

export function PrivateSpendingHeaderSkeleton() {
  return (
    <SkeletonRegion className="mt-2">
      <SkeletonText size="xl" className="w-3/4" />
      <View className="mt-2">
        <SkeletonText size="sm" className="w-full" />
      </View>
    </SkeletonRegion>
  );
}

export function AvatarGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonRegion className="-mx-3 flex-row flex-wrap">
      {times(count).map((index) => (
        <View key={index} className="w-1/3 p-3">
          <Skeleton className="aspect-square w-full rounded-full" />
        </View>
      ))}
    </SkeletonRegion>
  );
}

export function MemberStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <SkeletonRegion className="flex-row gap-2">
      {times(count).map((index) => (
        <View key={index} className="w-[72px] items-center gap-2">
          <Skeleton className="size-12 rounded-full" />
          <View className="w-full">
            <SkeletonText size="xs" align="center" className="w-10" />
            <SkeletonText size="xs" align="center" className="w-6" />
          </View>
        </View>
      ))}
    </SkeletonRegion>
  );
}

export function ItemDetailSkeleton() {
  return (
    <SkeletonRegion>
      <View className="gap-6">
        <View className="h-10" />
        <View className="flex-row gap-3">
          <Skeleton className="size-12 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </View>
        <View className="flex-row items-center gap-3">
          <Skeleton className="h-12 w-20 rounded-xl" />
          <Skeleton className="h-12 w-20 rounded-xl" />
          <View className="flex-1" />
          <Skeleton className="h-12 w-36 rounded-xl" />
        </View>
        <Skeleton className="h-12 w-full rounded-xl" />
        <View className="flex-row gap-2">
          {times(3).map((index) => (
            <Skeleton key={index} className="h-10 flex-1 rounded-xl" />
          ))}
        </View>
      </View>
      <View className="mt-8 flex-row items-center gap-3 pb-4">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
      </View>
    </SkeletonRegion>
  );
}

export function InviteSkeleton() {
  return (
    <SkeletonRegion>
      <View className="pb-2">
        <SkeletonText size="sm" className="w-3/4" />
      </View>
      <View className="mt-6 flex-row items-center gap-6">
        <Skeleton className="size-32 rounded-lg" />
        <View className="flex-1">
          <SkeletonText size="sm" className="w-full" />
          <Skeleton className="mt-3 h-14 w-40 rounded-xl" />
          <View className="mt-2 h-10 items-end justify-center">
            <Skeleton className="h-4 w-20" />
          </View>
        </View>
      </View>
      <View className="mt-6 gap-3">
        <SkeletonText size="sm" className="w-28" />
        <Skeleton className="h-[54px] w-full rounded-2xl" />
      </View>
      <Skeleton className="mt-6 h-14 w-full rounded-xl" />
      <View className="mt-6">
        <SkeletonText size="sm" className="w-28" />
        <Skeleton className="mt-3 h-12 w-full rounded-xl" />
      </View>
      <View className="mt-8">
        <SkeletonText size="sm" className="w-32" />
        <ListRowsSkeleton count={3} className="mt-2" />
      </View>
    </SkeletonRegion>
  );
}

export function JoinPreviewSkeleton() {
  return (
    <SkeletonRegion>
      <SkeletonText size="2xl" className="w-2/3" />
      <View className="mt-0.5">
        <SkeletonText size="sm" className="w-1/2" />
      </View>
      <View className="mt-5 flex-row items-center">
        <Skeleton className="size-10 rounded-full" />
        <View className="ml-4 flex-1">
          <SkeletonText size="sm" className="w-24" />
        </View>
      </View>
      <View className="mt-5 border-t border-border pt-5">
        <SkeletonText size="sm" className="w-20" />
        <View className="mt-3 flex-row items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <SkeletonText size="base" className="w-32" />
        </View>
      </View>
      <View className="mt-6 gap-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </View>
    </SkeletonRegion>
  );
}

export function PageSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background px-6" style={{ paddingTop: insets.top + 12 }}>
      <View className="mb-8 mt-3">
        <SkeletonText size="xl" className="w-40" />
      </View>
      <ListRowsSkeleton count={6} />
    </View>
  );
}
