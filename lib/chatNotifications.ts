import notifee, { AndroidImportance } from "@notifee/react-native";

export type ChatNotificationData = {
  type?: string;
  chatId?: string;
  messageId?: string;
  senderId?: string;
  senderName?: string;
  unreadCount?: string;
  body?: string;
  route?: string;
};

export async function displayChatNotification(data: ChatNotificationData) {
  if (data.type !== "CHAT_MESSAGE" || !data.chatId) return;

  const channelId = await notifee.createChannel({
    id: "messages",
    name: "Messages",
    importance: AndroidImportance.HIGH,
    sound: "default",
  });

  const unreadCount = Number(data.unreadCount || 1);
  const senderName = data.senderName || "New message";

  await notifee.displayNotification({
    id: `chat-${data.chatId}`,
    title: senderName,
    body:
      unreadCount >= 5
        ? `${senderName} sent ${unreadCount} messages`
        : data.body || "New message",
    data: {
      ...data,
    },
    android: {
      channelId,
      smallIcon: "ic_launcher",

      // When user taps notification, it opens the app.
      pressAction: {
        id: "open-chat",
        launchActivity: "default",
      },
    },
  });
}