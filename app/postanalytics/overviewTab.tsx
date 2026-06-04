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

type PerformanceMetric = "Views" | "Likes" | "Comments" | "Shares";

type PostOverviewTabProps = {
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

type ProgressItem = {
  label: string;
  percentage: number;
};

type DistrictItem = ProgressItem & {
  viewers: number;
};

/**
 * Temporary frontend preview values only.
 * Replace these later when analytics data is connected.
 */
const PREVIEW_PERFORMANCE: Record<PerformanceMetric, TrendPoint[]> = {
  Views: [
    { label: "Day 1", value: 120 },
    { label: "Day 2", value: 390 },
    { label: "Day 3", value: 620 },
    { label: "Day 4", value: 540 },
    { label: "Day 5", value: 880 },
    { label: "Day 6", value: 1120 },
    { label: "Day 7", value: 1360 },
  ],
  Likes: [
    { label: "Day 1", value: 8 },
    { label: "Day 2", value: 21 },
    { label: "Day 3", value: 36 },
    { label: "Day 4", value: 48 },
    { label: "Day 5", value: 61 },
    { label: "Day 6", value: 82 },
    { label: "Day 7", value: 104 },
  ],
  Comments: [
    { label: "Day 1", value: 2 },
    { label: "Day 2", value: 6 },
    { label: "Day 3", value: 12 },
    { label: "Day 4", value: 18 },
    { label: "Day 5", value: 23 },
    { label: "Day 6", value: 29 },
    { label: "Day 7", value: 35 },
  ],
  Shares: [
    { label: "Day 1", value: 1 },
    { label: "Day 2", value: 3 },
    { label: "Day 3", value: 5 },
    { label: "Day 4", value: 7 },
    { label: "Day 5", value: 10 },
    { label: "Day 6", value: 13 },
    { label: "Day 7", value: 18 },
  ],
};

const PREVIEW_TRAFFIC_SOURCES: ProgressItem[] = [
  { label: "For You Feed", percentage: 46 },
  { label: "Community Feed", percentage: 30 },
  { label: "Profile", percentage: 10 },
  { label: "Search", percentage: 6 },
  { label: "Notifications", percentage: 5 },
  { label: "Shared Link", percentage: 3 },
];

const PREVIEW_DISTRICTS: DistrictItem[] = [
  { label: "Kathmandu", viewers: 1240, percentage: 42 },
  { label: "Lalitpur", viewers: 620, percentage: 22 },
  { label: "Bhaktapur", viewers: 410, percentage: 14 },
  { label: "Kaski", viewers: 275, percentage: 9 },
  { label: "Chitwan", viewers: 190, percentage: 7 },
];

const PERFORMANCE_METRICS: PerformanceMetric[] = [
  "Views",
  "Likes",
  "Comments",
  "Shares",
];

export default function PostOverviewTab({
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

  const activeTrendData = PREVIEW_PERFORMANCE[selectedMetric];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Key Metrics</Text>

      <View style={styles.metricGrid}>
        <SummaryCard
          title="Total Views"
          value={formatCompactNumber(totalActions)}
          icon="pulse-outline"
          colors={colors}
          styles={styles}
        />

        <SummaryCard
          title="Average Rate"
          value={formatPercentage(approvalRate)}
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
            fullWidth
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Post Performance</Text>

          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>Preview</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Performance trend across the first 7 days.
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

          <LineChart
            data={activeTrendData}
            metric={selectedMetric}
            colors={colors}
            styles={styles}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Traffic Sources</Text>

          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>Preview</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardDescription}>
            Where people found this post.
          </Text>

          <View style={styles.progressList}>
            {PREVIEW_TRAFFIC_SOURCES.map((source) => (
              <ProgressRow
                key={source.label}
                label={source.label}
                percentage={source.percentage}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
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

          <View style={styles.progressList}>
            {PREVIEW_DISTRICTS.map((district) => (
              <DistrictProgressRow
                key={district.label}
                district={district}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        </View>
      </View>

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
  fullWidth = false,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: any;
  styles: ReturnType<typeof createStyles>;
  fullWidth?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        fullWidth ? styles.summaryCardFull : undefined,
      ]}
    >
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

  const innerHeight =
    chartHeight - padding.top - padding.bottom;

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
  colors,
  styles,
}: {
  label: string;
  percentage: number;
  colors: any;
  styles: ReturnType<typeof createStyles>;
}) {
  const safePercentage = Math.max(0, Math.min(percentage, 100));

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{label}</Text>
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

function DistrictProgressRow({
  district,
  colors,
  styles,
}: {
  district: DistrictItem;
  colors: any;
  styles: ReturnType<typeof createStyles>;
}) {
  const safePercentage = Math.max(0, Math.min(district.percentage, 100));

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressLabelRow}>
        <View style={styles.districtLabelWrap}>
          <Text style={styles.progressLabel}>{district.label}</Text>
          <Text style={styles.viewerCount}>
            {formatCompactNumber(district.viewers)} viewers
          </Text>
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
   DETAIL ROW
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

    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
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

    summaryCardFull: {
      width: "100%",
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

    previewBadge: {
      marginRight: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary,
    },

    previewBadgeText: {
      color: colors.accent,
      fontSize: 9,
      lineHeight: 12,
      fontFamily: "Poppins_700Bold",
      textTransform: "uppercase",
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

    progressLabel: {
      color: colors.foreground,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_500Medium",
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

    districtLabelWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "baseline",
      gap: 7,
    },

    viewerCount: {
      color: colors.muted,
      fontSize: 10,
      lineHeight: 15,
      fontFamily: "Poppins_400Regular",
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
  });
}