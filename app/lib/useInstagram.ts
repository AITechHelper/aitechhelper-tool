"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

interface InstagramStatus {
  connected: boolean;
  username?: string;
  tokenExpired?: boolean;
}

export function useInstagram() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<InstagramStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/instagram/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silent fail — user just won't see Instagram as connected
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    fetchStatus();
  }, [isLoaded, user?.id, fetchStatus]);

  // Check URL params for connection result (after OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const igStatus = params.get("instagram");
    if (igStatus === "connected") {
      setStatus({ connected: true, username: params.get("ig_user") || undefined });
      setIsLoading(false);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("instagram");
      url.searchParams.delete("ig_user");
      window.history.replaceState({}, "", url.toString());
    } else if (igStatus === "error" || igStatus === "denied") {
      setIsLoading(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("instagram");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const connect = useCallback(() => {
    window.location.href = "/api/instagram/connect";
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram/status", { method: "DELETE" });
      if (res.ok) {
        setStatus({ connected: false });
      }
    } catch {
      // Silent fail
    }
  }, []);

  const publish = useCallback(
    async (imageBase64: string, caption: string, hashtags: string) => {
      if (!status.connected) {
        throw new Error("Instagram not connected");
      }
      setIsPublishing(true);
      try {
        const res = await fetch("/api/instagram/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, caption, hashtags }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to publish");
        }
        return data;
      } finally {
        setIsPublishing(false);
      }
    },
    [status.connected]
  );

  return {
    connected: status.connected,
    username: status.username,
    tokenExpired: status.tokenExpired,
    isLoading,
    isPublishing,
    connect,
    disconnect,
    publish,
    refetch: fetchStatus,
  };
}
