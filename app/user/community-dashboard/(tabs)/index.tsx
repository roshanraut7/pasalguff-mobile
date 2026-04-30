// app/user/community-dashboard/(tabs)/index.tsx

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { useAppTheme } from "@/hooks/useAppTheme";
import AdminKpiCard from "@/components/common/Kpi-card";

const memberGrowthData = [
  { value: 80, label: "Jan" },
  { value: 120, label: "Feb" },
  { value: 160, label: "Mar" },
  { value: 210, label: "Apr" },
  { value: 245, label: "May" },
];

const postGrowthData = [
  { value: 18, label: "Jan" },
  { value: 34, label: "Feb" },
  { value: 49, label: "Mar" },
  { value: 71, label: "Apr" },
  { value: 89, label: "May" },
];

export default function CommunityDashboardScreen() {
  const { colors, isDark } = useAppTheme();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={[styles.welcomeText, { color: colors.foreground }]}>
          Welcome back, Admin
        </Text>

        <Text style={[styles.welcomeSubText, { color: colors.muted }]}>
          Here is your community overview.
        </Text>
      </View>

      <View style={styles.kpiGrid}>
        <AdminKpiCard title="Members" value={245} icon="people-outline" />
        <AdminKpiCard title="Posts" value={89} icon="newspaper-outline" />
        <AdminKpiCard title="Banned" value={8} icon="ban-outline" />
        <AdminKpiCard
          title="Moderators"
          value={4}
          icon="shield-checkmark-outline"
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Growth Overview
      </Text>

      <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
        Monthly member and post growth comparison.
      </Text>

      <LineChart
        data={memberGrowthData}
        data2={postGrowthData}
        height={230}
        width={320}
        spacing={68}
        initialSpacing={16}
        endSpacing={18}
        thickness={3}
        thickness2={3}
        color={colors.accent}
        color2={colors.warning}
        dataPointsColor={colors.accent}
        dataPointsColor2={colors.warning}
        dataPointsRadius={4}
        dataPointsRadius2={4}
        curved
        areaChart
        startFillColor={colors.accent}
        endFillColor={colors.accent}
        startOpacity={isDark ? 0.22 : 0.18}
        endOpacity={0.02}
        startFillColor2={colors.warning}
        endFillColor2={colors.warning}
        startOpacity2={isDark ? 0.18 : 0.14}
        endOpacity2={0.02}
        noOfSections={5}
        maxValue={260}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={colors.border}
        rulesColor={colors.separator}
        rulesType="solid"
        yAxisTextStyle={{
          color: colors.muted,
          fontSize: 11,
          fontFamily: "Poppins_400Regular",
        }}
        xAxisLabelTextStyle={{
          color: colors.muted,
          fontSize: 11,
          fontFamily: "Poppins_400Regular",
        }}
        pointerConfig={{
          pointerStripColor: colors.border,
          pointerStripWidth: 1,
          pointerColor: colors.accent,
          radius: 5,
          pointerLabelWidth: 90,
          pointerLabelHeight: 54,
          activatePointersOnLongPress: true,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: any[]) => (
            <View
              style={[
                styles.pointerBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.pointerText, { color: colors.foreground }]}>
                Members: {items?.[0]?.value ?? "-"}
              </Text>

              <Text style={[styles.pointerText, { color: colors.foreground }]}>
                Posts: {items?.[1]?.value ?? "-"}
              </Text>
            </View>
          ),
        }}
      />

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.legendText, { color: colors.muted }]}>
            Members
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: colors.warning }]}
          />
          <Text style={[styles.legendText, { color: colors.muted }]}>
            Posts
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 140,
    gap: 16,
  },

  welcomeText: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
  },

  welcomeSubText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  sectionTitle: {
    marginTop: 4,
    fontSize: 19,
    fontFamily: "Poppins_700Bold",
  },

  sectionSubtitle: {
    marginTop: -10,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  legendRow: {
    marginTop: -4,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },

  pointerBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },

  pointerText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
});