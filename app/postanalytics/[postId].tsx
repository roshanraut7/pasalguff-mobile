import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Tabs } from "heroui-native";
import createPostInsightsDetailStyles, {
  type PostInsightsDetailStyles,
} from "@/constants/styles/postsAnalytics";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { PostPoll } from "@/types/post";

import PostOverviewTab from "./overviewTab";
import PostInsightsTimeFilter, {
  type PostInsightTimeRange,
} from "./timeFilter";

type AnalyticsTab = "overview" | "engagement" | "feedback";

type InsightRouteParams = {
  postId?: string | string[];
  communityId?: string | string[];
  title?: string | string[];
  communityName?: string | string[];
  tag?: string | string[];
  type?: string | string[];
  visibility?: string | string[];
  publishedAt?: string | string[];
  thumbnail?: string | string[];

  likeCount?: string | string[];
  dislikeCount?: string | string[];
  commentCount?: string | string[];
  shareCount?: string | string[];
  approvalRate?: string | string[];

  poll?: string | string[];
};

export default function PostInsightsDetailScreen() {
  const { colors } = useAppTheme();
 const styles = useMemo(
  () => createPostInsightsDetailStyles(colors),
  [colors],
);

  const params = useLocalSearchParams<InsightRouteParams>();

  const [tab, setTab] = useState<AnalyticsTab>("overview");
  const [timeRange, setTimeRange] = useState<PostInsightTimeRange>("LAST_7_DAYS");

  const title = readStringParam(params.title) || "Untitled post";
  const communityName =
    readStringParam(params.communityName) || "Community";
  const tag = readStringParam(params.tag) || "GENERAL";
  const type = readStringParam(params.type) || "TEXT";
  const visibility = readStringParam(params.visibility) || "PUBLIC";
  const publishedAt = readStringParam(params.publishedAt);
  const thumbnail = readStringParam(params.thumbnail);

  const likeCount = readNumberParam(params.likeCount);
  const dislikeCount = readNumberParam(params.dislikeCount);
  const commentCount = readNumberParam(params.commentCount);
  const shareCount = readNumberParam(params.shareCount);

  const approvalRate = readOptionalNumberParam(params.approvalRate);

  const poll = useMemo(() => {
    return readPollParam(params.poll);
  }, [params.poll]);

  const pollVoteCount = poll?.totalVotes ?? 0;

  const totalReactions = likeCount + dislikeCount;

  const totalActions =
    likeCount +
    dislikeCount +
    commentCount +
    shareCount +
    pollVoteCount;

  const computedApprovalRate =
    totalReactions > 0
      ? Number(((likeCount / totalReactions) * 100).toFixed(1))
      : null;

  const visibleApprovalRate = approvalRate ?? computedApprovalRate;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/pages/postInsight");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            {
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.foreground}
          />
        </Pressable>

        <Text style={styles.headerTitle}>Post Insights</Text>

        <View style={styles.headerSide} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <PostPreviewCard
          title={title}
          communityName={communityName}
          tag={tag}
          publishedAt={publishedAt}
          thumbnail={thumbnail}
          type={type}
          likeCount={likeCount}
          dislikeCount={dislikeCount}
          commentCount={commentCount}
          shareCount={shareCount}
          pollVoteCount={pollVoteCount}
          showPollVotes={Boolean(poll)}
          colors={colors}
          styles={styles}
        />

        <View style={styles.tabsSection}>
  <Tabs
    value={tab}
    onValueChange={(value) => setTab(value as AnalyticsTab)}
    variant="secondary"
    style={{ width: "100%" }}
  >
    <Tabs.List>
      <Tabs.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsListContent}
      >
        <Tabs.Indicator />

        <Tabs.Trigger value="overview">
          <Tabs.Label>Overview</Tabs.Label>
        </Tabs.Trigger>

        <Tabs.Trigger value="engagement">
          <Tabs.Label>Engagement</Tabs.Label>
        </Tabs.Trigger>

        <Tabs.Trigger value="feedback">
          <Tabs.Label>Feedback</Tabs.Label>
        </Tabs.Trigger>
      </Tabs.ScrollView>
    </Tabs.List>
  </Tabs>
</View>

<View style={styles.analyticsFilterRow}>
  <Text style={styles.analyticsFilterLabel}>
    Showing analytics for
  </Text>

  <PostInsightsTimeFilter
    value={timeRange}
    onChange={setTimeRange}
  />
</View>

        {tab === "overview" ? (
          <PostOverviewTab
            totalActions={totalActions}
            approvalRate={visibleApprovalRate}
            commentCount={commentCount}
            shareCount={shareCount}
            pollVoteCount={pollVoteCount}
            showPollVotes={Boolean(poll)}
            communityName={communityName}
            type={type}
            tag={tag}
            visibility={visibility}
            publishedAt={publishedAt}
          />
        ) : null}

        {tab === "engagement" ? (
          <EngagementTab
            likeCount={likeCount}
            dislikeCount={dislikeCount}
            commentCount={commentCount}
            shareCount={shareCount}
            approvalRate={visibleApprovalRate}
            poll={poll}
            colors={colors}
            styles={styles}
          />
        ) : null}

        {tab === "feedback" ? (
          <FeedbackTab
            dislikeCount={dislikeCount}
            approvalRate={visibleApprovalRate}
            colors={colors}
            styles={styles}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   POST PREVIEW CARD
   ========================================================= */

function  PostPreviewCard({
  title,
  communityName,
  tag,
  publishedAt,
  thumbnail,
  type,
  likeCount,
  dislikeCount,
  commentCount,
  shareCount,
  pollVoteCount,
  showPollVotes,
  colors,
  styles,
}: {
  title: string;
  communityName: string;
  tag: string;
  publishedAt: string;
  thumbnail: string;
  type: string;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  pollVoteCount: number;
  showPollVotes: boolean;
  colors: any;
  styles: PostInsightsDetailStyles;
}) {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewTopRow}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.previewThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.previewFallback}>
            <Ionicons
              name={getPostTypeIcon(type)}
              size={29}
              color={colors.accent}
            />
          </View>
        )}

        <View style={styles.previewTextWrap}>
          <Text numberOfLines={2} style={styles.previewTitle}>
            {title}
          </Text>

          <View style={styles.previewMetaRow}>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>
                {formatLabel(tag)}
              </Text>
            </View>

            <Text numberOfLines={1} style={styles.communityText}>
              {communityName}
            </Text>
          </View>

          <Text style={styles.publishedText}>
            {publishedAt
              ? `Published ${formatDate(publishedAt)}`
              : "Published post"}
          </Text>
        </View>
      </View>

      <View style={styles.quickMetricsDivider} />

      <View style={styles.quickMetricsRow}>
        <QuickMetric
          icon="thumbs-up-outline"
          value={likeCount}
          label="Likes"
          colors={colors}
          styles={styles}
        />

        <QuickMetric
          icon="thumbs-down-outline"
          value={dislikeCount}
          label="Dislikes"
          colors={colors}
          styles={styles}
        />

        <QuickMetric
          icon="chatbubble-outline"
          value={commentCount}
          label="Comments"
          colors={colors}
          styles={styles}
        />

        <QuickMetric
          icon="share-social-outline"
          value={shareCount}
          label="Shares"
          colors={colors}
          styles={styles}
        />

        {showPollVotes ? (
          <QuickMetric
            icon="stats-chart-outline"
            value={pollVoteCount}
            label="Votes"
            colors={colors}
            styles={styles}
          />
        ) : null}
      </View>
    </View>
  );
}

function QuickMetric({
  icon,
  value,
  label,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  colors: any;
  styles: PostInsightsDetailStyles;
}) {
  return (
    <View style={styles.quickMetricItem}>
      <Ionicons name={icon} size={18} color={colors.accent} />

      <Text style={styles.quickMetricValue}>
        {formatCompactNumber(value)}
      </Text>

      <Text numberOfLines={1} style={styles.quickMetricLabel}>
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   ENGAGEMENT TAB
   ========================================================= */

function EngagementTab({
  likeCount,
  dislikeCount,
  commentCount,
  shareCount,
  approvalRate,
  poll,
  colors,
  styles,
}: {
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  approvalRate: number | null;
  poll: PostPoll | null;
  colors: any;
  styles: PostInsightsDetailStyles;
}) {
  const totalReactions = likeCount + dislikeCount;

  return (
    <View style={styles.tabContent}>
      <SectionCard title="Reaction Summary" styles={styles}>
        <InfoRow
          label="Likes"
          value={formatCompactNumber(likeCount)}
          styles={styles}
        />

        <InfoRow
          label="Dislikes"
          value={formatCompactNumber(dislikeCount)}
          styles={styles}
        />

        <InfoRow
          label="Total Reactions"
          value={formatCompactNumber(totalReactions)}
          styles={styles}
        />

        <InfoRow
          label="Approval Rate"
          value={formatPercentage(approvalRate)}
          styles={styles}
          last
        />

        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            {totalReactions === 0 ? (
              <View style={styles.neutralProgress} />
            ) : (
              <>
                {likeCount > 0 ? (
                  <View
                    style={[
                      styles.positiveProgress,
                      {
                        flex: likeCount,
                      },
                    ]}
                  />
                ) : null}

                {dislikeCount > 0 ? (
                  <View
                    style={[
                      styles.negativeProgress,
                      {
                        flex: dislikeCount,
                      },
                    ]}
                  />
                ) : null}
              </>
            )}
          </View>

          <View style={styles.progressLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.positiveDot]} />

              <Text style={styles.legendText}>Likes</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.negativeDot]} />

              <Text style={styles.legendText}>Dislikes</Text>
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Discussion Activity" styles={styles}>
        <InfoRow
          label="Total Comments"
          value={formatCompactNumber(commentCount)}
          styles={styles}
          last
        />

        <View style={styles.informationBox}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color={colors.accent}
          />

          <Text style={styles.informationText}>
            Comment and reply details will appear in this section.
          </Text>
        </View>
      </SectionCard>

      <SectionCard title="Shares" styles={styles}>
        <InfoRow
          label="Total Shares"
          value={formatCompactNumber(shareCount)}
          styles={styles}
          last
        />

        <View style={styles.informationBox}>
          <Ionicons
            name="share-social-outline"
            size={18}
            color={colors.accent}
          />

          <Text style={styles.informationText}>
            Share platform details will appear in this section.
          </Text>
        </View>
      </SectionCard>

      {poll ? (
        <PollResultsCard
          poll={poll}
          styles={styles}
        />
      ) : null}
    </View>
  );
}

/* =========================================================
   FEEDBACK TAB
   ========================================================= */

function FeedbackTab({
  dislikeCount,
  approvalRate,
  colors,
  styles,
}: {
  dislikeCount: number;
  approvalRate: number | null;
  colors: any;
  styles: PostInsightsDetailStyles;
}) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.metricCardRow}>
        <MetricCard
          title="Negative Feedback"
          value={formatCompactNumber(dislikeCount)}
          icon="thumbs-down-outline"
          colors={colors}
          styles={styles}
        />

        <MetricCard
          title="Approval Rate"
          value={formatPercentage(approvalRate)}
          icon="checkmark-circle-outline"
          colors={colors}
          styles={styles}
        />
      </View>

      <SectionCard title="Feedback Summary" styles={styles}>
        <Text style={styles.feedbackSummaryText}>
          {dislikeCount === 0
            ? "No users have submitted negative feedback for this post."
            : `${dislikeCount} user${
                dislikeCount === 1 ? "" : "s"
              } submitted negative feedback for this post.`}
        </Text>
      </SectionCard>

      <SectionCard title="Main Reasons" styles={styles}>
        <View style={styles.emptyFeedbackWrap}>
          <View style={styles.emptyFeedbackIcon}>
            <Ionicons
              name="analytics-outline"
              size={26}
              color={colors.accent}
            />
          </View>

          <Text style={styles.emptyFeedbackTitle}>Feedback reasons</Text>

          <Text style={styles.emptyFeedbackText}>
            Anonymous dislike reason categories will be displayed here.
          </Text>
        </View>
      </SectionCard>

      <SectionCard title="Recent Anonymous Feedback" styles={styles}>
        <View style={styles.emptyFeedbackWrap}>
          <View style={styles.emptyFeedbackIcon}>
            <Ionicons
              name="chatbox-ellipses-outline"
              size={26}
              color={colors.accent}
            />
          </View>

          <Text style={styles.emptyFeedbackTitle}>
            No feedback messages displayed
          </Text>

          <Text style={styles.emptyFeedbackText}>
            Anonymous written feedback will be shown here without user names
            or profile photos.
          </Text>
        </View>
      </SectionCard>
    </View>
  );
}

/* =========================================================
   SHARED COMPONENTS
   ========================================================= */

function MetricCard({
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
  styles: PostInsightsDetailStyles;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <Text style={styles.metricCardValue}>{value}</Text>
      <Text style={styles.metricCardLabel}>{title}</Text>
    </View>
  );
}

function SectionCard({
  title,
  styles,
  children,
}: {
  title: string;
  styles: PostInsightsDetailStyles;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  styles,
  last = false,
}: {
  label: string;
  value: string;
  styles: PostInsightsDetailStyles;
  last?: boolean;
}) {
  return (
    <>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text numberOfLines={2} style={styles.infoValue}>
          {value}
        </Text>
      </View>

      {!last ? <View style={styles.infoDivider} /> : null}
    </>
  );
}

function PollResultsCard({
  poll,
  styles,
}: {
  poll: PostPoll;
  styles: PostInsightsDetailStyles;
}) {
  return (
    <SectionCard title="Poll Results" styles={styles}>
      <Text style={styles.pollQuestion}>{poll.question}</Text>

      <View style={styles.pollMetaRow}>
        <Text style={styles.pollMetaText}>
          {formatCompactNumber(poll.totalVotes)} votes
        </Text>

        <View
          style={[
            styles.pollStatusBadge,
            poll.isClosed ? styles.closedBadge : undefined,
          ]}
        >
          <Text style={styles.pollStatusText}>
            {poll.isClosed ? "Closed" : "Open"}
          </Text>
        </View>
      </View>

      <View style={styles.pollOptionList}>
        {poll.options.map((option) => {
          const widthValue = `${Math.min(
            Math.max(option.percentage, 0),
            100,
          )}%` as `${number}%`;

          return (
            <View key={option.id} style={styles.pollOption}>
              <View style={styles.pollOptionHeader}>
                <Text numberOfLines={1} style={styles.pollOptionLabel}>
                  {option.text}
                </Text>

                <Text style={styles.pollOptionValue}>
                  {option.percentage}% · {option.voteCount}
                </Text>
              </View>

              <View style={styles.pollTrack}>
                <View
                  style={[
                    styles.pollFill,
                    {
                      width: widthValue,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {poll.closesAt ? (
        <Text style={styles.pollClosingText}>
          Closes {formatDate(poll.closesAt)}
        </Text>
      ) : null}
    </SectionCard>
  );
}

/* =========================================================
   VALUE HELPERS
   ========================================================= */

function readStringParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readNumberParam(value?: string | string[]) {
  const parsed = Number(readStringParam(value));

  return Number.isFinite(parsed) ? parsed : 0;
}

function readOptionalNumberParam(value?: string | string[]) {
  const rawValue = readStringParam(value);

  if (!rawValue) return null;

  const parsed = Number(rawValue);

  return Number.isFinite(parsed) ? parsed : null;
}

function readPollParam(value?: string | string[]): PostPoll | null {
  const rawValue = readStringParam(value);

  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as PostPoll;
  } catch {
    return null;
  }
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

function getPostTypeIcon(
  type: string,
): keyof typeof Ionicons.glyphMap {
  if (type === "MEDIA") return "image-outline";
  if (type === "LINK") return "link-outline";

  return "document-text-outline";
}
