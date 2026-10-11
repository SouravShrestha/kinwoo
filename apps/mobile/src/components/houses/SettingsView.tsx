import { useAuth } from "@kinwoo/client/auth";
import { useHouseMembers, useHouseSettingsForm, type MemberConfirm } from "@kinwoo/client/houses";
import {
  DANGER_ZONE_TITLE,
  HOUSE_ADDRESS_MAX_LENGTH,
  HOUSE_NAME_MAX_LENGTH,
  leaveState,
  type HouseMembership,
} from "@kinwoo/core/houses";
import { Text, View } from "react-native";

import { Button } from "../Button";
import { Field } from "./Field";
import { LeaveAction } from "./LeaveAction";
import { SheetHeader } from "./SheetHeader";

export function SettingsView({
  membership,
  confirm,
  onBack,
  onSaved,
}: {
  membership: HouseMembership;
  confirm: MemberConfirm;
  onBack?: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const members = useHouseMembers(membership.house.id);
  const form = useHouseSettingsForm(membership.house, onSaved);
  const isAdmin = membership.role === "admin";
  const locked = !isAdmin || form.submitting;
  const leave = members.data && user ? leaveState(members.data, user.id) : null;

  return (
    <View>
      <SheetHeader onBack={onBack} />
      {!isAdmin ? (
        <Text className="mt-4 text-sm text-muted-foreground">
          Only admins can change the house details.
        </Text>
      ) : null}

      <Field
        inSheet
        className="mt-8"
        label="House name"
        value={form.name}
        onChangeText={form.setName}
        maxLength={HOUSE_NAME_MAX_LENGTH}
        autoCapitalize="words"
        error={form.errors.name}
        disabled={locked}
      />
      <Field
        inSheet
        className="mt-4"
        label="Address"
        value={form.address}
        onChangeText={form.setAddress}
        maxLength={HOUSE_ADDRESS_MAX_LENGTH}
        autoCapitalize="words"
        error={form.errors.address}
        disabled={locked}
      />

      {isAdmin ? (
        <Button
          className="mt-6"
          label="Save changes"
          loading={form.submitting}
          disabled={!form.dirty}
          onPress={form.submit}
        />
      ) : null}

      {leave ? (
        <View className="mt-12 border-t border-border pt-6">
          <Text className="mb-2 text-sm font-display-medium text-destructive">
            {DANGER_ZONE_TITLE}
          </Text>
          <LeaveAction state={leave} onPress={confirm.askLeave} />
        </View>
      ) : null}
    </View>
  );
}
