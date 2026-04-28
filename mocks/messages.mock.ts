export type OnlineUser = {
  id: string;
  name: string;
  avatar: string;
};

export type ConversationItem = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastSeenLabel: string;
  unreadCount: number;
  isOnline: boolean;
};

export type ChatMessage = {
  id: string;
  sender: "me" | "other";
  text: string;
  timestamp: string;
};

export const ONLINE_USERS: OnlineUser[] = [
  {
    id: "u1",
    name: "Roshan",
    avatar: "https://i.pravatar.cc/150?img=12",
  },
  {
    id: "u2",
    name: "Sita",
    avatar: "https://i.pravatar.cc/150?img=32",
  },
  {
    id: "u3",
    name: "Anish",
    avatar: "https://i.pravatar.cc/150?img=24",
  },
  {
    id: "u4",
    name: "Bikash",
    avatar: "https://i.pravatar.cc/150?img=15",
  },
  {
    id: "u5",
    name: "Nabin",
    avatar: "https://i.pravatar.cc/150?img=67",
  },
];

export const CONVERSATIONS: ConversationItem[] = [
  {
    id: "c1",
    name: "Roshan Raut",
    avatar: "https://i.pravatar.cc/150?img=12",
    lastMessage:
      "Bro, I checked the vendor pricing and I will send you the updated sheet tonight.",
    lastSeenLabel: "2m",
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: "c2",
    name: "Sita Traders",
    avatar: "https://i.pravatar.cc/150?img=32",
    lastMessage:
      "We can deliver the stock tomorrow morning if you confirm the final quantity today.",
    lastSeenLabel: "15m",
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "c3",
    name: "Anish Electronics",
    avatar: "https://i.pravatar.cc/150?img=24",
    lastMessage:
      "Okay, noted. I will call you after lunch and explain all the details properly.",
    lastSeenLabel: "1h",
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: "c4",
    name: "Bikash Suppliers",
    avatar: "https://i.pravatar.cc/150?img=15",
    lastMessage:
      "The quotation is ready. Please review it and tell me if any correction is needed.",
    lastSeenLabel: "Yesterday",
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "c5",
    name: "Nabin Store",
    avatar: "https://i.pravatar.cc/150?img=67",
    lastMessage:
      "Can you recommend a good wholesaler for kitchen accessories near Kalimati?",
    lastSeenLabel: "Mon",
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "c6",
    name: "Pasal Guff Support",
    avatar: "https://i.pravatar.cc/150?img=8",
    lastMessage:
      "Welcome to Pasal Guff. Let us know if you need help with communities, posts, or messages.",
    lastSeenLabel: "12 Apr",
    unreadCount: 0,
    isOnline: false,
  },
];

export const MESSAGES_BY_CONVERSATION: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: "m1",
      sender: "other",
      text: "Hey bro, are you free now?",
      timestamp: "2026-04-24T08:35:00.000Z",
    },
    {
      id: "m2",
      sender: "me",
      text: "Yes, tell me.",
      timestamp: "2026-04-24T08:36:00.000Z",
    },
    {
      id: "m3",
      sender: "other",
      text: "I checked the vendor pricing and there are a few changes.",
      timestamp: "2026-04-24T08:38:00.000Z",
    },
    {
      id: "m4",
      sender: "other",
      text: "Bro, I checked the vendor pricing and I will send you the updated sheet tonight.",
      timestamp: "2026-04-24T08:39:00.000Z",
    },
  ],
  c2: [
    {
      id: "m1",
      sender: "other",
      text: "We can deliver the stock tomorrow morning.",
      timestamp: "2026-04-24T06:15:00.000Z",
    },
    {
      id: "m2",
      sender: "me",
      text: "Okay, send me the final amount first.",
      timestamp: "2026-04-24T06:20:00.000Z",
    },
    {
      id: "m3",
      sender: "other",
      text: "Sure, I will share it in a moment.",
      timestamp: "2026-04-24T06:22:00.000Z",
    },
  ],
  c3: [
    {
      id: "m1",
      sender: "other",
      text: "Can I call you in one hour?",
      timestamp: "2026-04-24T05:10:00.000Z",
    },
    {
      id: "m2",
      sender: "me",
      text: "Yes, that works.",
      timestamp: "2026-04-24T05:13:00.000Z",
    },
  ],
  c4: [
    {
      id: "m1",
      sender: "other",
      text: "The quotation is ready.",
      timestamp: "2026-04-23T14:10:00.000Z",
    },
    {
      id: "m2",
      sender: "me",
      text: "Please send it as PDF.",
      timestamp: "2026-04-23T14:20:00.000Z",
    },
  ],
  c5: [
    {
      id: "m1",
      sender: "other",
      text: "Can you recommend a good wholesaler?",
      timestamp: "2026-04-21T10:00:00.000Z",
    },
  ],
  c6: [
    {
      id: "m1",
      sender: "other",
      text: "Welcome to Pasal Guff.",
      timestamp: "2026-04-12T08:00:00.000Z",
    },
  ],
};

export function getConversationById(id: string) {
  return CONVERSATIONS.find((item) => item.id === id);
}