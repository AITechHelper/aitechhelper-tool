"use client";

import { useNotifications } from "../lib/useNotifications";

export default function NotificationsProvider() {
  useNotifications();
  return null;
}
