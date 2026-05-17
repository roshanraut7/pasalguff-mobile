import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import { LineChart } from "react-native-gifted-charts";

import { useAppTheme } from "@/hooks/useAppTheme";
import AdminKpiCard from "@/components/common/Kpi-card";
import { useGetCommunityDashboardOverviewQuery } from "@/store/api/communityApi";

type ChartPoint = {
  value: number;
  label: string;
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function cloneGrowthData(data?: { value: number; label: string }[]): ChartPoint[] {
  return (data ?? []).map((item) => ({
    value: Number(item.value) || 0,
    label: String(item.label ?? ""),
  }));
}

export default function CommunityDashboardScreen() {
  const { colors, isDark } = useAppTheme();

  const localParams = useLocalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const globalParams = useGlobalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const communityId =
    getParamValue(localParams.communityId) ||
    getParamValue(globalParams.communityId) ||
    getParamValue(localParams.id) ||
    getParamValue(globalParams.id);

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useGetCommunityDashboardOverviewQuery(communityId, {
    skip: !communityId,
    refetchOnMountOrArgChange: true,
  });

  /**
   * IMPORTANT:
   * react-native-gifted-charts mutates chart data internally.
   * RTK Query response data is frozen in development.
   * So never pass dashboard.growth.members/posts directly to LineChart.
   */
  const memberGrowthData = useMemo(
    () => cloneGrowthData(dashboard?.growth.members),
    [dashboard?.growth.members],
  );

  const postGrowthData = useMemo(
    () => cloneGrowthData(dashboard?.growth.posts),
    [dashboard?.growth.posts],
  );

  const maxChartValue = useMemo(() => {
    const values = [...memberGrowthData, ...postGrowthData].map(
      (item) => item.value,
    );

    const max = Math.max(...values, 1);

    return Math.max(5, Math.ceil(max + max * 0.25));
  }, [memberGrowthData, postGrowthData]);

  const hasChartData =
    memberGrowthData.length > 0 || postGrowthData.length > 0;

  async function handlePullRefresh() {
    setIsPullRefreshing(true);

    try {
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }

  if (!communityId) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={30} color={colors.warning} />

        <Text style={[styles.centerTitle, { color: colors.foreground }]}>
          Community ID missing
        </Text>

        <Text style={[styles.centerSubtitle, { color: colors.muted }]}>
          Open this dashboard with communityId in route params.
        </Text>
      </View>
    );
  }

  if (isLoading && !dashboard) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />

        <Text style={[styles.centerSubtitle, { color: colors.muted }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={handlePullRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.welcomeText, { color: colors.foreground }]}>
            Welcome back
          </Text>

          <Text style={[styles.welcomeSubText, { color: colors.muted }]}>
            {dashboard?.community.name
              ? `Here is ${dashboard.community.name} overview.`
              : "Here is your community overview."}
          </Text>
        </View>
      </View>

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={colors.danger}
          />

          <View style={{ flex: 1 }}>
            <Text style={[styles.errorTitle, { color: colors.danger }]}>
              Failed to load dashboard
            </Text>

            <Text style={[styles.errorMessage, { color: colors.muted }]}>
              Please check your access or try again.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.kpiGrid}>
        <AdminKpiCard
          title="Members"
          value={dashboard?.kpis.members ?? 0}
          icon="people-outline"
        />

        <AdminKpiCard
          title="Posts"
          value={dashboard?.kpis.posts ?? 0}
          icon="newspaper-outline"
        />

        <AdminKpiCard
          title="Banned"
          value={dashboard?.kpis.banned ?? 0}
          icon="ban-outline"
        />

        <AdminKpiCard
          title="Moderators"
          value={dashboard?.kpis.moderators ?? 0}
          icon="shield-checkmark-outline"
        />
      </View>

      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.chartHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Growth Overview
          </Text>

          <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
            Real monthly member and post growth for this community.
          </Text>
        </View>

        {!hasChartData ? (
          <View
            style={[
              styles.emptyChartBox,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="bar-chart-outline" size={28} color={colors.muted} />

            <Text style={[styles.emptyChartText, { color: colors.muted }]}>
              No growth data found yet.
            </Text>
          </View>
        ) : (
          <View style={styles.chartWrap}>
            <LineChart
              data={memberGrowthData}
              data2={postGrowthData}
              height={230}
              width={320}
              spacing={68}
              initialSpacing={0}
              endSpacing={0}
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
              maxValue={maxChartValue}
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
            />
          </View>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.accent }]}
            />

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

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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

  errorBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 10,
  },

  errorTitle: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },

  errorMessage: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  chartCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },

  chartHeader: {
    padding: 16,
    paddingBottom: 0,
  },

  sectionTitle: {
    fontSize: 19,
    fontFamily: "Poppins_700Bold",
  },

  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  chartWrap: {
    marginTop: 16,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    overflow: "hidden",
  },

  emptyChartBox: {
    marginTop: 16,
    marginHorizontal: 16,
    height: 220,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emptyChartText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },

  legendRow: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
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

  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  centerTitle: {
    marginTop: 12,
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  centerSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
});