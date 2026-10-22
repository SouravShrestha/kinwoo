import { useActiveHouse, useJoinFlow } from "@kinwoo/client/houses";
import { inviteFailureCopy, memberCountLabel, memberDisplayName } from "@kinwoo/core/houses";
import { HousePinIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { useEffect, type ReactNode } from "react";
import { Text, View } from "react-native";

import { BottomSheet } from "../BottomSheet";
import { Button } from "../Button";
import { Avatar } from "./Avatar";
import { AvatarStack } from "./AvatarStack";
import { goHome } from "@/lib/house-navigation";
import { useTheme } from "@/theme/ThemeProvider";

export function JoinPreviewSheet({
  code,
  open,
  onClose,
}: {
  code: string;
  open: boolean;
  onClose: () => void;
}) {
  const { setActiveHouse } = useActiveHouse();
  const flow = useJoinFlow(code, goHome);

  const alreadyMemberOf = flow.preview?.status === "already_member" ? flow.preview.houseId : null;

  // Already in this house: there is nothing to confirm, so go straight to it.
  useEffect(() => {
    if (!alreadyMemberOf) return;
    setActiveHouse(alreadyMemberOf);
    goHome();
  }, [alreadyMemberOf, setActiveHouse]);

  const visible = open && !flow.loading && !alreadyMemberOf;

  return (
    <BottomSheet open={visible} onClose={onClose} label="Join a house" scrollable={false}>
      <SheetBody flow={flow} onClose={onClose} />
    </BottomSheet>
  );
}

function SheetBody({
  flow,
  onClose,
}: {
  flow: ReturnType<typeof useJoinFlow>;
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();

  if (flow.loadError) {
    return (
      <Notice title="Couldn't check that code" message={flow.loadError}>
        <Button label="Try another code" variant="outline" onPress={onClose} />
      </Notice>
    );
  }

  if (flow.failure) {
    const copy = inviteFailureCopy(flow.failure);

    return (
      <Notice title={copy.title} message={copy.message}>
        <Button label="Try another code" variant="outline" onPress={onClose} />
      </Notice>
    );
  }

  if (flow.requested) {
    return (
      <Notice
        title="Request sent"
        message="An admin needs to approve you before you can see this house."
      >
        <Button label="Done" onPress={goHome} />
      </Notice>
    );
  }

  const preview = flow.preview;
  if (!preview) return null;

  return (
    <View>
      <View accessibilityRole="header">
        <View className="flex-row items-center gap-1.5">
          <HousePinIcon size={18} color={colors[resolvedTheme].foreground} />
          <Text numberOfLines={1} className="shrink font-display-medium text-2xl text-foreground">
            {preview.name}
          </Text>
        </View>
        {preview.address ? (
          <Text
            numberOfLines={1}
            className="mt-0.5 text-sm text-muted-foreground font-display-normal"
          >
            {preview.address}
          </Text>
        ) : null}
      </View>

      <View className="mt-5 flex-row items-center">
        <AvatarStack members={preview.members} total={preview.memberCount} surface="sheet" />
        <Text className="ml-4 text-sm text-muted-foreground">
          {memberCountLabel(preview.memberCount)}
        </Text>
      </View>

      {preview.invitedBy ? (
        <View className="mt-5 border-t border-border pt-5">
          <Text className="text-sm text-muted-foreground font-display-normal">Invited by</Text>
          <View className="mt-3 flex-row items-center">
            <Avatar name={preview.invitedBy} url={preview.invitedByAvatarUrl} size={44} />
            <Text
              className="ml-3 flex-1 text-base font-display-normal text-foreground"
              numberOfLines={1}
            >
              {memberDisplayName(preview.invitedBy)}
            </Text>
          </View>
        </View>
      ) : null}

      <View className="mt-6 gap-3">
        <Button
          label={preview.requiresApproval ? "Request to join" : "Join house"}
          loading={flow.joining}
          onPress={() => void flow.join()}
        />
        <Button
          label="Cancel"
          variant="outline"
          labelWeight="normal"
          disabled={flow.joining}
          onPress={onClose}
        />
      </View>
    </View>
  );
}

function Notice({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <View>
      <Text className="font-display font-medium text-2xl text-foreground">{title}</Text>
      <Text className="mt-2 text-base text-muted-foreground">{message}</Text>
      <View className="mt-6">{children}</View>
    </View>
  );
}
