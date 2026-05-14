import { useCallback, useState } from "react";
import type { PostMedia } from "@/types/post";

type MediaViewerState = {
  visible: boolean;
  media: PostMedia[];
  index: number;
};

type ViewerInputMedia = {
  id?: string;
  type: PostMedia["type"];
  url: string;
  sortOrder?: number;
};
// The normalizeViewerMedia function takes an array of media items and ensures that each item has a unique ID and a sort order, which is necessary for the media viewer to function correctly.
function normalizeViewerMedia(media: ViewerInputMedia[]): PostMedia[] {
  return media.map((item, index) => ({
    id: item.id ?? `${item.url}-${index}`,
    type: item.type,
    url: item.url,
    sortOrder: item.sortOrder ?? index,
  })) as PostMedia[];
}
// This hook manages the state of a media viewer, allowing you to open and close it with a list of media items and a starting index.
export function usePostMediaViewer() {
  const [viewer, setViewer] = useState<MediaViewerState>({
    visible: false,
    media: [],
    index: 0,
  });
// The openViewer function takes an array of media items and an optional starting index, normalizes the media items, and updates the viewer state to show the viewer with the provided media.
  const openViewer = useCallback(
    (media: ViewerInputMedia[], startIndex: number = 0) => {
      setViewer({
        visible: true,
        media: normalizeViewerMedia(media),
        index: startIndex,
      });
    },
    [],
  );
// The closeViewer function simply updates the viewer state to hide the viewer while keeping the media and index intact.
  const closeViewer = useCallback(() => {
    setViewer((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return {
    viewer,
    openViewer,
    closeViewer,
  };
}