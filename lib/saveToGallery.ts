// lib/saveToGallery.ts
import * as MediaLibrary from "expo-media-library";
import { File, Paths } from "expo-file-system";

export async function saveImageToGallery(remoteUrl: string) {
  const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();

  if (status !== "granted") {
    return { success: false, reason: canAskAgain ? "denied" : "blocked" } as const;
  }

  const fileName = remoteUrl.split("/").pop()?.split("?")[0] || `image-${Date.now()}.jpg`;

  // New API: File.downloadFileAsync downloads directly into Paths.cache
  const file = await File.downloadFileAsync(remoteUrl, Paths.cache);

  const asset = await MediaLibrary.createAssetAsync(file.uri);
  await MediaLibrary.createAlbumAsync("YourAppName", asset, false);

  return { success: true } as const;
}