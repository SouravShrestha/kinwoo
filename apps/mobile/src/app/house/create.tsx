import { useCreateHouseForm } from "@kinwoo/client/houses";
import {
  CREATE_HOUSE_SUBTITLE,
  HOUSE_ADDRESS_MAX_LENGTH,
  HOUSE_NAME_MAX_LENGTH,
  HOUSE_SCREEN_TITLES,
} from "@kinwoo/core/houses";
import { HousePinIcon } from "@kinwoo/icons/native";
import { colors } from "@kinwoo/tokens/native";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Field } from "@/components/houses/Field";
import { HouseLimitNotice } from "@/components/houses/HouseLimitNotice";
import { HouseScreen } from "@/components/houses/HouseScreen";
import { CreateHouseSkeleton } from "@/components/skeleton/skeletons";
import { useTheme } from "@/theme/ThemeProvider";

export default function CreateHouseScreen() {
  const form = useCreateHouseForm(() => router.replace("/house/invite"));
  const { resolvedTheme } = useTheme();

  return (
    <HouseScreen
      title={HOUSE_SCREEN_TITLES.create}
      scrollOnlyWithKeyboard
      noBack={form.blocked}
      hero={form.blocked ? undefined : { heading: HOUSE_SCREEN_TITLES.create }}
    >
      {form.checking ? (
        <CreateHouseSkeleton />
      ) : form.blocked ? (
        <HouseLimitNotice message={form.blockedMessage} />
      ) : (
        <View>
          <Text className="mb-10 text-sm text-muted-foreground font-display-normal">
            {CREATE_HOUSE_SUBTITLE}
          </Text>

          <Field
            label="House name"
            value={form.name}
            onChangeText={form.setName}
            placeholder="e.g. Sharma Niwas"
            maxLength={HOUSE_NAME_MAX_LENGTH}
            autoCapitalize="words"
            error={form.errors.name}
            disabled={form.submitting}
          />
          <Field
            className="mt-6"
            label="Address"
            icon={<HousePinIcon size={20} color={colors[resolvedTheme].mutedForeground} />}
            value={form.address}
            onChangeText={form.setAddress}
            placeholder="e.g. Flat 302, Sunshine Apartments, Koramangala, Bengaluru"
            maxLength={HOUSE_ADDRESS_MAX_LENGTH}
            autoCapitalize="words"
            error={form.errors.address}
            disabled={form.submitting}
          />

          <Button
            className="mt-10"
            label="Create house"
            loading={form.submitting}
            onPress={form.submit}
          />
        </View>
      )}
    </HouseScreen>
  );
}
