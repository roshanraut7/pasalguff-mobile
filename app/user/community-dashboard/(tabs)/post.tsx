// app/user/community-dashboard/(tabs)/post.tsx

import { ScrollView, Text, View, Pressable } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

const posts = [
  { id: "1", title: "Welcome to our community", status: "Published" },
  { id: "2", title: "New offer available", status: "Published" },
  { id: "3", title: "Reported post example", status: "Reported" },
];

export default function PostScreen() {
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
        Posts
      </Text>

      {posts.map((post) => {
        const isReported = post.status === "Reported";

        return (
          <View
            key={post.id}
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
              {post.title}
            </Text>

            <Text
              style={{
                color: isReported ? colors.danger : colors.success,
                marginTop: 4,
                fontFamily: "Poppins_700Bold",
              }}
            >
              {post.status}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                style={{
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
                  View
                </Text>
              </Pressable>

              <Pressable
                style={{
                  backgroundColor: isReported
                    ? colors.danger
                    : colors.surfaceTertiary,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    color: isReported
                      ? colors.dangerForeground
                      : colors.accent,
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}