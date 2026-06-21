export type ViewerRole =
  | "VIEWER"
  | "AUTHOR"
  | "MEMBER"
  | "CONTRIBUTOR"
  | "MODERATOR"
  | "OWNER"
  | "ADMIN"
  | "MANAGER";

export type DiscussionStatus =
  | "OPEN"
  | "SOLVED"
  | "CLOSED"
  | "LOCKED"
  | "DELETED";

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
  communityVisibility: "PUBLIC" | "PRIVATE" | "RESTRICTED";
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

  canEditDiscussion: boolean;
  canDeleteDiscussion: boolean;
  canLockDiscussion: boolean;
  canCloseDiscussion: boolean;

  canMarkSpam: boolean;

  /**
   * Used for discussion-only user control:
   * - Limit user
   * - Remove user from discussion
   * - Restore user
   */
  canManageParticipants: boolean;
};

