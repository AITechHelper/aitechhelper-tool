"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ScrollToTopLogic() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  // Ensure this only runs on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Instant scroll to top (no smooth behavior for reliability)
    window.scrollTo(0, 0);

    // If embedded in iframe, notify parent to scroll to iframe
    if (typeof window !== "undefined" && window.self !== window.top) {
      try {
        window.parent.postMessage({ type: "AIT_HELPER_SCROLL_TOP" }, "*");
      } catch (error) {
        // Silently fail if postMessage is blocked by security policies
        console.debug("Could not send scroll message to parent:", error);
      }
    }
  }, [pathname, searchParams.toString(), isClient]);

  return null;
}

export default function ScrollToTopOnRouteChange() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopLogic />
    </Suspense>
  );
}
