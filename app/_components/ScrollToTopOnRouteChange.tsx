"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Scroll the current window/iframe to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // If embedded in iframe, notify parent to scroll to iframe
    if (window.self !== window.top) {
      try {
        window.parent.postMessage({ type: "AIT_HELPER_SCROLL_TOP" }, "*");
      } catch (error) {
        // Silently fail if postMessage is blocked by security policies
        console.debug("Could not send scroll message to parent:", error);
      }
    }
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
}
