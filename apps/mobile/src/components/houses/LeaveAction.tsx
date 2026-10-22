import { leaveActionLabel, leaveNote, type LeaveState } from "@kinwoo/core/houses";
import { Text, View } from "react-native";

import { Button } from "../Button";

export function LeaveAction({ state, onPress }: { state: LeaveState; onPress: () => void }) {
  const note = leaveNote(state);

  return (
    <View>
      {note ? <Text className="mb-5 text-sm text-muted-foreground">{note}</Text> : <Text />}
      <Button
        variant="destructive"
        label={leaveActionLabel(state)}
        disabled={state === "needs_admin"}
        onPress={onPress}
      />
    </View>
  );
}
