// app/user/community-dashboard/(tabs)/notifications.tsx

import { ScrollView, Text, View, Pressable } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

const notifications = [
  {
    id: "1",
    title: "New join request",
    description: "Someone requested to join this community.",
  },
  {
    id: "2",
    title: "Post reported",
    description: "A member reported a post.",
  },
  {
    id: "3",
    title: "New comment activity",
    description: "Your community post got new comments.",
  },
];

export default function NotificationsScreen() {
  const { colors } = useAppTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontSize: 22,
          fontFamily: "Poppins_700Bold",
          color: colors.foreground,
        }}
      >
        Notifications
      </Text>

      {notifications.map((item) => (
        <View
          key={item.id}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Poppins_700Bold",
              color: colors.foreground,
            }}
          >
            {item.title}
          </Text>

          <Text
            style={{
              color: colors.muted,
              marginTop: 4,
              fontFamily: "Poppins_400Regular",
            }}
          >
            {item.description}
          </Text>

          <Pressable
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              backgroundColor: colors.surfaceTertiary,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                color: colors.accent,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Review
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}