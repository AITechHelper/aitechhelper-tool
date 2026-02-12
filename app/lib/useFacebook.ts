"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

interface FacebookStatus {
  connected: boolean;
  pageName?: string;
}

export function useFacebook() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<FacebookStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/facebook/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silent fail
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
    const fbStatus = params.get("facebook");
    if (fbStatus === "connected") {
      setStatus({ connected: true, pageName: params.get("fb_page") || undefined });
      setIsLoading(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("facebook");
      url.searchParams.delete("fb_page");
      window.history.replaceState({}, "", url.toString());
    } else if (fbStatus === "error" || fbStatus === "denied") {
      setIsLoading(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("facebook");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const connect = useCallback(() => {
    window.location.href = "/api/facebook/connect";
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const res = await fetch("/api/facebook/status", { method: "DELETE" });
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
        throw new Error("Facebook not connected");
      }
      setIsPublishing(true);
      try {
        const res = await fetch("/api/facebook/publish", {
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
    pageName: status.pageName,
    isLoading,
    isPublishing,
    connect,
    disconnect,
    publish,
    refetch: fetchStatus,
  };
}
