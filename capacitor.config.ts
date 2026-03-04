import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aitechhelper.aisocialhelper",
  appName: "AI Social Helper",
  webDir: "www",
  server: {
    url: "https://www.aisocialhelper.com",
    cleartext: false,
    // Allow navigation within the app domain
    allowNavigation: ["www.aisocialhelper.com", "aisocialhelper.com"],
  },
  ios: {
    // Dark background matches the app's color scheme
    backgroundColor: "#0b1221",
    // Respect the safe area so content clears the notch/home indicator
    contentInset: "automatic",
    // Use WKWebView scroll behavior that feels native
    scrollEnabled: true,
    // Disable the bounce/rubber-band on the outer WebView shell
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
