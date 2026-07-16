import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import type { VerificationTrack } from "@/store/api/verificationApi";

type VerifiedBadgeProps = {
  track?: VerificationTrack | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const TRACK_COLORS: Record<VerificationTrack, string> = {
  BUSINESS: "#F5A623", // gold - company/vendor
  INDIVIDUAL: "#3B82F6", // blue - normal user
  TRAINING: "#22C55E", // green - instructor/trainer/trainee
  //  BUSINESS:"#22C55E", 
};

/**
 * Small verified checkmark badge. Drop this right next to a
 * displayName anywhere a user's name is shown (profile header,
 * follower/following cards, post author line, etc).
 *
 * Renders nothing if the user isn't verified — safe to always
 * mount unconditionally with `track={profile.verificationTrack}`
 * only when `profile.isVerified` is true.
 */
export default function VerifiedBadge({
  track,
  size = 15,
  style,
}: VerifiedBadgeProps) {
  if (!track) return null;

  const color = TRACK_COLORS[track] ?? TRACK_COLORS.INDIVIDUAL;

  return (
    <View style={style}>
      <MaterialIcons name="verified" size={size} color={color} />
    </View>
  );
}