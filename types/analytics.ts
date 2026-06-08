export type PostInsightTimeRange =
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "LAST_90_DAYS"
  | "ALL_TIME";

export type PostViewSource =
  | "FOR_YOU_FEED"
  | "COMMUNITY_FEED"
  | "PROFILE"
  | "SEARCH"
  | "NOTIFICATION"
  | "SHARED_LINK"
  | "DIRECT"
  | "OTHER";

export type AnalyticsPerformancePoint = {
  label: string;
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
  pollVotes: number;
};

export type AnalyticsTrafficSource = {
  source: PostViewSource | string;
  label: string;
  views: number;
  percentage: number;
};

export type AnalyticsDistrict = {
  district: string;
  viewers: number;
  percentage: number;
};

export type AnalyticsAudienceInsight = {
  topDistrict: string | null;
  message: string | null;
};

export type AnalyticsSharePlatform = {
  platform: string;
  count: number;
  percentage: number;
};

export type AnalyticsAnonymousFeedback = {
  id: string;
  reason: string | null;
  createdAt: string;
};

export type PostAnalyticsResponse = {
  period: {
    range: PostInsightTimeRange;
    from: string | null;
    to: string;
  };

  post: {
    id: string;
    title: string | null;
    type: string;
    tag: string;
    visibility: string;
    status: string;
    publishedAt: string | null;
    community: {
      id: string;
      name: string;
    };
  };

  overview: {
    totalViews: number;
    uniqueViewers: number;

    totalScreenTimeSeconds: number;
    averageScreenTimeSeconds: number;

    totalActions: number;
    approvalRate: number | null;

    performance: AnalyticsPerformancePoint[];
    trafficSources: AnalyticsTrafficSource[];
    districts: AnalyticsDistrict[];

    audienceInsight: AnalyticsAudienceInsight;
  };

  engagement: {
    likes: number;
    dislikes: number;
    totalReactions: number;
    approvalRate: number | null;

    comments: {
      mainComments: number;
      replies: number;
      total: number;
    };

    shares: {
      total: number;
      platforms: AnalyticsSharePlatform[];
    };

    poll: null;
  };

  feedback: {
    totalNegativeFeedback: number;

    reasonBreakdown: {
      category: string;
      label: string;
      count: number;
      percentage: number;
    }[];

    anonymousFeedback: AnalyticsAnonymousFeedback[];
  };
};

export type GetPostAnalyticsArgs = {
  communityId: string;
  postId: string;
  range: PostInsightTimeRange;
};

export type RecordPostViewArgs = {
  communityId: string;
  postId: string;
  source?: PostViewSource;
};

export type RecordPostViewResponse = {
  recorded: boolean;
  counted: boolean;
  viewId: string | null;
  reason: string | null;
};

export type UpdatePostViewDurationArgs = {
  communityId: string;
  postId: string;
  viewId: string;
  durationSeconds: number;
};

export type UpdatePostViewDurationResponse = {
  updated: boolean;
  viewId: string;
  durationSeconds: number;
  endedAt: string | null;
};