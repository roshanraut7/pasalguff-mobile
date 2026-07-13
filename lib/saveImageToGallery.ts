// lib/saveToGallery.ts
import * as MediaLibrary from "expo-media-library";
import { File, Paths } from "expo-file-system";

export async function saveImageToGallery(remoteUrl: string) {
  // Permission handling
  const current = await MediaLibrary.getPermissionsAsync(true);
  let status = current.status;
  let canAskAgain = current.canAskAgain;

  if (status !== "granted") {
    const requested = await MediaLibrary.requestPermissionsAsync(true);
    status = requested.status;
    canAskAgain = requested.canAskAgain;
  }

  if (status !== "granted") {
    if (!canAskAgain) {
      return { success: false, reason: "blocked" } as const;
    }
    return { success: false, reason: "denied" } as const;
  }

  const fileName = remoteUrl.split("/").pop()?.split("?")[0] || `image-${Date.now()}.jpg`;
  
  // Create unique temp filename
  const tempFileName = `temp_${Date.now()}_${fileName}`;
  const tempFile = new File(Paths.cache, tempFileName);

  try {
    // Download
    const downloadResult = await File.downloadFileAsync(remoteUrl, tempFile);

    if (!downloadResult.exists) {
      throw new Error("Download failed");
    }

    // Save to gallery
    const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
    await MediaLibrary.createAlbumAsync("YourAppName", asset, false);

    return { success: true } as const;
  } catch (error) {
    console.error("Save image failed:", error);
    return { success: false, reason: "error" } as const;
  } finally {
    // Cleanup - no arguments!
    try {
      await tempFile.delete();
    } catch (cleanupError) {
      // Ignore cleanup errors (file might not exist, etc.)
    }
  }
}