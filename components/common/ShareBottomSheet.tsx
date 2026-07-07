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
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  /** Called after a successful "Copy link" tap, e.g. to show a toast. */
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

/**
 * The URL used for "Copy link" and as the link portion of external
 * app shares. Assumes the API now returns a public shareUrl on the
 * post; falls back to a web route built from the id if not.
 */
function getShareUrl(post: CommunityPost) {
  return (post as any).shareUrl ?? `https://yourapp.com/p/${post.id}`;
}

function buildShareText(post: CommunityPost) {
  return `Check this out: ${getShareUrl(post)}`;
}

// ------------------------------------------------------------
// Row of external apps shown below the friends grid, Instagram-
// style. WhatsApp gets a real deep link since its scheme reliably
// accepts pre-filled text. Messenger/Telegram/"More" fall back to
// the native share sheet — deep-linking those with pre-filled
// content is unreliable without each platform's own SDK wired in,
// and the native sheet already lists them as options anyway.
// ------------------------------------------------------------
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
  ({ onShareExternal, onShareToFriends, onLinkCopied }, ref) => {
    const { colors } = useAppTheme();
    const sheetRef = useRef<BottomSheetModal>(null);

    const [post, setPost] = useState<CommunityPost | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    // Raw text as typed vs. the debounced value actually sent to the API.
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedQuery(searchQuery.trim());
      }, SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }, [searchQuery]);

    // Only fetches once the sheet is actually opened for a post.
    // Re-fetches automatically whenever debouncedQuery changes.
    const { data, isLoading, isFetching } = useGetMyFollowingQuery(
      { limit: 100, search: debouncedQuery || undefined },
      { skip: !post },
    );

    const followingList = data?.data ?? [];
    const snapPoints = useMemo(() => ["70%"], []);

    const resetState = useCallback(() => {
      setSelectedIds(new Set());
      setMessage("");
      setSearchQuery("");
      setDebouncedQuery("");
    }, []);

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

    const handleConfirmShare = useCallback(async () => {
      if (!post || selectedIds.size === 0 || isSharing) return;

      setIsSharing(true);
      try {
        await onShareToFriends(post, Array.from(selectedIds), message);
        sheetRef.current?.dismiss();
      } catch {
        // error already logged upstream — keep the sheet open so the user can retry
      } finally {
        setIsSharing(false);
      }
    }, [post, selectedIds, message, isSharing, onShareToFriends]);

    // ------------------------------------------------------------
    // External app row handler. WhatsApp uses a real deep link;
    // "Copy link" uses the clipboard directly; everything else routes
    // through the native share sheet, which Android/iOS populate with
    // whatever's installed (Messenger, Telegram, Instagram, Mail, etc.)
    // automatically.
    // ------------------------------------------------------------
    const handleShareAppPress = useCallback(
      async (app: ShareAppConfig) => {
        if (!post) return;

        try {
          if (app.id === "whatsapp") {
            const text = buildShareText(post);
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
            await Clipboard.setStringAsync(getShareUrl(post));
            onLinkCopied?.();
            sheetRef.current?.dismiss();
            return;
          }

          // messenger, telegram, more -> native share sheet
          await Share.share({ message: buildShareText(post) });
          onShareExternal(post);
          sheetRef.current?.dismiss();
        } catch {
          // user cancelled the native sheet, clipboard failed, or Linking
          // failed — no-op, sheet stays open so they can try again
        }
      },
      [post, onShareExternal, onLinkCopied],
    );

    // ------------------------------------------------------------
    // Instagram-style grid cell: avatar with a selection ring +
    // checkmark badge, first name underneath.
    // ------------------------------------------------------------
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

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      [],
    );

    // ------------------------------------------------------------
    // Section header above the grid ("Share with") — purely visual.
    // ------------------------------------------------------------
    const renderGridHeader = useCallback(
      () => (
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>Share with</Text>
      ),
      [colors],
    );

    // ------------------------------------------------------------
    // App row rendered BELOW the friends grid, as the FlatList's
    // ListFooterComponent — mirrors Instagram's layout exactly.
    // ------------------------------------------------------------
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
          {/* Leaves room so this row isn't hidden behind the pinned footer. */}
          <View style={{ height: 140 }} />
        </View>
      ),
      [colors, handleShareAppPress],
    );

    // ------------------------------------------------------------
    // BottomSheetFooter pins the message input + Share button above
    // the keyboard automatically. Only relevant to the friends flow.
    // ------------------------------------------------------------
    const renderFooter = useCallback(
      (footerProps: any) => (
        <BottomSheetFooter {...footerProps} bottomInset={0}>
          <View
            style={[
              styles.footer,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <BottomSheetTextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Add a message (optional)"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              maxLength={250}
            />

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
          </View>
        </BottomSheetFooter>
      ),
      [colors, message, selectedIds.size, isSharing, handleConfirmShare],
    );

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

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
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
          {isFetching && debouncedQuery ? (
            <ActivityIndicator size="small" color={colors.muted} />
          ) : searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <BottomSheetFlatList
            data={followingList}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={styles.gridContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={renderGridHeader}
            ListFooterComponent={renderAppsSection}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {debouncedQuery
                  ? `No results for "${debouncedQuery}"`
                  : "You are not following anyone yet."}
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

  sectionLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 8,
  },

  gridContent: {
    paddingHorizontal: 8,
    paddingTop: 6,
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  shareButton: { borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  shareButtonDisabled: { opacity: 0.5 },
  shareButtonText: { color: "#fff", fontSize: 14, fontFamily: "Poppins_600SemiBold" },
});