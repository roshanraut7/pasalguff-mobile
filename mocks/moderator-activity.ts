// mocks/moderator-activity.ts

export type ModeratorActivityType =
  | "POST"
  | "REPORT"
  | "MEMBER"
  | "REQUEST"
  | "COMMENT";

export type ModeratorActivityStatus = "COMPLETED" | "REVERSED";

export type ModeratorActivity = {
  id: string;
  moderatorId: string;
  title: string;
  description: string;
  type: ModeratorActivityType;
  targetName: string;
  reason: string;
  status: ModeratorActivityStatus;
  createdAt: string;
};

export const moderatorActivitiesMock: ModeratorActivity[] = [
  {
    id: "activity-1",
    moderatorId: "moderator-1",
    title: "Approved join request",
    description: "Approved a new member request.",
    type: "REQUEST",
    targetName: "Bibek Gurung",
    reason: "User profile looked genuine.",
    status: "COMPLETED",
    createdAt: "2026-04-30T10:20:00",
  },
  {
    id: "activity-2",
    moderatorId: "moderator-1",
    title: "Removed reported post",
    description: "Removed a post after checking report.",
    type: "REPORT",
    targetName: "Spam phone offer post",
    reason: "Post was reported as spam.",
    status: "COMPLETED",
    createdAt: "2026-04-29T15:10:00",
  },
  {
    id: "activity-3",
    moderatorId: "moderator-1",
    title: "Pinned community post",
    description: "Pinned an important announcement.",
    type: "POST",
    targetName: "Community rules update",
    reason: "Important information for all members.",
    status: "COMPLETED",
    createdAt: "2026-04-28T12:45:00",
  },
  {
    id: "activity-4",
    moderatorId: "moderator-1",
    title: "Banned member",
    description: "Banned a member from the community.",
    type: "MEMBER",
    targetName: "Kiran Lama",
    reason: "Repeated spam comments.",
    status: "COMPLETED",
    createdAt: "2026-04-27T18:30:00",
  },
  {
    id: "activity-5",
    moderatorId: "moderator-1",
    title: "Removed comment",
    description: "Removed an inappropriate comment.",
    type: "COMMENT",
    targetName: "Comment on sale post",
    reason: "Used abusive language.",
    status: "COMPLETED",
    createdAt: "2026-04-26T09:00:00",
  },

  {
    id: "activity-6",
    moderatorId: "moderator-2",
    title: "Pinned post",
    description: "Pinned a promotional post.",
    type: "POST",
    targetName: "Weekend discount offer",
    reason: "Useful post for community members.",
    status: "COMPLETED",
    createdAt: "2026-04-30T08:10:00",
  },
  {
    id: "activity-7",
    moderatorId: "moderator-2",
    title: "Unbanned member",
    description: "Unbanned a member after review.",
    type: "MEMBER",
    targetName: "Sujan Karki",
    reason: "Admin reviewed the case.",
    status: "COMPLETED",
    createdAt: "2026-04-28T14:15:00",
  },

  {
    id: "activity-8",
    moderatorId: "moderator-3",
    title: "Reviewed report",
    description: "Checked a reported comment.",
    type: "REPORT",
    targetName: "Reported comment",
    reason: "No serious violation found.",
    status: "REVERSED",
    createdAt: "2026-03-29T11:30:00",
  },
];