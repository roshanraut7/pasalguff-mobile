import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  getPostPublicLink,
  getPostShareMessage,
} from "@/utils/post/post-share-utils";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "heroui-native";
import * as Clipboard from "expo-clipboard";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useGetMyFollowingQuery, type FollowItem } from "@/store/api/followApi";
import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import type { CommunityItem } from "@/types/community";
import type { CommunityPost } from "@/types/post";

export type ShareBottomSheetRef = {
  present: (post: CommunityPost) => void;
  dismiss: () => void;
};

type ShareBottomSheetProps = {
  onShareExternal: (post: CommunityPost) => void;
  onShareToFriends: (
    post: CommunityPost,
    targetUserIds: string[],
    message?: string,
  ) => Promise<unknown>;
  onShareToFeed: (
    post: CommunityPost,
    targetCommunityId: string,
    content?: string,
  ) => Promise<unknown>;
  onLinkCopied?: () => void;
};

const NUM_COLUMNS = 4;
const SEARCH_DEBOUNCE_MS = 300;

function getUserName(user: FollowItem["user"]) {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (full) return full;
  if (user.name?.trim()) return user.name.trim();
  if (user.businessName?.trim()) return user.businessName.trim();
  return user.displayName || "Unknown user";
}

function getFirstName(fullName: string) {
  return fullName.split(" ")[0] || fullName;
}

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0]?.charAt(0)?.toUpperCase() || "U";
  return `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
}

type ShareAppConfig = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
};

const SHARE_APPS: ShareAppConfig[] = [
  { id: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp", color: "#25D366" },
  { id: "messenger", label: "Messenger", icon: "chatbubble-ellipses", color: "#0084FF" },
  { id: "telegram", label: "Telegram", icon: "paper-plane", color: "#229ED9" },
  { id: "copy", label: "Copy link", icon: "link-outline", color: "#8E8E93" },
  { id: "more", label: "More", icon: "ellipsis-horizontal", color: "#8E8E93" },
];

const ShareBottomSheet = forwardRef<ShareBottomSheetRef, ShareBottomSheetProps>(
  ({ onShareExternal, onShareToFriends, onShareToFeed, onLinkCopied }, ref) => {
    const { colors } = useAppTheme();
    const sheetRef = useRef<BottomSheetModal>(null);

    const [post, setPost] = useState<CommunityPost | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSharing, setIsSharing] = useState(false);
    const [shareMode, setShareMode] = useState<"friends" | "feed">("friends");

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // ------------------------------------------------------------
    // FIX (root cause of "unwanted word appears" / "clearing glitches"):
    // The caption used to be a CONTROLLED input (`value={message}` +
    // `setMessage` on every keystroke). Every keystroke re-ran this
    // entire component's function body — recomputing the following/
    // communities lists, avatars, etc. On any real device that render
    // work takes long enough that the JS-side state falls a beat behind
    // the native text field, so the two get out of sync: React "corrects"
    // the input back to a slightly-stale value mid-type, which looks
    // like random insert/delete of characters.
    //
    // Fix: make it UNCONTROLLED, exactly like the comment box in
    // CommentPostModal. Typing only writes into a ref — it never
    // triggers a re-render of this component. We only re-render when
    // `hasCaption` flips (for enabling/disabling UI), which happens at
    // most twice per typing session (empty -> non-empty, non-empty ->
    // empty), not once per letter.
    // ------------------------------------------------------------
    const captionInputRef = useRef<TextInput>(null);
    const captionTextRef = useRef("");
    const [hasCaption, setHasCaption] = useState(false);
    const [captionResetKey, setCaptionResetKey] = useState(0);

    const handleCaptionChange = useCallback((text: string) => {
      captionTextRef.current = text;
      const nonEmpty = text.trim().length > 0;
      setHasCaption((prev) => (prev !== nonEmpty ? nonEmpty : prev));
    }, []);

    const clearCaption = useCallback(() => {
      captionInputRef.current?.clear();
      captionTextRef.current = "";
      setHasCaption(false);
      // bump key so the uncontrolled input remounts with a clean
      // defaultValue too (belt-and-braces alongside .clear()).
      setCaptionResetKey((k) => k + 1);
    }, []);

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedQuery(searchQuery.trim());
      }, SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }, [searchQuery]);

    // FIX (search "auto-appearing text" bug): switching between Friends/Feed
    // tabs used to leave the previous tab's search text + debounced value in
    // place, so the newly-shown list would immediately filter against stale
    // text the user never typed for it. Clear both whenever the mode changes.
    const handleChangeShareMode = useCallback((mode: "friends" | "feed") => {
      setShareMode(mode);
      setSearchQuery("");
      setDebouncedQuery("");
    }, []);

    const { data, isLoading, isFetching } = useGetMyFollowingQuery(
      { limit: 100, search: debouncedQuery || undefined },
      { skip: !post || shareMode !== "friends" },
    );

    const { data: communitiesData, isLoading: isLoadingCommunities, isFetching: isFetchingCommunities } =
      useGetMyCommunitiesQuery(
        { limit: 100, search: debouncedQuery || undefined },
        { skip: !post || shareMode !== "feed" },
      );

    const followingList = data?.data ?? [];
    const communitiesList = communitiesData?.data ?? [];

    const snapPoints = useMemo(() => ["92%"], []);

    const resetState = useCallback(() => {
      setSelectedIds(new Set());
      setSearchQuery("");
      setDebouncedQuery("");
      setShareMode("friends");
      clearCaption();
    }, [clearCaption]);

    useImperativeHandle(ref, () => ({
      present: (targetPost) => {
        setPost(targetPost);
        resetState();
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const handleSheetChange = useCallback(
      (index: number) => {
        if (index === -1) {
          setPost(null);
          resetState();
        }
      },
      [resetState],
    );

    const toggleSelected = useCallback((userId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return next;
      });
    }, []);

    // Reads the caption from the ref at submit time — no state
    // round-trip needed, exactly like handleSubmitPress in CommentPostModal.
    const handleConfirmShare = useCallback(async () => {
      if (!post || selectedIds.size === 0 || isSharing) return;

      const caption = captionTextRef.current.trim();

      setIsSharing(true);
      try {
        await onShareToFriends(post, Array.from(selectedIds), caption || undefined);
        sheetRef.current?.dismiss();
      } catch {
        // error already logged upstream — keep the sheet open so the user can retry
      } finally {
        setIsSharing(false);
      }
    }, [post, selectedIds, isSharing, onShareToFriends]);

    const handleConfirmShareToFeed = useCallback(
      async (communityId: string) => {
        if (!post || isSharing) return;

        const caption = captionTextRef.current.trim();

        setIsSharing(true);
        try {
          await onShareToFeed(post, communityId, caption || undefined);
          sheetRef.current?.dismiss();
        } catch {
          // error already logged upstream — keep the sheet open so the user can retry
        } finally {
          setIsSharing(false);
        }
      },
      [post, isSharing, onShareToFeed],
    );

    const handleShareAppPress = useCallback(
      async (app: ShareAppConfig) => {
        if (!post) return;

        try {
          if (app.id === "whatsapp") {
            const text = getPostShareMessage(post);
            const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
            const supported = await Linking.canOpenURL(url);
            if (supported) {
              await Linking.openURL(url);
              sheetRef.current?.dismiss();
              return;
            }
            await Linking.openURL(
              Platform.OS === "ios"
                ? "https://apps.apple.com/app/whatsapp-messenger/id310633997"
                : "market://details?id=com.whatsapp",
            );
            return;
          }

          if (app.id === "copy") {
            await Clipboard.setStringAsync(getPostPublicLink(post));
            onLinkCopied?.();
            sheetRef.current?.dismiss();
            return;
          }

          await Clipboard.setStringAsync(getPostPublicLink(post));
          onShareExternal(post);
          sheetRef.current?.dismiss();
        } catch {
          // user cancelled the native sheet, clipboard failed, or Linking failed — no-op
        }
      },
      [post, onShareExternal, onLinkCopied],
    );

    const renderItem = useCallback(
      ({ item }: { item: FollowItem }) => {
        const fullName = getUserName(item.user);
        const firstName = getFirstName(fullName);
        const isSelected = selectedIds.has(item.user.id);

        return (
          <Pressable onPress={() => toggleSelected(item.user.id)} style={styles.gridCell}>
            <View
              style={[
                styles.avatarRing,
                { borderColor: isSelected ? colors.accent : "transparent" },
              ]}
            >
              <Avatar alt="" size="lg" variant="soft" color="accent">
                {item.user.image ? (
                  <Avatar.Image
                    source={{ uri: toAbsoluteFileUrl(item.user.image) ?? undefined }}
                  />
                ) : null}
                <Avatar.Fallback>{getInitials(fullName)}</Avatar.Fallback>
              </Avatar>

              {isSelected ? (
                <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                </View>
              ) : null}
            </View>

            <Text numberOfLines={1} style={[styles.gridName, { color: colors.foreground }]}>
              {firstName}
            </Text>
          </Pressable>
        );
      },
      [colors, selectedIds, toggleSelected],
    );

    const renderCommunityItem = useCallback(
      ({ item }: { item: CommunityItem }) => (
        <Pressable
          onPress={() => void handleConfirmShareToFeed(item.id)}
          style={styles.gridCell}
          disabled={isSharing}
        >
          <View style={[styles.avatarRing, { borderColor: "transparent" }]}>
            <Avatar alt="" size="lg" variant="soft" color="accent">
              {item.avatarImage ? (
                <Avatar.Image
                  source={{ uri: toAbsoluteFileUrl(item.avatarImage) ?? undefined }}
                />
              ) : null}
              <Avatar.Fallback>{item.name.charAt(0).toUpperCase()}</Avatar.Fallback>
            </Avatar>
          </View>

          <Text numberOfLines={1} style={[styles.gridName, { color: colors.foreground }]}>
            {item.name}
          </Text>
        </Pressable>
      ),
      [colors, isSharing, handleConfirmShareToFeed],
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      [],
    );

    const renderGridHeader = useCallback(
      () => (
        <View>
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => handleChangeShareMode("friends")}
              style={[
                styles.modeTab,
                shareMode === "friends" && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={15}
                color={shareMode === "friends" ? "#fff" : colors.muted}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: shareMode === "friends" ? "#fff" : colors.muted },
                ]}
              >
                Friends
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleChangeShareMode("feed")}
              style={[
                styles.modeTab,
                shareMode === "feed" && { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="repeat-outline"
                size={15}
                color={shareMode === "feed" ? "#fff" : colors.muted}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: shareMode === "feed" ? "#fff" : colors.muted },
                ]}
              >
                Share to Feed
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            {shareMode === "friends" ? "Share with" : "Post to community"}
          </Text>

          {shareMode === "feed" ? (
            <Text style={[styles.feedHintText, { color: colors.muted }]}>
              Tap a community below to post with the caption you wrote above.
            </Text>
          ) : null}
        </View>
      ),
      [colors, shareMode, handleChangeShareMode],
    );

    const renderAppsSection = useCallback(
      () => (
        <View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>Share to apps</Text>
          <View style={styles.appsRow}>
            {SHARE_APPS.map((app) => (
              <Pressable
                key={app.id}
                onPress={() => handleShareAppPress(app)}
                style={styles.appCell}
              >
                <View style={[styles.appIconCircle, { backgroundColor: app.color }]}>
                  <Ionicons name={app.icon} size={20} color="#fff" />
                </View>
                <Text numberOfLines={1} style={[styles.gridName, { color: colors.foreground }]}>
                  {app.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ height: 24 }} />
        </View>
      ),
      [colors, handleShareAppPress],
    );

    // Footer only ever holds a button/hint — nothing focusable — and its
    // deps no longer include the caption text, so it's safe for it to
    // re-render on `hasCaption` flips without ever stealing keyboard focus.
    const renderFooter = useCallback(
      (footerProps: any) => {
        return (
          <BottomSheetFooter {...footerProps} bottomInset={0}>
            <View
              style={[
                styles.footer,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              {shareMode === "friends" ? (
                <Pressable
                  onPress={handleConfirmShare}
                  disabled={selectedIds.size === 0 || isSharing}
                  style={[
                    styles.shareButton,
                    { backgroundColor: colors.accent },
                    (selectedIds.size === 0 || isSharing) && styles.shareButtonDisabled,
                  ]}
                >
                  <Text style={styles.shareButtonText}>
                    {isSharing ? "Sharing..." : `Share${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.feedFooterHintWrap}>
                  <Text style={[styles.feedFooterHintText, { color: colors.muted }]}>
                    {isSharing ? "Sharing..." : "Tap a community above to share with this caption"}
                  </Text>
                </View>
              )}
            </View>
          </BottomSheetFooter>
        );
      },
      [colors, selectedIds.size, isSharing, handleConfirmShare, shareMode],
    );

    const activeIsLoading = shareMode === "friends" ? isLoading : isLoadingCommunities;
    const activeIsFetching = shareMode === "friends" ? isFetching : isFetchingCommunities;

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        onChange={handleSheetChange}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.muted }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Share post</Text>
        </View>

        {/*
          CAPTION — uncontrolled, same pattern as CommentPostModal's comment
          box. `key={captionResetKey}` lets us force a clean remount with a
          fresh defaultValue only when we explicitly need to (opening a new
          post, or after a successful/failed share) — NOT on every keystroke,
          since nothing here re-renders per keystroke anymore.
        */}
        <View style={styles.captionWrap}>
          <BottomSheetTextInput
            key={captionResetKey}
            ref={captionInputRef as any}
            defaultValue=""
            onChangeText={handleCaptionChange}
            placeholder="Say something about this post..."
            placeholderTextColor={colors.muted}
            style={[styles.captionInput, { color: colors.foreground, borderColor: colors.border }]}
            multiline
            maxLength={250}
          />
        </View>

        {/* Fixed-width trailing icon slot below prevents the row from
            reflowing mid-keystroke when isFetching toggles, which was
            causing dropped/jumbled characters in the input. */}
        <View style={[styles.searchWrap, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <BottomSheetTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <View style={styles.searchTrailingIcon}>
            {activeIsFetching && debouncedQuery ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {activeIsLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <BottomSheetFlatList
            data={
              shareMode === "friends"
                ? (followingList as any)
                : (communitiesList as any)
            }
            keyExtractor={(item: any) => item.id}
            renderItem={
              shareMode === "friends"
                ? (renderItem as any)
                : (renderCommunityItem as any)
            }
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={renderGridHeader}
            ListFooterComponent={shareMode === "friends" ? renderAppsSection : undefined}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {shareMode === "friends"
                  ? debouncedQuery
                    ? `No results for "${debouncedQuery}"`
                    : "You are not following anyone yet."
                  : debouncedQuery
                    ? `No results for "${debouncedQuery}"`
                    : "You haven't joined any communities yet."}
              </Text>
            }
          />
        )}
      </BottomSheetModal>
    );
  },
);

ShareBottomSheet.displayName = "ShareBottomSheet";
export default ShareBottomSheet;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: { fontSize: 16, fontFamily: "Poppins_700Bold" },
  loadingWrap: { paddingVertical: 30, alignItems: "center" },

  captionWrap: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  captionInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
    maxHeight: 100,
    textAlignVertical: "top",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  searchTrailingIcon: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  modeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  modeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(120,120,120,0.12)",
  },
  modeTabText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  sectionLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  feedHintText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 8,
  },

  gridContent: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 140,
  },
  gridCell: {
    width: `${100 / NUM_COLUMNS}%`,
    alignItems: "center",
    paddingVertical: 10,
    gap: 6,
  },
  avatarRing: {
    borderWidth: 2,
    borderRadius: 999,
    padding: 2,
  },
  checkBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  gridName: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    maxWidth: 76,
    textAlign: "center",
  },

  emptyText: { textAlign: "center", paddingVertical: 30, fontSize: 13, fontFamily: "Poppins_400Regular" },

  appsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  appCell: { width: 64, alignItems: "center", gap: 6 },
  appIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
  },
  shareButton: { borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  shareButtonDisabled: { opacity: 0.5 },
  shareButtonText: { color: "#fff", fontSize: 14, fontFamily: "Poppins_600SemiBold" },
  feedFooterHintWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  feedFooterHintText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
  },
});