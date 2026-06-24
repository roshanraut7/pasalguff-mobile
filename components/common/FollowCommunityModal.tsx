import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type FollowCommunityModalProps = {
  visible: boolean;
  communityName?: string | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onFollow: () => void;
};

export default function FollowCommunityModal({
  visible,
  communityName,
  isSubmitting = false,
  onClose,
  onFollow,
}: FollowCommunityModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/55 px-5">
        <View className="relative w-full max-w-[360px] rounded-3xl bg-background p-5">
          {/* Close / Cross Button */}
          <Pressable
            disabled={isSubmitting}
            onPress={onClose}
            hitSlop={12}
            className="absolute right-4 top-4 z-10 h-9 w-9 items-center justify-center rounded-full bg-segment"
          >
            <Ionicons name="close" size={20} color="#6b7280" />
          </Pressable>

          <View className="mb-4 items-center pt-3">
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <Ionicons name="people-outline" size={28} color="#2563eb" />
            </View>

            <Text
              className="text-center text-foreground"
              style={{
                fontSize: 18,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Follow community first
            </Text>

            <Text
              className="mt-2 text-center text-muted"
              style={{
                fontSize: 13,
                lineHeight: 20,
                fontFamily: "Poppins_400Regular",
              }}
            >
              To comment, reply, or vote in{" "}
              {communityName ? `"${communityName}"` : "this community"}, you need
              to follow the community first.
            </Text>
          </View>

          <Pressable
            disabled={isSubmitting}
            onPress={onFollow}
            className="h-12 items-center justify-center rounded-2xl bg-accent"
            style={{
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                className="text-white"
                style={{
                  fontSize: 14,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                Follow Community
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={isSubmitting}
            onPress={onClose}
            className="mt-3 h-11 items-center justify-center rounded-2xl"
          >
            <Text
              className="text-muted"
              style={{
                fontSize: 14,
                fontFamily: "Poppins_500Medium",
              }}
            >
              Maybe later
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}