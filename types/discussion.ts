export type ViewerRole = "AUTHOR" | "MEMBER" | "MODERATOR" | "OWNER" | "ADMIN";

export type DiscussionStatus = "OPEN" | "SOLVED" | "CLOSED" | "LOCKED";

export type VoteValue = "UP" | "DOWN" | null;

export type UserLite = {
  id: string;
  name: string;
  handle: string;
  avatarInitials: string;
  roleLabel?: string;
};

export type DiscussionReply = {
  id: string;
  author: UserLite;
  body: string;
  createdAt: string;
  voteScore: number;
  viewerVote?: VoteValue;
  isDeleted?: boolean;
};

export type DiscussionComment = {
  id: string;
  author: UserLite;
  body: string;
  createdAt: string;
  voteScore: number;
  viewerVote?: VoteValue;
  replies: DiscussionReply[];
  isAcceptedAnswer?: boolean;
  isAuthorHighlighted?: boolean;
  isModeratorPinned?: boolean;
  isDeleted?: boolean;
};

export type Discussion = {
  id: string;
  communityId: string;
  communityName: string;
  communityVisibility: "PUBLIC" | "PRIVATE";
  title: string;
  body: string;
  author: UserLite;
  status: DiscussionStatus;
  tags: string[];
  views: number;
  answers: number;
  shares: number;
  followers: number;
  createdAt: string;
  updatedAt: string;
  comments: DiscussionComment[];
};

export type DiscussionPermissions = {
  isAuthor: boolean;
  isCommunityModerator: boolean;
  canAnswer: boolean;
  canReport: boolean;
  canShare: boolean;
  canMarkAcceptedAnswer: boolean;
  canHighlightAsAuthor: boolean;
  canCloseAsSolved: boolean;
  canPinModeratorNote: boolean;
  canDeleteAnyComment: boolean;
  canLockDiscussion: boolean;
  canMarkSpam: boolean;
};