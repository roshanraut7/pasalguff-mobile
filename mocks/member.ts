// constants/community-dashboard/member.mock.ts

export type CommunityMemberStatus = "ACTIVE" | "PENDING" | "BANNED" | "LEFT";

export type CommunityDashboardMember = {
  id: string;
  name: string;
  avatar: string;
  status: CommunityMemberStatus;
  joinedAt: string;
};

export const communityMembersMock: CommunityDashboardMember[] = [
  {
    id: "member-1",
    name: "Nisha Rai",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
    status: "ACTIVE",
    joinedAt: "2026-04-18",
  },
  {
    id: "member-2",
    name: "Aarav Sharma",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
    status: "ACTIVE",
    joinedAt: "2026-04-20",
  },
  {
    id: "member-3",
    name: "Sujan Karki",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300",
    status: "PENDING",
    joinedAt: "2026-04-25",
  },
  {
    id: "member-4",
    name: "Pratiksha Thapa",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300",
    status: "BANNED",
    joinedAt: "2026-04-12",
  },
  {
    id: "member-5",
    name: "Bibek Gurung",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
    status: "LEFT",
    joinedAt: "2026-04-02",
  },
  {
    id: "member-6",
    name: "Sarina Tamang",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
    status: "ACTIVE",
    joinedAt: "2026-04-10",
  },
  {
    id: "member-7",
    name: "Rohit Thapa",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300",
    status: "ACTIVE",
    joinedAt: "2026-04-08",
  },
  {
    id: "member-8",
    name: "Asmita Gurung",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300",
    status: "PENDING",
    joinedAt: "2026-04-07",
  },
  {
    id: "member-9",
    name: "Kiran Lama",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
    status: "ACTIVE",
    joinedAt: "2026-04-06",
  },
  {
    id: "member-10",
    name: "Puja Karki",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
    status: "BANNED",
    joinedAt: "2026-04-05",
  },
  {
    id: "member-11",
    name: "Sandesh Adhikari",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300",
    status: "ACTIVE",
    joinedAt: "2026-04-04",
  },
  {
    id: "member-12",
    name: "Rita Magar",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300",
    status: "LEFT",
    joinedAt: "2026-04-03",
  },
];