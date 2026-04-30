// mocks/moderator.ts

export type CommunityModeratorStatus = "ACTIVE" | "SUSPENDED";

export type CommunityModeratorPermission =
  | "POSTS"
  | "REPORTS"
  | "REQUESTS"
  | "BAN"
  | "PIN"
  | "COMMENTS";

export type CommunityDashboardModerator = {
  id: string;
  name: string;
  avatar: string;
  permissions: CommunityModeratorPermission[];
  status: CommunityModeratorStatus;
  assignedAt: string;
};

export const communityModeratorsMock: CommunityDashboardModerator[] = [
  {
    id: "moderator-1",
    name: "Nisha Rai",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
    permissions: ["POSTS", "REPORTS", "REQUESTS"],
    status: "ACTIVE",
    assignedAt: "2026-04-12",
  },
  {
    id: "moderator-2",
    name: "Aarav Sharma",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
    permissions: ["POSTS", "BAN", "PIN"],
    status: "ACTIVE",
    assignedAt: "2026-04-15",
  },
  {
    id: "moderator-3",
    name: "Pratiksha Thapa",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300",
    permissions: ["REPORTS", "COMMENTS"],
    status: "SUSPENDED",
    assignedAt: "2026-03-28",
  },
  {
    id: "moderator-4",
    name: "Sujan Karki",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300",
    permissions: ["REQUESTS", "REPORTS", "BAN"],
    status: "ACTIVE",
    assignedAt: "2026-04-20",
  },
  {
    id: "moderator-5",
    name: "Sarina Tamang",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
    permissions: ["POSTS", "COMMENTS", "PIN"],
    status: "ACTIVE",
    assignedAt: "2026-04-22",
  },
  {
    id: "moderator-6",
    name: "Bibek Gurung",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
    permissions: ["REPORTS", "BAN"],
    status: "SUSPENDED",
    assignedAt: "2026-03-18",
  },
  {
    id: "moderator-7",
    name: "Asmita Gurung",
    avatar:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300",
    permissions: ["REQUESTS", "POSTS"],
    status: "ACTIVE",
    assignedAt: "2026-04-24",
  },
  {
    id: "moderator-8",
    name: "Rohit Thapa",
    avatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300",
    permissions: ["POSTS", "REPORTS", "COMMENTS"],
    status: "ACTIVE",
    assignedAt: "2026-04-26",
  },
  {
    id: "moderator-9",
    name: "Puja Karki",
    avatar:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
    permissions: ["PIN", "COMMENTS"],
    status: "ACTIVE",
    assignedAt: "2026-04-27",
  },
  {
    id: "moderator-10",
    name: "Kiran Lama",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
    permissions: ["REPORTS", "REQUESTS", "BAN"],
    status: "ACTIVE",
    assignedAt: "2026-04-28",
  },
  {
    id: "moderator-11",
    name: "Rita Magar",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
    permissions: ["POSTS", "REPORTS"],
    status: "SUSPENDED",
    assignedAt: "2026-03-08",
  },
  {
    id: "moderator-12",
    name: "Sandesh Adhikari",
    avatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300",
    permissions: ["REQUESTS", "BAN", "COMMENTS"],
    status: "ACTIVE",
    assignedAt: "2026-04-29",
  },
];