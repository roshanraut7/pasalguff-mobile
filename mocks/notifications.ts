import { Ionicons } from "@expo/vector-icons";

export type NotificationCategory =
  | "POST"
  | "REQUEST"
  | "MODERATION"
  | "COMMUNITY"
  | "SYSTEM";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  section: "Today" | "Yesterday" | "Earlier";
  category: NotificationCategory;
  isRead: boolean;
  actorImage?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  hasActions?: boolean;
};

export const notificationsMock: AppNotification[] = [
  {
    id: "noti_001",
    title: "New join request",
    message: "Mina Thapa requested to join Laptop Repair Community.",
    time: "2 min ago",
    section: "Today",
    category: "REQUEST",
    isRead: false,
    actorImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    icon: "person-add-outline",
    hasActions: true,
  },
  {
    id: "noti_002",
    title: "Ram commented on your post",
    message: "Is this iPhone 13 still available?",
    time: "18 min ago",
    section: "Today",
    category: "POST",
    isRead: false,
    actorImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    icon: "chatbubble-ellipses-outline",
  },
  {
    id: "noti_003",
    title: "Your post got new likes",
    message: "Sita and 12 others liked your post in Mobile Sellers Nepal.",
    time: "1h ago",
    section: "Today",
    category: "POST",
    isRead: true,
    actorImage: null,
    icon: "heart-outline",
  },
  {
    id: "noti_004",
    title: "Join request approved",
    message: "You can now view posts in Gaming PC Builders.",
    time: "Yesterday",
    section: "Yesterday",
    category: "COMMUNITY",
    isRead: true,
    actorImage: null,
    icon: "checkmark-circle-outline",
  },
  {
    id: "noti_005",
    title: "Moderation alert",
    message: "One post was removed because it broke community rules.",
    time: "Yesterday",
    section: "Yesterday",
    category: "MODERATION",
    isRead: false,
    actorImage: null,
    icon: "shield-checkmark-outline",
  },
  {
    id: "noti_006",
    title: "Community update",
    message: "Mobile Sellers Nepal updated its community rules.",
    time: "3 days ago",
    section: "Earlier",
    category: "SYSTEM",
    isRead: true,
    actorImage: null,
    icon: "notifications-outline",
  },
];