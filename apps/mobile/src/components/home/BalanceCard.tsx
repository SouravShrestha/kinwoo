import { balanceHeadline, balanceHeadlineParts, type HouseBalances } from "@kinwoo/core/expenses";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Text, View } from "react-native";

import { Pressable } from "@/components/Pressable";
import { santa } from "@/lib/images";

// Autoplay once per app open; later mounts show a still frame until tapped.
let autoplayed = false;

const LEAD = { owed: "You're owed", owe: "You owe" } as const;

export function HeroCard({ onReplay, children }: { onReplay?: () => void; children: ReactNode }) {
  // Remounting the image restarts its two-loop animation.
  const [plays, setPlays] = useState(0);
  const [still] = useState(autoplayed);
  useEffect(() => {
    autoplayed = true;
  }, []);

  return (
    <View className="w-full items-center gap-3 px-3 pb-7 pt-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Replay animation"
        allowDoublePress
        onPress={() => {
          setPlays((n) => n + 1);
          onReplay?.();
        }}
        className="active:opacity-100"
      >
        <Image
          key={plays}
          source={santa}
          autoplay={!still || plays > 0}
          accessibilityIgnoresInvertColors
          style={{ width: 72, height: 72 }}
        />
      </Pressable>
      {children}
    </View>
  );
}

export function BalanceCard({
  balances,
  onReplay,
}: {
  balances: HouseBalances;
  onReplay?: () => void;
}) {
  const text = balanceHeadlineParts(balances);
  return (
    <HeroCard onReplay={onReplay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${balanceHeadline(balances)}. Open bills`}
        onPress={() => router.push("/bills")}
        className="items-center gap-0.5 active:opacity-80"
      >
        <Text className="text-center font-display-medium text-sm leading-[18px] text-foreground">
          {text.tone === "neutral" ? text.before.trim() : LEAD[text.tone]}
        </Text>
        {text.amount ? (
          <Text className="font-display-medium text-[26px] leading-10 tracking-[-0.52px] text-foreground">
            {text.amount}
          </Text>
        ) : null}
        <Text className="text-center font-display-medium text-xs text-muted-foreground">
          Across all your shared bills
        </Text>
      </Pressable>
    </HeroCard>
  );
}
