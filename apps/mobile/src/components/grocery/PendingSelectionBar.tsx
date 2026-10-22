import { colors } from "@kinwoo/tokens/native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { Easing, FadeInDown, FadeOutDown, ReduceMotion } from "react-native-reanimated";

import { Button } from "@/components/Button";
import { Avatar } from "@/components/houses/Avatar";
import { useTheme } from "@/theme/ThemeProvider";

import {
  AssignMemberStrip,
  ExpandCaret,
  MEMBER_STRIP_HEIGHT,
  useExpandProgress,
} from "./AssignMemberStrip";
import { useAssignToMember } from "./useAssignToMember";

const BAR_ROW_HEIGHT = 92;
const BUTTON_AVATAR_SIZE = 24;

const ENTERING = FadeInDown.duration(220)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const EXITING = FadeOutDown.duration(160).reduceMotion(ReduceMotion.System);

export function pendingSelectionBarHeight(isPrivateList: boolean) {
  return isPrivateList ? BAR_ROW_HEIGHT : BAR_ROW_HEIGHT + MEMBER_STRIP_HEIGHT;
}

export function PendingSelectionBar({
  houseId,
  listId,
  itemIds,
  isPrivateList,
  onAssigned,
  onAssignToMe,
}: {
  houseId: string;
  listId: string;
  itemIds: string[];
  isPrivateList: boolean;
  onAssigned: () => void;
  onAssignToMe: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const palette = colors[resolvedTheme];
  const [expanded, setExpanded] = useState(false);
  const progress = useExpandProgress(expanded);

  const { members, self, isLoading, assign, isAssigning } = useAssignToMember({
    houseId,
    listId,
    itemIds,
    onAssigned,
  });

  return (
    <Animated.View
      entering={ENTERING}
      exiting={EXITING}
      className="absolute inset-x-0 bottom-0 border-t border-border bg-background"
    >
      {isPrivateList ? null : (
        <AssignMemberStrip
          progress={progress}
          expanded={expanded}
          members={members}
          isLoading={isLoading}
          isAssigning={isAssigning}
          onPick={(memberId, name) => void assign(memberId, name)}
        />
      )}

      <View className="flex-row gap-3 px-5 pb-5 pt-5" style={{ height: BAR_ROW_HEIGHT }}>
        {isPrivateList ? null : (
          <Button
            label="Someone else"
            variant="outline"
            accessibilityLabel="Assign to others"
            iconEnd={<ExpandCaret progress={progress} color={palette.foreground} />}
            onPress={() => setExpanded((value) => !value)}
            accessibilityState={{ expanded }}
            className="h-12 flex-1"
          />
        )}
        <Button
          label="Assign to me"
          onPress={onAssignToMe}
          icon={
            self ? (
              <Avatar name={self.displayName} url={self.avatarUrl} size={BUTTON_AVATAR_SIZE} />
            ) : undefined
          }
          className="h-12 flex-1"
        />
      </View>
    </Animated.View>
  );
}
