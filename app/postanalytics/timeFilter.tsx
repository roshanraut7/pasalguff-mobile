import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/hooks/useAppTheme";
import type { PostInsightTimeRange } from "@/types/analytics";

type TimeRangeOption = {
  label: string;
  value: PostInsightTimeRange;
};

type PostInsightsTimeFilterProps = {
  value: PostInsightTimeRange;
  onChange: (value: PostInsightTimeRange) => void;
};

export const POST_INSIGHT_TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  {
    label: "Last 7 days",
    value: "LAST_7_DAYS",
  },
  {
    label: "Last 30 days",
    value: "LAST_30_DAYS",
  },
  {
    label: "Last 90 days",
    value: "LAST_90_DAYS",
  },
  {
    label: "All time",
    value: "ALL_TIME",
  },
];

export function getPostInsightTimeRangeLabel(
  value: PostInsightTimeRange,
) {
  return (
    POST_INSIGHT_TIME_RANGE_OPTIONS.find(
      (option) => option.value === value,
    )?.label ?? "Last 7 days"
  );
}

export default function PostInsightsTimeFilter({
  value,
  onChange,
}: PostInsightsTimeFilterProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [visible, setVisible] = useState(false);

  const selectedLabel = getPostInsightTimeRangeLabel(value);

  const handleSelect = (nextValue: PostInsightTimeRange) => {
    onChange(nextValue);
    setVisible(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.triggerButton,
          {
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={15}
          color={colors.accent}
        />

        <Text style={styles.triggerText}>{selectedLabel}</Text>

        <Ionicons
          name="chevron-down"
          size={14}
          color={colors.accent}
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setVisible(false)}
        >
          <Pressable style={styles.modalCard}>
            <View style={styles.handle} />

            <Text style={styles.modalTitle}>Select time period</Text>

            <View style={styles.optionList}>
              {POST_INSIGHT_TIME_RANGE_OPTIONS.map((option) => {
                const isSelected = option.value === value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleSelect(option.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isSelected ? styles.optionRowSelected : undefined,
                      {
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.optionIcon,
                          isSelected
                            ? styles.optionIconSelected
                            : undefined,
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={17}
                          color={
                            isSelected
                              ? colors.accentForeground
                              : colors.accent
                          }
                        />
                      </View>

                      <Text style={styles.optionText}>
                        {option.label}
                      </Text>
                    </View>

                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.accent}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    triggerButton: {
      minHeight: 38,
      paddingHorizontal: 11,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    triggerText: {
      color: colors.accent,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_700Bold",
    },

    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.35)",
    },

    modalCard: {
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 28,
      backgroundColor: colors.background,
    },

    handle: {
      width: 42,
      height: 5,
      borderRadius: 999,
      alignSelf: "center",
      marginBottom: 16,
      backgroundColor: colors.border,
    },

    modalTitle: {
      color: colors.foreground,
      fontSize: 18,
      lineHeight: 25,
      fontFamily: "Poppins_700Bold",
      textAlign: "center",
    },

    optionList: {
      marginTop: 18,
      gap: 10,
    },

    optionRow: {
      minHeight: 60,
      paddingHorizontal: 12,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    optionRowSelected: {
      borderColor: colors.accent,
    },

    optionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    optionIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    optionIconSelected: {
      backgroundColor: colors.accent,
    },

    optionText: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_700Bold",
    },
  });
}