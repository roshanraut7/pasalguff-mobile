import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";

/**
 * tier system — the core senior UX decision:
 *
 * "action"  — things that change member state (Join Requests, Manage Members)
 *              violet tint. These are high-frequency moderator tasks.
 *
 * "content" — things that manage posts/comments
 *              amber tint. Medium frequency.
 *
 * "risk"    — things with destructive potential (Reports, Bans)
 *              rose tint. Needs to stand out so the mod sees it fast.
 *
 * "config"  — settings, low urgency, shouldn't draw attention
 *              neutral. Visually receded on purpose.
 */
export type MenuItemTier = "action" | "content" | "risk" | "config";

interface ModerationMenuItemProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useAppTheme>["colors"];
  onPress: () => void;
  tier?: MenuItemTier;
  /** Optional badge count — shows a small pill (e.g. pending count) */
  badge?: number;
}

const TIER_TOKENS = {
  action:  { accent: "#818CF8", bg: "#818CF80D", iconBg: "#818CF815" },
  content: { accent: "#FBBF24", bg: "#FBBF240D", iconBg: "#FBBF2415" },
  risk:    { accent: "#FB7185", bg: "#FB71850D", iconBg: "#FB718515" },
  config:  { accent: null,      bg: null,        iconBg: null        },
} as const;

export default function ModerationMenuItem({
  title,
  description,
  icon,
  colors,
  onPress,
  tier = "config",
  badge,
}: ModerationMenuItemProps) {
  const t = TIER_TOKENS[tier];
  const accentColor = t.accent  ?? colors.accent;
  const iconBgColor = t.iconBg  ?? colors.surfaceSecondary;
  const rowBgColor  = t.bg      ?? "transparent";

  const hasBadge = typeof badge === "number" && badge > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {/*
        LEFT ACCENT STRIP — 3px tall strip along the left edge.
        This is the same left-border language as the KPI card so the
        two components speak the same visual dialect.
        It tells the moderator: "this item belongs to the same category
        as the [violet/amber/rose] KPI card above."
        System consistency = reduced cognitive load.
      */}
      <View
        style={[
          styles.accentStrip,
          { backgroundColor: accentColor },
        ]}
      />

      {/*
        ICON — square-rounded badge (not circle).
        Circle icons are the most overused pattern in mobile UI.
        Squircle (borderRadius: 12) is more modern, feels more native to
        iOS 14+ app icons, and differentiates the management section
        from the circular back button in the header.
      */}
      <View
        style={[
          styles.iconBadge,
          { backgroundColor: iconBgColor },
        ]}
      >
        <Ionicons name={icon} size={19} color={accentColor} />
      </View>

      {/* TEXT BLOCK */}
      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {/*
            BADGE PILL — shows live count inline with title.
            A senior dev note: this is better UX than a separate
            "3 pending" text below, because the eye sees title + count
            in one fixation. Used by Slack, GitHub, Linear.
          */}
          {hasBadge && (
            <View
              style={[
                styles.badgePill,
                { backgroundColor: accentColor + "22" },
              ]}
            >
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {badge! > 99 ? "99+" : badge}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.description, { color: colors.muted }]}
          numberOfLines={1}
        >
          {description}
        </Text>
      </View>

      {/*
        CHEVRON — right side. Kept at 16px and colors.muted.
        It should whisper "tappable", not shout.
        A senior designer removes the chevron from config items sometimes
        but here we keep it for consistency — users need to know ALL items navigate.
      */}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
    paddingRight: 15,
    paddingLeft: 0,          // left padding handled by accentStrip + gap
    gap: 13,
    overflow: "hidden",
  },

  accentStrip: {
    width: 3,
    alignSelf: "stretch",
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },

  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,        // squircle — not a circle
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  textBlock: {
    flex: 1,
    gap: 3,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  title: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    includeFontPadding: false,
  },

  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },

  badgeText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    includeFontPadding: false,
  },

  description: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 17,
  },
});