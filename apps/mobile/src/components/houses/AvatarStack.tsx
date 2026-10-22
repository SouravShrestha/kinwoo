import { Text, View } from "react-native";

import { Avatar } from "./Avatar";

const STACK_LIMIT = 3;

export function AvatarStack({
  members,
  total,
  size = 44,
  surface,
}: {
  members: { name: string | null; avatarUrl: string | null }[];
  total: number;
  size?: number;
  surface: "sheet" | "card";
}) {
  const shown = members.slice(0, STACK_LIMIT);
  const hidden = total - shown.length;
  const ring = surface === "card" ? "border-card" : "border-sheet";

  return (
    <View className="flex-row items-center">
      {shown.map((member, index) => (
        <View key={index} className={index === 0 ? "" : `-ml-2.5 rounded-full border-2 ${ring}`}>
          <Avatar
            name={member.name}
            url={member.avatarUrl}
            size={size}
            tone={surface === "card" ? "background" : "muted"}
          />
        </View>
      ))}
      {hidden > 0 ? (
        <View
          className={`-ml-2.5 items-center justify-center rounded-full border-2 bg-border ${ring}`}
          style={{ width: size + 4, height: size + 4 }}
        >
          <Text className="font-semibold text-foreground" style={{ fontSize: size * 0.32 }}>
            +{hidden}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
