export type AdminCommunityMock = {
  id: string;
  name: string;
  slug: string;
  avatarImage: string | null;
  category: {
    id: string;
    name: string;
  };
  admin: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  visibility: "PUBLIC" | "PRIVATE";
  status: "ACTIVE" | "INACTIVE";
  memberCount: number;
  bannedCount: number;
  postCount: number;
  createdAt: string;
};

export const adminCommunitiesMock: AdminCommunityMock[] = [
  {
    id: "com_001",
    name: "Mobile Sellers Nepal",
    slug: "mobile-sellers-nepal",
    avatarImage:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200",
    category: {
      id: "cat_001",
      name: "Electronics",
    },
    admin: {
      id: "usr_001",
      name: "Nikhil Adhikari",
      email: "nikhil@example.com",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    },
    visibility: "PUBLIC",
    status: "ACTIVE",
    memberCount: 245,
    bannedCount: 3,
    postCount: 82,
    createdAt: "2026-04-10T10:30:00.000Z",
  },
  {
    id: "com_002",
    name: "Laptop Repair Community",
    slug: "laptop-repair-community",
    avatarImage:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200",
    category: {
      id: "cat_002",
      name: "Repair Services",
    },
    admin: {
      id: "usr_002",
      name: "Aarav Sharma",
      email: "aarav@example.com",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200",
    },
    visibility: "PRIVATE",
    status: "ACTIVE",
    memberCount: 91,
    bannedCount: 1,
    postCount: 34,
    createdAt: "2026-04-15T08:15:00.000Z",
  },
  {
    id: "com_003",
    name: "Gaming PC Builders",
    slug: "gaming-pc-builders",
    avatarImage:
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=200",
    category: {
      id: "cat_001",
      name: "Electronics",
    },
    admin: {
      id: "usr_003",
      name: "Sita Rai",
      email: "sita@example.com",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    },
    visibility: "PUBLIC",
    status: "INACTIVE",
    memberCount: 130,
    bannedCount: 5,
    postCount: 47,
    createdAt: "2026-03-28T12:00:00.000Z",
  },
  {
    id: "com_004",
    name: "Second Hand Phones UK",
    slug: "second-hand-phones-uk",
    avatarImage:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200",
    category: {
      id: "cat_001",
      name: "Electronics",
    },
    admin: {
      id: "usr_004",
      name: "Raj Gurung",
      email: "raj@example.com",
      image: null,
    },
    visibility: "PRIVATE",
    status: "ACTIVE",
    memberCount: 67,
    bannedCount: 0,
    postCount: 19,
    createdAt: "2026-04-20T14:45:00.000Z",
  },
  {
    id: "com_005",
    name: "Camera Buyers Nepal",
    slug: "camera-buyers-nepal",
    avatarImage:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200",
    category: {
      id: "cat_003",
      name: "Photography",
    },
    admin: {
      id: "usr_005",
      name: "Mina Thapa",
      email: "mina@example.com",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    },
    visibility: "PUBLIC",
    status: "ACTIVE",
    memberCount: 188,
    bannedCount: 2,
    postCount: 61,
    createdAt: "2026-04-01T09:20:00.000Z",
  },
];