import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Circle,
  Line,
  Path,
  Text as SvgText,
} from "react-native-svg";

import { useAppTheme } from "@/hooks/useAppTheme";
import type { PostAnalyticsResponse } from "@/types/analytics";

type PerformanceMetric = "Views" | "Likes" | "Comments" | "Shares";

type PostOverviewTabProps = {
  analytics?: PostAnalyticsResponse["overview"];
  isLoading?: boolean;
  isError?: boolean;

  totalActions: number;
  approvalRate: number | null;
  commentCount: number;
  shareCount: number;
  pollVoteCount: number;
  showPollVotes: boolean;

  communityName: string;
  type: string;
  tag: string;
  visibility: string;
  publishedAt: string;
};

type TrendPoint = {
  label: string;
  value: number;
};

const PERFORMANCE_METRICS: PerformanceMetric[] = [
  "Views",
  "Likes",
  "Comments",
  "Shares",
];

export default function PostOverviewTab({
  analytics,
  isLoading = false,
  isError = false,
  totalActions,
  approvalRate,
  commentCount,
  shareCount,
  pollVoteCount,
  showPollVotes,
  communityName,
  type,
  tag,
  visibility,
  publishedAt,
}: PostOverviewTabProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedMetric, setSelectedMetric] =
    useState<PerformanceMetric>("Views");

  const activeTrendData = useMemo(() => {
    if (!analytics?.performance?.length) {
      return [];
    }

    return analytics.performance.map((item) => {
      if (selectedMetric === "Views") {
        return {
          label: item.label,
          value: item.views,
        };
      }

      if (selectedMetric === "Likes") {
        return {
          label: item.label,
          value: item.likes,
        };
      }

      if (selectedMetric === "Comments") {
        return {
          label: item.label,
          value: item.comments,
        };
      }

      return {
        label: item.label,
        value: item.shares,
      };
    });
  }, [analytics?.performance, selectedMetric]);

  const totalViews = analytics?.totalViews ?? 0;
  const uniqueViewers = analytics?.uniqueViewers ?? 0;
  const averageScreenTimeSeconds =
    analytics?.averageScreenTimeSeconds ?? 0;

  const finalTotalActions = analytics?.totalActions ?? totalActions;
  const finalApprovalRate = analytics?.approvalRate ?? approvalRate;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Key Metrics</Text>

      {isLoading ? (
        <View style={styles.statusCard}>
          <Ionicons
            name="time-outline"
            size={18}
            color={colors.accent}
          />

          <Text style={styles.statusText}>
            Loading analytics...
          </Text>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.statusCard}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={colors.accent}
          />

          <Text style={styles.statusText}>
            Unable to load analytics. Showing available post information.
          </Text>
        </View>
      ) : null}

      <View style={styles.metricGrid}>
        <SummaryCard
          title="Total Views"
          value={formatCompactNumber(totalViews)}
          icon="eye-outline"
          colors={colors}
          styles={styles}
        />

        <SummaryCard
          title="Unique Viewers"
          value={formatCompactNumber(uniqueViewers)}
          icon="people-outline"
          colors={colors}
          styles={styles}
        />

        <SummaryCard
          title="Avg. Screen Time"
          value={formatDuration(averageScreenTimeSeconds)}
          icon="timer-outline"
          colors={colors}
          styles={styles}
        />

        <SummaryCard
          title="Total Actions"
          value={formatCompactNumber(finalTotalActions)}
          icon="pulse-outline"
          colors={colors}
          styles={styles}
        />

        <SummaryCard
          title="Approval Rate"
          value={formatPercentage(finalApprovalRate)}
          icon="checkmark-circle-outline"
          colors={colors}
          styles={styles}
        />

        <SummaryCard
          title="Comments"
          value={formatCompactNumber(commentCount)}
          icon="chatbubbles-outline"
          colors={colors}
          styles={styles}
        />

        <SummaryCard
          title="Shares"
          value={formatCompactNumber(shareCount)}
          icon="share-social-outline"
          colors={colors}
          styles={styles}
        />

        {showPollVotes ? (
          <SummaryCard
            title="Poll Votes"
            value={formatCompactNumber(pollVoteCount)}
            icon="stats-chart-outline"
            colors={colors}
            styles={styles}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Post Performance</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Performance trend based on the selected time period.
          </Text>

          <View style={styles.filterRow}>
            {PERFORMANCE_METRICS.map((metric) => {
              const selected = metric === selectedMetric;

              return (
                <Pressable
                  key={metric}
                  onPress={() => setSelectedMetric(metric)}
                  style={({ pressed }) => [
                    styles.filterButton,
                    selected ? styles.filterButtonActive : undefined,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected ? styles.filterTextActive : undefined,
                    ]}
                  >
                    {metric}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {activeTrendData.length > 0 ? (
            <LineChart
              data={activeTrendData}
              metric={selectedMetric}
              colors={colors}
              styles={styles}
            />
          ) : (
            <EmptyState
              icon="analytics-outline"
              title="No performance data"
              text="Performance data will appear after users start viewing and interacting with this post."
              colors={colors}
              styles={styles}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Traffic Sources</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Where people found this post.
          </Text>

          {analytics?.trafficSources?.length ? (
            <View style={styles.progressList}>
              {analytics.trafficSources.map((source) => (
                <ProgressRow
                  key={source.source}
                  label={source.label}
                  percentage={source.percentage}
                  value={`${formatCompactNumber(source.views)} views`}
                  colors={colors}
                  styles={styles}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="git-branch-outline"
              title="No traffic source data"
              text="Traffic source data will appear after this post receives views."
              colors={colors}
              styles={styles}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Audience by District</Text>

          <Pressable onPress={() => console.log("See all districts pressed")}>
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Top districts viewing this post.
          </Text>

          {analytics?.districts?.length ? (
            <View style={styles.progressList}>
              {analytics.districts.map((district) => (
                <ProgressRow
                  key={district.district}
                  label={district.district}
                  percentage={district.percentage}
                  value={`${formatCompactNumber(district.viewers)} viewers`}
                  colors={colors}
                  styles={styles}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="location-outline"
              title="No district data"
              text="District analytics will appear after users view this post."
              colors={colors}
              styles={styles}
            />
          )}
        </View>
      </View>

      {analytics?.audienceInsight?.message ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audience Insight</Text>

          <View style={styles.insightCard}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.accent}
            />

            <Text style={styles.insightText}>
              {analytics.audienceInsight.message}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Post Details</Text>

        <View style={styles.card}>
          <DetailRow
            label="Community"
            value={communityName}
            styles={styles}
          />

          <DetailRow
            label="Post Type"
            value={formatLabel(type)}
            styles={styles}
          />

          <DetailRow
            label="Tag"
            value={formatLabel(tag)}
            styles={styles}
          />

          <DetailRow
            label="Visibility"
            value={formatLabel(visibility)}
            styles={styles}
          />

          <DetailRow
            label="Published"
            value={publishedAt ? formatDate(publishedAt) : "-"}
            styles={styles}
            last
          />
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   SUMMARY CARD
   ========================================================= */

function SummaryCard({
  title,
  value,
  icon,
  colors,
  styles,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: any;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIconWrap}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{title}</Text>
    </View>
  );
}

/* =========================================================
   LINE CHART
   ========================================================= */

function LineChart({
  data,
  metric,
  colors,
  styles,
}: {
  data: TrendPoint[];
  metric: PerformanceMetric;
  colors: any;
  styles: ReturnType<typeof createStyles>;
}) {
  const [chartWidth, setChartWidth] = useState(0);

  const chartHeight = 210;
  const padding = {
    top: 18,
    right: 10,
    bottom: 34,
    left: 42,
  };

  const maxRawValue = Math.max(...data.map((item) => item.value), 1);
  const maxValue = getChartMaxValue(maxRawValue);

  const innerWidth = Math.max(
    chartWidth - padding.left - padding.right,
    1,
  );

  const innerHeight = chartHeight - padding.top - padding.bottom;

  const points = data.map((item, index) => {
    const x =
      padding.left +
      (data.length === 1
        ? innerWidth / 2
        : (index / (data.length - 1)) * innerWidth);

    const y =
      padding.top +
      innerHeight -
      (item.value / maxValue) * innerHeight;

    return {
      ...item,
      x,
      y,
    };
  });

  const path = points
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`,
    )
    .join(" ");

  const gridRatios = [1, 0.75, 0.5, 0.25, 0];

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (nextWidth !== chartWidth) {
      setChartWidth(nextWidth);
    }
  };

  return (
    <View style={styles.chartWrap} onLayout={handleLayout}>
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartMetricTitle}>{metric}</Text>

        <Text style={styles.chartMetricValue}>
          {formatCompactNumber(data[data.length - 1]?.value ?? 0)}
        </Text>
      </View>

      {chartWidth > 0 ? (
        <Svg width={chartWidth} height={chartHeight}>
          {gridRatios.map((ratio) => {
            const y =
              padding.top +
              innerHeight -
              ratio * innerHeight;

            const labelValue = Math.round(maxValue * ratio);

            return (
              <React.Fragment key={ratio}>
                <Line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke={colors.border}
                  strokeWidth={1}
                />

                <SvgText
                  x={padding.left - 7}
                  y={y + 4}
                  fontSize={9}
                  fill={colors.muted}
                  textAnchor="end"
                >
                  {formatCompactNumber(labelValue)}
                </SvgText>
              </React.Fragment>
            );
          })}

          <Path
            d={path}
            fill="none"
            stroke={colors.accent}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <React.Fragment key={point.label}>
              <Circle
                cx={point.x}
                cy={point.y}
                r={4}
                fill={colors.accent}
              />

              {(index === 0 ||
                index === points.length - 1 ||
                index % 2 === 0) && (
                <SvgText
                  x={point.x}
                  y={chartHeight - 10}
                  fontSize={9}
                  fill={colors.muted}
                  textAnchor="middle"
                >
                  {point.label}
                </SvgText>
              )}
            </React.Fragment>
          ))}
        </Svg>
      ) : (
        <View style={{ height: chartHeight }} />
      )}
    </View>
  );
}

/* =========================================================
   PROGRESS ROWS
   ========================================================= */

function ProgressRow({
  label,
  percentage,
  value,
  colors,
  styles,
}: {
  label: string;
  percentage: number;
  value: string;
  colors: any;
  styles: ReturnType<typeof createStyles>;
}) {
  const safePercentage = Math.max(0, Math.min(percentage, 100));

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <View style={styles.progressTextWrap}>
          <Text style={styles.progressLabel}>{label}</Text>

          <Text style={styles.progressSubText}>{value}</Text>
        </View>

        <Text style={styles.progressValue}>{safePercentage}%</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${safePercentage}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

/* =========================================================
   DETAIL / EMPTY
   ========================================================= */

function DetailRow({
  label,
  value,
  styles,
  last = false,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  last?: boolean;
}) {
  return (
    <>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>

        <Text numberOfLines={2} style={styles.detailValue}>
          {value}
        </Text>
      </View>

      {!last ? <View style={styles.divider} /> : null}
    </>
  );
}

function EmptyState({
  icon,
  title,
  text,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  colors: any;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={colors.accent} />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function getChartMaxValue(value: number) {
  if (value <= 10) return 10;
  if (value <= 50) return Math.ceil(value / 10) * 10;
  if (value <= 100) return Math.ceil(value / 20) * 20;
  if (value <= 500) return Math.ceil(value / 100) * 100;
  if (value <= 1000) return Math.ceil(value / 200) * 200;

  return Math.ceil(value / 500) * 500;
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(
      value >= 10_000_000 ? 0 : 1,
    )}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }

  return String(value);
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return "0s";

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

function formatPercentage(value: number | null) {
  if (value === null) return "-";

  return `${value.toFixed(1)}%`;
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   STYLES
   ========================================================= */

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      marginTop: 22,
    },

    heading: {
      marginBottom: 12,
      color: colors.foreground,
      fontSize: 17,
      lineHeight: 24,
      fontFamily: "Poppins_700Bold",
    },

    statusCard: {
      marginBottom: 12,
      padding: 12,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    statusText: {
      flex: 1,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      fontFamily: "Poppins_400Regular",
    },

    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
    },

    summaryCard: {
      width: "48%",
      minHeight: 118,
      padding: 14,
      borderRadius: 22,
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    summaryIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    summaryValue: {
      marginTop: 15,
      color: colors.foreground,
      fontSize: 24,
      lineHeight: 30,
      fontFamily: "Poppins_700Bold",
    },

    summaryLabel: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_500Medium",
    },

    section: {
      marginTop: 22,
    },

    sectionTitleRow: {
      marginBottom: 9,
      marginLeft: 4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    sectionTitle: {
      marginBottom: 9,
      marginLeft: 4,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },

    seeAllText: {
      marginRight: 4,
      color: colors.accent,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "Poppins_700Bold",
    },

    card: {
      padding: 14,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    cardDescription: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      fontFamily: "Poppins_400Regular",
    },

    filterRow: {
      marginTop: 14,
      flexDirection: "row",
      gap: 7,
    },

    filterButton: {
      flex: 1,
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 7,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
    },

    filterButtonActive: {
      backgroundColor: colors.accent,
    },

    filterText: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 14,
      fontFamily: "Poppins_700Bold",
    },

    filterTextActive: {
      color: colors.accentForeground,
    },

    chartWrap: {
      marginTop: 16,
    },

    chartHeaderRow: {
      marginBottom: 5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    chartMetricTitle: {
      color: colors.foreground,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_700Bold",
    },

    chartMetricValue: {
      color: colors.accent,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: "Poppins_700Bold",
    },

    progressList: {
      marginTop: 17,
      gap: 16,
    },

    progressRow: {
      gap: 7,
    },

    progressLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    progressTextWrap: {
      flex: 1,
    },

    progressLabel: {
      color: colors.foreground,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_500Medium",
    },

    progressSubText: {
      marginTop: 1,
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      fontFamily: "Poppins_400Regular",
    },

    progressValue: {
      color: colors.accent,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_700Bold",
    },

    progressTrack: {
      height: 8,
      borderRadius: 999,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },

    progressFill: {
      height: "100%",
      borderRadius: 999,
    },

    insightCard: {
      minHeight: 74,
      padding: 14,
      borderRadius: 22,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    insightText: {
      flex: 1,
      color: colors.foreground,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_500Medium",
    },

    detailRow: {
      minHeight: 43,
      paddingHorizontal: 3,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 15,
    },

    detailLabel: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_500Medium",
    },

    detailValue: {
      flexShrink: 1,
      color: colors.foreground,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_700Bold",
      textAlign: "right",
    },

    divider: {
      height: 1,
      backgroundColor: colors.border,
    },

    emptyWrap: {
      minHeight: 140,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },

    emptyIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    emptyTitle: {
      marginTop: 12,
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 19,
      fontFamily: "Poppins_700Bold",
      textAlign: "center",
    },

    emptyText: {
      marginTop: 5,
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      fontFamily: "Poppins_400Regular",
      textAlign: "center",
    },
  });
}