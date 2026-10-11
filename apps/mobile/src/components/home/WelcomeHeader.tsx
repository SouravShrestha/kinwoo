import { Text, View } from "react-native";

type WelcomeHeaderProps = {
  salutation: string;
  message: string;
};

export function WelcomeHeader({ salutation, message }: WelcomeHeaderProps) {
  return (
    <View className="mt-4 max-w-[70%]">
      <Text numberOfLines={1} className="font-display-normal text-lg text-muted-foreground">
        {salutation}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-0.5 font-display-normal text-2xl text-foreground tracking-wide"
      >
        {message}
      </Text>
    </View>
  );
}
