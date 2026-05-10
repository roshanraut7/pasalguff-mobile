import { useEffect } from "react";
import { Platform } from "react-native";

import {
  getFcmToken,
  listenForegroundNotifications,
  listenForFcmTokenRefresh,
} from "@/lib/notifications";
import { useRegisterPushTokenMutation } from "@/store/api/notificationApi";

// Use your real session hook path
import { useSession } from "@/api/better-auth-client";

export default function NotificationBootstrap() {
  const { data: session } = useSession();
  const [registerPushToken] = useRegisterPushTokenMutation();

  useEffect(() => {
    if (!session?.user) return;

    let unsubscribeTokenRefresh: (() => void) | undefined;
    let unsubscribeForeground: (() => void) | undefined;

    async function setupNotifications() {
      try {
        const token = await getFcmToken();

        if (token) {
          await registerPushToken({
            token,
            platform: Platform.OS,
          }).unwrap();

          console.log("Push token saved to backend");
        }

        unsubscribeTokenRefresh = listenForFcmTokenRefresh(async (newToken) => {
          await registerPushToken({
            token: newToken,
            platform: Platform.OS,
          }).unwrap();

          console.log("Refreshed push token saved to backend");
        });

        unsubscribeForeground = listenForegroundNotifications();
      } catch (error) {
        console.log("Notification setup failed:", error);
      }
    }

    setupNotifications();

    return () => {
      unsubscribeTokenRefresh?.();
      unsubscribeForeground?.();
    };
  }, [session?.user, registerPushToken]);

  return null;
}