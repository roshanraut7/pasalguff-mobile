import React, { forwardRef, useCallback, useMemo, useRef } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  createCreatePostStyles,
  getCreatePostPalette,
} from "@/constants/styles/create-post.styles";
import type { PostTag, PostVisibility, VisibilityOptionMeta } from "./Post.types";
import { TAG_OPTIONS } from "@/utils/post.utils";

// ─── Community Picker (Reddit-style bottom sheet) ─────────────────────────────
// Slides up from the bottom, with a pinned title + search bar and a
// scrollable community list. Requires `BottomSheetModalProvider` to be
// mounted once near the app root (already present in this app's RootLayout).
//
// CHANGED (this pass):
// 1. Sheet now opens at a taller snap point ("92%") by default instead of
//    the shorter "50%" one, so it feels closer to full-screen right away.
// 2. When the sheet opens, it auto-scrolls the list to whichever community
//    is currently selected, so the user sees their current pick immediately
//    instead of having to scroll to find it.
// 3. Title row kept/clarified as "Select Community".

const ESTIMATED_ROW_HEIGHT = 72; // used for getItemLayout / scrollToIndex fallback

export type CommunityPickerItem = {
  id: string;
  name: string;
  memberCount?: number | null;
  description?: string | null;
  avatarImage?: string | null;
};

type CommunityPickerSheetProps = {
  communities: CommunityPickerItem[];
  selectedId: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export const CommunityPickerSheet = forwardRef<
  BottomSheetModal,
  CommunityPickerSheetProps
>(function CommunityPickerSheet(
  { communities, selectedId, searchValue, onSearchChange, onSelect, onClose },
  ref,
) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

  // CHANGED: taller snap points so the sheet opens much closer to full-screen.
  // Bump "92%" -> "95%" if you want it even taller.
  const snapPoints = useMemo(() => ["60%", "92%"], []);

  const renderBackdrop = useCallback(
    (backdropProps: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...backdropProps}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      onClose();
    },
    [onSelect, onClose],
  );

  // CHANGED: ref + helper so we can auto-scroll to the selected community
  // as soon as the sheet finishes opening.
  const listRef = useRef<any>(null);

  const scrollToSelected = useCallback(() => {
    if (!selectedId) return;

    const index = communities.findIndex((item) => item.id === selectedId);
    if (index < 0) return;

    // small delay lets the sheet + list finish mounting/measuring first
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3, // lands roughly upper-middle rather than glued to the top edge
      });
    });
  }, [communities, selectedId]);

  // Fires when the sheet settles on a snap point (index >= 0 means it's open)
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0) {
        scrollToSelected();
      }
    },
    [scrollToSelected],
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={1} // CHANGED: open directly at the taller (92%) snap point
      snapPoints={snapPoints}
      onDismiss={onClose}
      onChange={handleSheetChange} // CHANGED: trigger scroll-to-selected on open
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{
        backgroundColor: p.overlay,
      }}
      style={{
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: "hidden",
      }}
      handleIndicatorStyle={{ backgroundColor: p.chipBorder, width: 40 }}
    >
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>Select Community</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={p.text} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={p.muted} />
        <BottomSheetTextInput
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder="Search communities"
          placeholderTextColor={p.placeholder}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <BottomSheetFlatList
        ref={listRef} // CHANGED
        data={communities}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        // CHANGED: needed so scrollToIndex can jump straight to a row without
        // first measuring every item above it. Adjust ESTIMATED_ROW_HEIGHT at
        // the top of this file if your actual row height differs.
        getItemLayout={(_, index) => ({
          length: ESTIMATED_ROW_HEIGHT,
          offset: ESTIMATED_ROW_HEIGHT * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          // fallback: if the layout estimate is off, retry after a short delay
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.3,
            });
          }, 100);
        }}
        contentContainerStyle={[
          styles.pickerList,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No community found</Text>
        }
        renderItem={({ item }) => {
          const isSelected = item.id === selectedId;
          return (
            <Pressable
              onPress={() => handleSelect(item.id)}
              style={[
                styles.communityRow,
                isSelected && styles.communityRowSelected,
              ]}
            >
              <View style={styles.communityAvatar}>
                {item.avatarImage ? (
                  <Image
                    source={{ uri: item.avatarImage }}
                    style={styles.communityAvatarImg}
                  />
                ) : (
                  <Text style={styles.communityAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.communityName}>{item.name}</Text>
                {item.memberCount != null && (
                  <Text style={styles.communityMeta}>
                    {item.memberCount.toLocaleString()} members
                  </Text>
                )}
                {!!item.description && (
                  <Text numberOfLines={1} style={styles.communityDesc}>
                    {item.description}
                  </Text>
                )}
              </View>

              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={p.accentStrong}
                />
              )}
            </Pressable>
          );
        }}
      />
    </BottomSheetModal>
  );
});

// ─── Tag Picker (unchanged) ────────────────────────────────────────────────────

type TagPickerModalProps = {
  visible: boolean;
  selectedTag: PostTag;
  onSelect: (tag: PostTag) => void;
  onClose: () => void;
};

export function TagPickerModal({
  visible,
  selectedTag,
  onSelect,
  onClose,
}: TagPickerModalProps) {
  const { colors, isDark } = useAppTheme();
  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.pickerOverlay} onPress={() => {}}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Choose tag</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={p.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerList}
          >
            {TAG_OPTIONS.map((item) => {
              const isSelected = item.value === selectedTag;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => { onSelect(item.value); onClose(); }}
                  style={[styles.tagRow, isSelected && styles.tagRowSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tagLabel}>{item.label}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={p.accentStrong} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Visibility Picker (unchanged) ─────────────────────────────────────────────

type VisibilityPickerModalProps = {
  visible: boolean;
  selectedVisibility: PostVisibility;
  options: VisibilityOptionMeta[];
  onSelect: (visibility: PostVisibility) => void;
  onClose: () => void;
};

export function VisibilityPickerModal({
  visible,
  selectedVisibility,
  options,
  onSelect,
  onClose,
}: VisibilityPickerModalProps) {
  const { colors, isDark } = useAppTheme();
  const p = useMemo(() => getCreatePostPalette(colors, isDark), [colors, isDark]);
  const styles = useMemo(() => createCreatePostStyles(p), [p]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.pickerOverlay} onPress={() => {}}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Post visibility</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={p.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pickerList}
          >
            {options.map((item) => {
              const isSelected = item.value === selectedVisibility;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => { onSelect(item.value); onClose(); }}
                  style={[styles.tagRow, isSelected && styles.tagRowSelected]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={isSelected ? p.accentStrong : p.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tagLabel}>{item.label}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={p.accentStrong} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}