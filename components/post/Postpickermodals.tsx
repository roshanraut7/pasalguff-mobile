import React, { useMemo } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  createCreatePostStyles,
  getCreatePostPalette,
} from "@/constants/styles/create-post.styles";
import type { PostTag, PostVisibility, VisibilityOptionMeta } from "./Post.types";
import { TAG_OPTIONS } from "@/utils/post.utils";

// ─── Community Picker ─────────────────────────────────────────────────────────

type CommunityPickerModalProps = {
  visible: boolean;
  communities: {
    id: string;
    name: string;
    memberCount?: number | null;
    description?: string | null;
    avatarImage?: string | null;
  }[];
  selectedId: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function CommunityPickerModal({
  visible,
  communities,
  selectedId,
  searchValue,
  onSearchChange,
  onSelect,
  onClose,
}: CommunityPickerModalProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View
          style={[
            styles.backdrop,
            {
              justifyContent: "flex-start",
              paddingTop: insets.top + 18,
              paddingHorizontal: 16,
            },
          ]}
        >
          <Pressable
            onPress={onClose}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />

          <View style={[styles.pickerOverlay, { width: "100%", maxHeight: "78%" }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Post to</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={p.text} />
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={p.muted} />
              <TextInput
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

            <ScrollView
              style={{ flexGrow: 0 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              contentContainerStyle={[styles.pickerList, { paddingBottom: 24 }]}
            >
              {communities.length === 0 ? (
                <Text style={styles.emptyText}>No community found</Text>
              ) : (
                communities.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => { onSelect(item.id); onClose(); }}
                      style={[styles.communityRow, isSelected && styles.communityRowSelected]}
                    >
                      <View style={styles.communityAvatar}>
                        {item.avatarImage ? (
                          <Image source={{ uri: item.avatarImage }} style={styles.communityAvatarImg} />
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
                        <Ionicons name="checkmark-circle" size={20} color={p.accentStrong} />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Tag Picker ───────────────────────────────────────────────────────────────

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

// ─── Visibility Picker ────────────────────────────────────────────────────────

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