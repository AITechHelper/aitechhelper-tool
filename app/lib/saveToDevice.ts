// Saves a file (image or video) to the device.
// On iOS/Android: writes to cache then opens the native share sheet
//   → user taps "Save Image" or "Save Video" to save to Camera Roll.
// On web: falls back to a standard browser download.

import { Capacitor } from "@capacitor/core";

async function saveNative(url: string, filename: string): Promise<void> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  // Fetch the file and convert to base64
  const res = await fetch(url);
  const blob = await res.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Write to the device cache directory
  const written = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });

  // Open the native share sheet — user can tap "Save Image" / "Save Video"
  await Share.share({ files: [written.uri] });
}

function saveWeb(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function saveToDevice(url: string, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await saveNative(url, filename);
  } else {
    saveWeb(url, filename);
  }
}
