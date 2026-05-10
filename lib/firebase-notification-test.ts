import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  requestPermission,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";

export async function testFirebaseNotificationSetup() {
  try {
    console.log("Checking Firebase notification setup...");

    if (Platform.OS === "android" && Platform.Version >= 33) {
      const androidPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      console.log("Android notification permission:", androidPermission);

      if (androidPermission !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Notification permission denied.");
        return null;
      }
    }

    const app = getApp();
    const messaging = getMessaging(app);

    const authStatus = await requestPermission(messaging);

    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    console.log("Firebase notification permission enabled:", enabled);

    if (!enabled) {
      console.log("Firebase notification permission not granted.");
      return null;
    }

    const token = await getToken(messaging);

    console.log("FCM TOKEN VALUE START");
    console.log(token);
    console.log("FCM TOKEN VALUE END");

    if (!token) {
      console.log("FCM token is empty. Check google-services.json and rebuild.");
      return null;
    }

    console.log("FCM TOKEN LENGTH:", token.length);

    return token;
  } catch (error) {
    console.log("Firebase notification test failed:", error);
    return null;
  }
}