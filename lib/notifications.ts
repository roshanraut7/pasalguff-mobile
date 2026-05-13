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

  if (!hasPermission) {
    return null;
  }

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
    await createDefaultNotificationChannel();

    await notifee.displayNotification({
      title: remoteMessage.notification?.title ?? "Notification",
      body: remoteMessage.notification?.body ?? "",
      data: remoteMessage.data,
      android: {
        channelId: "default",
        pressAction: {
          id: "default",
        },
      },
    });

    onNotificationReceived?.();
  });
}