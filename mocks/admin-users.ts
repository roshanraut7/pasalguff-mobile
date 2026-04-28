export type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  businessName: string;
  businessType: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  joinedAtLabel: string;
  joinedAtTs: number;
  avatarUrl?: string;
};

export const adminUsersMock: AdminUserRow[] = [
  {
    id: "usr_001",
    fullName: "Roshan Raut",
    email: "roshan@example.com",
    businessName: "Roshan Electronics",
    businessType: "Retail",
    status: "ACTIVE",
    joinedAtLabel: "12 Apr 2026",
    joinedAtTs: new Date("2026-04-12").getTime(),
    avatarUrl: "https://i.pravatar.cc/100?img=12",
  },
  {
    id: "usr_002",
    fullName: "Sita Sharma",
    email: "sita@example.com",
    businessName: "Sita Traders",
    businessType: "Wholesale",
    status: "ACTIVE",
    joinedAtLabel: "10 Apr 2026",
    joinedAtTs: new Date("2026-04-10").getTime(),
    avatarUrl: "https://i.pravatar.cc/100?img=32",
  },
  {
    id: "usr_003",
    fullName: "Anish Karki",
    email: "anish@example.com",
    businessName: "Anish Mobile Hub",
    businessType: "Electronics",
    status: "SUSPENDED",
    joinedAtLabel: "08 Apr 2026",
    joinedAtTs: new Date("2026-04-08").getTime(),
    avatarUrl: "https://i.pravatar.cc/100?img=15",
  },
  {
    id: "usr_004",
    fullName: "Nabin Thapa",
    email: "nabin@example.com",
    businessName: "Nabin Suppliers",
    businessType: "Distributor",
    status: "INACTIVE",
    joinedAtLabel: "06 Apr 2026",
    joinedAtTs: new Date("2026-04-06").getTime(),
    avatarUrl: "https://i.pravatar.cc/100?img=20",
  },
  {
    id: "usr_005",
    fullName: "Mina Gurung",
    email: "mina@example.com",
    businessName: "Mina Fashion Corner",
    businessType: "Fashion",
    status: "ACTIVE",
    joinedAtLabel: "03 Apr 2026",
    joinedAtTs: new Date("2026-04-03").getTime(),
    avatarUrl: "https://i.pravatar.cc/100?img=47",
  },
];