"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Function to send height to parent iframe
function sendHeightToParent() {
  if (typeof window !== "undefined" && window.self !== window.top) {
    try {
      // Get the maximum height from multiple sources to ensure we capture everything
      const height = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      window.parent.postMessage({ type: "AIT_HELPER_HEIGHT", height }, "*");
    } catch (error) {
      console.debug("Could not send height to parent:", error);
    }
  }
}

function ScrollToTopLogic() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  // Ensure this only runs on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Send height updates on route change and periodically
  useEffect(() => {
    if (!isClient) return;

    // Send initial height
    sendHeightToParent();

    // Send height after a short delay (for dynamic content)
    const timeout1 = setTimeout(sendHeightToParent, 100);
    const timeout2 = setTimeout(sendHeightToParent, 500);
    const timeout3 = setTimeout(sendHeightToParent, 1000);

    // Set up ResizeObserver to detect content changes
    const resizeObserver = new ResizeObserver(() => {
      sendHeightToParent();
    });
    resizeObserver.observe(document.body);

    // Also listen for window resize
    window.addEventListener("resize", sendHeightToParent);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      resizeObserver.disconnect();
      window.removeEventListener("resize", sendHeightToParent);
    };
  }, [pathname, searchParams.toString(), isClient]);

  useEffect(() => {
    if (!isClient) return;

    // Instant scroll to top within iframe
    window.scrollTo(0, 0);

    // If embedded in iframe, try multiple methods to scroll parent
    if (typeof window !== "undefined" && window.self !== window.top) {
      const scrollParent = () => {
        try {
          // Method 1: Try direct scroll (works if same origin)
          window.top?.scrollTo(0, 0);
        } catch (e) {
          // Cross-origin, fall back to postMessage
        }

        try {
          // Method 2: postMessage to parent
          window.parent.postMessage({ type: "AIT_HELPER_SCROLL_TOP" }, "*");
        } catch (error) {
          console.debug("Could not send scroll message to parent:", error);
        }
      };

      // Send immediately and after delays
      scrollParent();
      setTimeout(scrollParent, 100);
      setTimeout(scrollParent, 250);
      setTimeout(scrollParent, 500);
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
