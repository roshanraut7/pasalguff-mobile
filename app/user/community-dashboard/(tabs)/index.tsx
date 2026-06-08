import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import { BarChart } from "react-native-gifted-charts";

import { useAppTheme } from "@/hooks/useAppTheme";
import AdminKpiCard from "@/components/common/Kpi-card";
import { useGetCommunityDashboardOverviewQuery } from "@/store/api/communityApi";

type ChartPoint = {
  value: number;
  label: string;
};

type DashboardYearOption = {
  key: string;
  label: string;
  subtitle: string;
  year: number;
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

function getNiceStepValue(maxValue: number) {
  if (maxValue <= 5) return 1;
  if (maxValue <= 10) return 2;
  if (maxValue <= 25) return 5;
  if (maxValue <= 50) return 10;
  if (maxValue <= 100) return 20;

  return Math.ceil(maxValue / 5 / 10) * 10;
}

function formatWholeNumber(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return value;

  return String(Math.round(parsed));
}

export default function CommunityDashboardScreen() {
  const { colors } = useAppTheme();

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

  const currentYear = new Date().getFullYear();

  const yearOptions = useMemo<DashboardYearOption[]>(() => {
    return Array.from({ length: 5 }, (_, index) => {
      const year = currentYear - index;

      return {
        key: String(year),
        label: String(year),
        subtitle: `Shows monthly growth from January to December ${year}`,
        year,
      };
    });
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useGetCommunityDashboardOverviewQuery(
    {
      communityId,
      year: selectedYear,
    },
    {
      skip: !communityId,
      refetchOnMountOrArgChange: true,
    },
  );

  const memberGrowthData = useMemo(
    () => cloneGrowthData(dashboard?.growth.members),
    [dashboard?.growth.members],
  );

  const postGrowthData = useMemo(
    () => cloneGrowthData(dashboard?.growth.posts),
    [dashboard?.growth.posts],
  );

  /**
   * Bar chart format:
   * Each month has two bars:
   * - first bar: Members
   * - second bar: Posts
   */
  const groupedBarData = useMemo(() => {
    return memberGrowthData.flatMap((memberItem, index) => {
      const postItem = postGrowthData[index];
      const memberBarIndex = index * 2;
      const postBarIndex = index * 2 + 1;

      return [
        {
          value: memberItem.value,
          label: memberItem.label,
          frontColor: colors.accent,
          spacing: 5,
          labelWidth: 46,
          labelTextStyle: {
            color: colors.muted,
            fontSize: 11,
            fontFamily: "Poppins_400Regular",
          },
          topLabelComponent:
            selectedBarIndex === memberBarIndex
              ? () => (
                  <View
                    style={[
                      styles.barValuePill,
                      { backgroundColor: colors.foreground },
                    ]}
                  >
                    <Text
                      style={[
                        styles.barValueText,
                        { color: colors.background },
                      ]}
                    >
                      {memberItem.value}
                    </Text>
                  </View>
                )
              : undefined,
        },
        {
          value: postItem?.value ?? 0,
          frontColor: colors.warning,
          spacing: 24,
          topLabelComponent:
            selectedBarIndex === postBarIndex
              ? () => (
                  <View
                    style={[
                      styles.barValuePill,
                      { backgroundColor: colors.foreground },
                    ]}
                  >
                    <Text
                      style={[
                        styles.barValueText,
                        { color: colors.background },
                      ]}
                    >
                      {postItem?.value ?? 0}
                    </Text>
                  </View>
                )
              : undefined,
        },
      ];
    });
  }, [
    memberGrowthData,
    postGrowthData,
    selectedBarIndex,
    colors.accent,
    colors.warning,
    colors.muted,
    colors.foreground,
    colors.background,
  ]);

  const chartMaxRawValue = useMemo(() => {
    const values = groupedBarData.map((item) => item.value);
    return Math.max(...values, 1);
  }, [groupedBarData]);

  const chartStepValue = useMemo(() => {
    return getNiceStepValue(chartMaxRawValue);
  }, [chartMaxRawValue]);

  const maxChartValue = useMemo(() => {
    return chartStepValue * 5;
  }, [chartStepValue]);

  const hasChartData = groupedBarData.some((item) => item.value > 0);

  const chartPointCount = Math.max(
    memberGrowthData.length,
    postGrowthData.length,
    1,
  );

  /**
   * Bigger width because 12 months = 24 bars.
   * This prevents December from being hidden.
   */
  const chartWidth = Math.max(900, chartPointCount * 76);

  const chartSubtitle = `Monthly members and posts growth for ${selectedYear}.`;

  function handleSelectYear(option: DashboardYearOption) {
    setSelectedYear(option.year);
    setSelectedBarIndex(null);
    setIsFilterOpen(false);
  }

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
    <>
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
            <View style={styles.chartTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Growth Overview
                </Text>

                <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                  {chartSubtitle}
                </Text>
              </View>

              <Pressable
                onPress={() => setIsFilterOpen(true)}
                style={[
                  styles.compactSelect,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.compactSelectText, { color: colors.foreground }]}
                >
                  {selectedYear}
                </Text>

                <Ionicons name="chevron-down" size={16} color={colors.muted} />
              </Pressable>
            </View>
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
                No growth data found for {selectedYear}.
              </Text>
            </View>
          ) : (
            <View style={styles.chartWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chartScrollContent}
              >
                <BarChart
                  data={groupedBarData}
                  height={230}
                  width={chartWidth}
                  barWidth={18}
                  initialSpacing={20}
                  endSpacing={42}
                  roundedTop
                  roundedBottom
                  maxValue={maxChartValue}
                  stepValue={chartStepValue}
                  noOfSections={5}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={colors.border}
                  rulesColor={colors.separator}
                  rulesType="solid"
                  formatYLabel={formatWholeNumber}
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
                  onPress={(_item: any, index: number) => {
                    setSelectedBarIndex(index);
                  }}
                  renderTooltip={(item: any) => {
                    return (
                      <View
                        style={[
                          styles.tooltipBox,
                          {
                            backgroundColor: colors.foreground,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tooltipText,
                            {
                              color: colors.background,
                            },
                          ]}
                        >
                          {item.value}
                        </Text>
                      </View>
                    );
                  }}
                />
              </ScrollView>
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

      <Modal
        visible={isFilterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
          onPress={() => setIsFilterOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Select year
                </Text>

                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  The chart will show January to December data.
                </Text>
              </View>

              <Pressable onPress={() => setIsFilterOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.filterList}
              showsVerticalScrollIndicator={false}
            >
              {yearOptions.map((option) => {
                const isSelected = selectedYear === option.year;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => handleSelectYear(option)}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor: isSelected
                          ? colors.surfaceSecondary
                          : colors.surface,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.filterOptionTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        {option.label}
                      </Text>

                      <Text
                        style={[
                          styles.filterOptionSubtitle,
                          { color: colors.muted },
                        ]}
                      >
                        {option.subtitle}
                      </Text>
                    </View>

                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.accent}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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

  chartTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
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

  compactSelect: {
    minWidth: 88,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  compactSelectText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  chartWrap: {
    marginTop: 20,
    paddingLeft: 4,
    overflow: "hidden",
  },

  chartScrollContent: {
    paddingRight: 32,
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
    paddingHorizontal: 20,
  },

  emptyChartText: {
    fontSize: 13,
    textAlign: "center",
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

  barValuePill: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  barValueText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },

  tooltipBox: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  tooltipText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalCard: {
    maxHeight: "56%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  modalSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  filterList: {
    maxHeight: 320,
  },

  filterOption: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  filterOptionTitle: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },

  filterOptionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
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