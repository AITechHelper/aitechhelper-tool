import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aitechhelper.aisocialhelper",
  appName: "AI Social Helper",
  webDir: "www",
  server: {
    url: "https://www.aisocialhelper.com",
    cleartext: false,
  },
};

export default config;
