"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

// Registers the device for push notifications on app load.
// Handles permission request, token retrieval, and server registration.
// Only runs on native iOS/Android (Capacitor) — no-ops on web.
export function useNotifications() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    registerForPushNotifications();
  }, [isLoaded, user?.id]);
}

async function registerForPushNotifications() {
  try {
    // Capacitor is only available in the native app — bail out on web
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Request permission
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return;

    // Register with the push service (APNs on iOS, FCM on Android)
    await PushNotifications.register();

    // Listen for the token once registration succeeds
    PushNotifications.addListener("registration", async (token) => {
      const platform = Capacitor.getPlatform() as "ios" | "android";
      try {
        await fetch("/api/notifications/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value, platform }),
        });
      } catch {
        // Silent fail — token will be re-registered next launch
      }
    });

    // Handle a notification tap while the app is in the background or closed
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data;
      if (data?.type === "scheduled_posts") {
        // Deep-link into the calendar so they can review and publish
        window.location.href = "/calendar";
      }
    });
  } catch {
    // Not a native platform or PushNotifications unavailable — ignore
  }
}
