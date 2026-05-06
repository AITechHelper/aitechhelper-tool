import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aitechhelper.aisocialhelper",
  appName: "AI Social Helper",
  webDir: "www",
  server: {
    url: "https://www.aisocialhelper.com",
    cleartext: false,
    // Allow navigation within the app domain and Clerk auth domains
    allowNavigation: [
      "www.aisocialhelper.com",
      "aisocialhelper.com",
      "*.clerk.accounts.dev",
      "*.clerk.dev",
      "clerk.com",
      "*.clerk.com",
      "accounts.google.com",
      "*.google.com",
      "appleid.apple.com",
      "*.apple.com",
      "billing.stripe.com",
      "checkout.stripe.com",
      "*.stripe.com",
    ],
  },
  ios: {
    // Dark background matches the app's color scheme
    backgroundColor: "#0b1221",
    // Respect the safe area so content clears the notch/home indicator
    contentInset: "automatic",
    // Use WKWebView scroll behavior that feels native
    scrollEnabled: true,
    // Allow Clerk and other auth domains to load inside the WebView
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
