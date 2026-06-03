import { useEffect } from "react";
import { Platform } from "react-native";
import { useDispatch } from "react-redux";

import { useSession } from "@/api/better-auth-client";
import {
  getFcmToken,
  listenForegroundNotifications,
  listenForFcmTokenRefresh,
} from "@/lib/notifications";
import {
  notificationApi,
  useRegisterPushTokenMutation,
} from "@/store/api/notificationApi";

export default function NotificationBootstrap() {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const [registerPushToken] = useRegisterPushTokenMutation();

  // Use only primitive userId, not the full session.user object.
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    /*
     * Register listeners immediately.
     * This makes cleanup reliable and avoids old async setup
     * finishing later and leaving duplicate listeners active.
     */
    const unsubscribeForeground = listenForegroundNotifications(() => {
      if (cancelled) return;

      dispatch(notificationApi.util.invalidateTags(["Notifications"]));
    });

    const unsubscribeTokenRefresh = listenForFcmTokenRefresh((newToken) => {
      if (cancelled) return;

      void registerPushToken({
        token: newToken,
        platform: Platform.OS,
      })
        .unwrap()
        .then(() => {
          console.log("Refreshed push token saved to backend");
        })
        .catch((error) => {
          console.log("Failed to save refreshed push token:", error);
        });
    });

    async function registerCurrentToken() {
      try {
        const token = await getFcmToken();

        if (cancelled || !token) return;

        await registerPushToken({
          token,
          platform: Platform.OS,
        }).unwrap();

        console.log("Push token saved to backend");
      } catch (error) {
        if (!cancelled) {
          console.log("Notification setup failed:", error);
        }
      }
    }

    void registerCurrentToken();

    return () => {
      cancelled = true;

      unsubscribeForeground();
      unsubscribeTokenRefresh();

      console.log("Notification listeners removed");
    };
  }, [userId, registerPushToken, dispatch]);

  return null;
}