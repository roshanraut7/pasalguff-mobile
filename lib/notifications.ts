import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  requestPermission,
} from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import { PermissionsAndroid, Platform } from "react-native";

export async function requestNotificationPermission() {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    const androidPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    if (androidPermission !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  const messaging = getMessaging(getApp());
  const authStatus = await requestPermission(messaging);

  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

// ✅ Call this ONCE at app start, not on every notification
export async function createDefaultNotificationChannel() {
  if (Platform.OS !== "android") return;

  await notifee.createChannel({
    id: "default",
    name: "Default",
    importance: AndroidImportance.HIGH,
    sound: "default",
  });
}

export async function getFcmToken() {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return null;

  // ✅ Channel created once here during setup
  await createDefaultNotificationChannel();

  const messaging = getMessaging(getApp());
  const token = await getToken(messaging);
  return token || null;
}

export function listenForFcmTokenRefresh(
  onTokenRefreshCallback: (token: string) => void,
) {
  const messaging = getMessaging(getApp());
  return onTokenRefresh(messaging, onTokenRefreshCallback);
}

export function listenForegroundNotifications(
  onNotificationReceived?: () => void,
) {
  const messaging = getMessaging(getApp());

  return onMessage(messaging, async (remoteMessage) => {
  console.log("FOREGROUND MESSAGE RECEIVED:", {
    messageId: remoteMessage.messageId,
    notificationId: remoteMessage.data?.notificationId,
  });

  const title = (remoteMessage.data?.title as string) ?? "Notification";
  const body = (remoteMessage.data?.body as string) ?? "";

  await notifee.displayNotification({
    title,
    body,
    data: remoteMessage.data,
    android: {
      channelId: "default",
      pressAction: { id: "default" },
      sound: "default",
    },
    ios: {
      sound: "default",
    },
  });

  onNotificationReceived?.();
});
}