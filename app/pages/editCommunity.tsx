import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  useGetCommunityAccessQuery,
  useGetCommunityDetailsByIdQuery,
  useUpdateCommunityMutation,
} from "@/store/api/communityApi";
import {
  type CategoryRow,
  useGetCategoriesQuery,
} from "@/store/api/category.api";
import {
  useUploadCommunityAvatarMutation,
  useUploadCommunityCoverMutation,
} from "@/store/api/uploadApi";
import type { CommunityVisibility } from "@/types/community";

type ImageTarget = "avatar" | "cover";

type ApiErrorShape = {
  data?: {
    message?: string | string[];
  };
  message?: string;
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getErrorMessage(error: unknown) {
  const apiError = error as ApiErrorShape;
  const message = apiError?.data?.message;

  if (Array.isArray(message)) {
    return message.join("\n");
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (typeof apiError?.message === "string" && apiError.message.trim()) {
    return apiError.message;
  }

  return "Something went wrong. Please try again.";
}

export default function EditCommunityScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const localParams = useLocalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const globalParams = useGlobalSearchParams<{
    communityId?: string | string[];
    id?: string | string[];
  }>();

  const communityId =
    getParamValue(localParams.communityId) ||
    getParamValue(globalParams.communityId) ||
    getParamValue(localParams.id) ||
    getParamValue(globalParams.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visibility, setVisibility] =
    useState<CommunityVisibility>("PUBLIC");
  const [avatarImage, setAvatarImage] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const [hydratedCommunityId, setHydratedCommunityId] = useState<string | null>(
    null,
  );
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [selectedCategorySnapshot, setSelectedCategorySnapshot] =
    useState<CategoryRow | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(
    null,
  );
  const [serverError, setServerError] = useState("");

  const {
    data: community,
    isLoading: communityLoading,
    isFetching: communityFetching,
    error: communityError,
    refetch: refetchCommunity,
  } = useGetCommunityDetailsByIdQuery(communityId, {
    skip: !communityId,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: access,
    isLoading: accessLoading,
    error: accessError,
  } = useGetCommunityAccessQuery(communityId, {
    skip: !communityId,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearch(categorySearch.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [categorySearch]);

  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    error: categoriesError,
  } = useGetCategoriesQuery({
    page: 1,
    limit: 50,
    search: debouncedCategorySearch || undefined,
    status: "ACTIVE",
    sortBy: "name",
    sortDirection: "asc",
  });

  const categories = categoriesResponse?.data ?? [];

  const [updateCommunity, { isLoading: isSaving }] =
    useUpdateCommunityMutation();
  const [uploadCommunityAvatar] = useUploadCommunityAvatarMutation();
  const [uploadCommunityCover] = useUploadCommunityCoverMutation();

  useEffect(() => {
    if (!community || hydratedCommunityId === community.id) return;

    setName(community.name ?? "");
    setDescription(community.description ?? "");
    setCategoryId(community.categoryId ?? community.category?.id ?? "");
    setVisibility(community.visibility ?? "PUBLIC");
    setAvatarImage(community.avatarImage ?? "");
    setCoverImage(community.coverImage ?? "");

    if (community.category) {
      setSelectedCategorySnapshot({
        id: community.category.id,
        name: community.category.name,
        slug: community.category.slug,
      } as CategoryRow);
    }

    setHydratedCommunityId(community.id);
  }, [community, hydratedCommunityId]);

  const selectedCategory = useMemo(() => {
    return (
      categories.find((category) => category.id === categoryId) ??
      (selectedCategorySnapshot?.id === categoryId
        ? selectedCategorySnapshot
        : null)
    );
  }, [categories, categoryId, selectedCategorySnapshot]);

  const avatarPreview = useMemo(() => {
    return avatarImage
      ? toAbsoluteFileUrl(avatarImage) ?? avatarImage
      : "";
  }, [avatarImage]);

  const coverPreview = useMemo(() => {
    return coverImage ? toAbsoluteFileUrl(coverImage) ?? coverImage : "";
  }, [coverImage]);

  const canEditCommunity = access?.permissions?.canEditCommunity === true;

  /**
   * Names created from verified business/institute approval and official
   * district communities are controlled by the platform.
   */
  const isVerifiedBusinessCommunity =
    community?.purpose === "BUSINESS";

  const isOfficialDistrictCommunity =
    community?.purpose === "DISTRICT_OFFICIAL";

  const isCommunityNameLocked =
    isVerifiedBusinessCommunity ||
    isOfficialDistrictCommunity;

  const lockedNameMessage = isOfficialDistrictCommunity
    ? "Official district community names are controlled by the platform."
    : "This name is linked to the verified business or institute and cannot be changed.";

  const isInitialLoading = communityLoading || accessLoading;
  const isUploading = uploadingTarget !== null;
  const isBusy = isSaving || isUploading;

  async function handlePickImage(target: ImageTarget) {
    setServerError("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo-library access to choose a community image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: target === "avatar",
      aspect: target === "avatar" ? [1, 1] : undefined,
      quality: 0.8,
    });

    const asset = result.assets?.[0];

    if (result.canceled || !asset) return;

    setUploadingTarget(target);

    try {
      const upload =
        target === "avatar"
          ? uploadCommunityAvatar
          : uploadCommunityCover;

      const uploaded = await upload({
        uri: asset.uri,
        fileName:
          asset.fileName ??
          `community-${target}-${Date.now()}.${asset.mimeType?.split("/")[1] ?? "jpg"}`,
        mimeType: asset.mimeType ?? "image/jpeg",
      }).unwrap();

      const uploadedUrl = toAbsoluteFileUrl(uploaded.url) ?? uploaded.url;

      if (target === "avatar") {
        setAvatarImage(uploadedUrl);
      } else {
        setCoverImage(uploadedUrl);
      }
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setUploadingTarget(null);
    }
  }

  async function handleSave() {
    setServerError("");

    const trimmedName = name.trim();

    if (!isCommunityNameLocked && !trimmedName) {
      setServerError("Community name is required.");
      return;
    }

    if (!categoryId) {
      setServerError("Please select a community category.");
      return;
    }

    if (!communityId) {
      setServerError("Community ID is missing.");
      return;
    }

    try {
      await updateCommunity({
        communityId,

        /**
         * Never send a platform-controlled name from this screen.
         * The backend also blocks direct API attempts.
         */
        ...(!isCommunityNameLocked
          ? { name: trimmedName }
          : {}),

        description: description.trim(),
        categoryId,
        visibility,
        avatarImage: avatarImage || undefined,
        coverImage: coverImage || undefined,
      }).unwrap();

      await refetchCommunity();

      Alert.alert("Community updated", "Your changes were saved successfully.", [
        {
          text: "Done",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  if (!communityId) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={34} color={colors.danger} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>
          Community ID missing
        </Text>
        <Text style={[styles.stateText, { color: colors.muted }]}>
          Open this page with a communityId route parameter.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.stateButton, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.stateButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (isInitialLoading && !community) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.stateText, { color: colors.muted }]}>
          Loading community...
        </Text>
      </View>
    );
  }

  if (communityError || accessError || !community) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>
          Could not load community
        </Text>
        <Text style={[styles.stateText, { color: colors.muted }]}>
          Please check your connection and try again.
        </Text>
        <Pressable
          onPress={() => refetchCommunity()}
          style={[styles.stateButton, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.stateButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!canEditCommunity) {
    return (
      <View style={[styles.centerState, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={34} color={colors.warning} />
        <Text style={[styles.stateTitle, { color: colors.foreground }]}>
          Edit access required
        </Text>
        <Text style={[styles.stateText, { color: colors.muted }]}>
          Only the community owner or a moderator with edit permission can edit
          this community.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.stateButton, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.stateButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[
            styles.headerIconButton,
            { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Edit Community
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.muted }]}
            numberOfLines={1}
          >
            {community.name}
          </Text>
        </View>

        <Pressable
          disabled={isBusy}
          onPress={handleSave}
          style={[
            styles.headerSaveButton,
            {
              backgroundColor: colors.accent,
              opacity: isBusy ? 0.65 : 1,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.headerSaveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.imageCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            disabled={isBusy}
            onPress={() => handlePickImage("cover")}
            style={styles.coverPressable}
          >
            {coverPreview ? (
              <Image source={{ uri: coverPreview }} style={styles.coverImage} />
            ) : (
              <View
                style={[
                  styles.coverPlaceholder,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="image-outline" size={34} color={colors.muted} />
                <Text style={[styles.placeholderText, { color: colors.muted }]}>
                  Add cover image
                </Text>
              </View>
            )}

            <View style={styles.coverOverlay} />

            <View style={styles.coverEditBadge}>
              {uploadingTarget === "cover" ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={16} color="#ffffff" />
                  <Text style={styles.coverEditText}>Change cover</Text>
                </>
              )}
            </View>
          </Pressable>

          <View style={styles.avatarRow}>
            <Pressable
              disabled={isBusy}
              onPress={() => handlePickImage("avatar")}
              style={[
                styles.avatarPressable,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.surface,
                },
              ]}
            >
              {avatarPreview ? (
                <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarFallback, { color: colors.accent }]}>
                  {(name || community.name || "C").charAt(0).toUpperCase()}
                </Text>
              )}

              <View
                style={[
                  styles.avatarCameraBadge,
                  { backgroundColor: colors.accent },
                ]}
              >
                {uploadingTarget === "avatar" ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="camera" size={15} color="#ffffff" />
                )}
              </View>
            </Pressable>

            <View style={styles.avatarHelpWrap}>
              <Text style={[styles.imageTitle, { color: colors.foreground }]}>
                Community images
              </Text>
              <Text style={[styles.imageHelp, { color: colors.muted }]}>
                Tap the cover or avatar to upload a replacement.
              </Text>
            </View>
          </View>
        </View>

        {serverError ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.danger,
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {serverError}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeadingRow}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Community information
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Update the details people see on your community page.
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.nameLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Community name
              </Text>

              {isCommunityNameLocked ? (
                <View
                  style={[
                    styles.verifiedNameBadge,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons
                    name={
                      isOfficialDistrictCommunity
                        ? "business-outline"
                        : "shield-checkmark"
                    }
                    size={13}
                    color={colors.accent}
                  />
                  <Text
                    style={[
                      styles.verifiedNameBadgeText,
                      { color: colors.accent },
                    ]}
                  >
                    {isOfficialDistrictCommunity ? "Official" : "Verified"}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.lockedInputWrap}>
              <TextInput
                value={name}
                onChangeText={
                  isCommunityNameLocked
                    ? undefined
                    : setName
                }
                editable={
                  !isBusy &&
                  !isCommunityNameLocked
                }
                maxLength={100}
                placeholder="Enter community name"
                placeholderTextColor={colors.muted}
                style={[
                  styles.textInput,
                  {
                    color: isCommunityNameLocked
                      ? colors.muted
                      : colors.foreground,
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: isCommunityNameLocked
                      ? colors.accent
                      : colors.border,
                    paddingRight: isCommunityNameLocked
                      ? 44
                      : 14,
                  },
                ]}
              />

              {isCommunityNameLocked ? (
                <View style={styles.lockedInputIcon}>
                  <Ionicons
                    name="lock-closed"
                    size={17}
                    color={colors.accent}
                  />
                </View>
              ) : null}
            </View>

            {isCommunityNameLocked ? (
              <Text style={[styles.lockedNameHelp, { color: colors.muted }]}>
                {lockedNameMessage}
              </Text>
            ) : (
              <Text style={[styles.characterCount, { color: colors.muted }]}>
                {name.length}/100
              </Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              editable={!isBusy}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              placeholder="Describe this community"
              placeholderTextColor={colors.muted}
              style={[
                styles.textArea,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            />
            <Text style={[styles.characterCount, { color: colors.muted }]}>
              {description.length}/1000
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              Category
            </Text>
            <Pressable
              disabled={isBusy}
              onPress={() => setIsCategoryModalOpen(true)}
              style={[
                styles.selectButton,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.selectLeft}>
                <Ionicons name="grid-outline" size={19} color={colors.accent} />
                <Text
                  style={[
                    styles.selectText,
                    { color: selectedCategory ? colors.foreground : colors.muted },
                  ]}
                  numberOfLines={1}
                >
                  {selectedCategory?.name ?? "Select a category"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeadingRow}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Ionicons name="eye-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.sectionHeadingText}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Visibility
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
                Choose how people can discover and access the community.
              </Text>
            </View>
          </View>

          <View style={styles.visibilityList}>
            {(
              [
                {
                  value: "PUBLIC" as const,
                  title: "Public",
                  subtitle: "Anyone can discover this community.",
                  icon: "earth-outline" as const,
                },
                {
                  value: "PRIVATE" as const,
                  title: "Private",
                  subtitle: "Only approved members can access it.",
                  icon: "lock-closed-outline" as const,
                },
                {
                  value: "RESTRICTED" as const,
                  title: "Restricted",
                  subtitle: "People can discover it, but joining requires approval.",
                  icon: "shield-outline" as const,
                },
              ]
            ).map((option) => {
              const isSelected = visibility === option.value;

              return (
                <Pressable
                  key={option.value}
                  disabled={isBusy}
                  onPress={() => setVisibility(option.value)}
                  style={[
                    styles.visibilityOption,
                    {
                      backgroundColor: isSelected
                        ? colors.surfaceSecondary
                        : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.visibilityIcon,
                      {
                        backgroundColor: isSelected
                          ? colors.accent
                          : colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? "#ffffff" : colors.muted}
                    />
                  </View>

                  <View style={styles.visibilityTextWrap}>
                    <Text
                      style={[styles.visibilityTitle, { color: colors.foreground }]}
                    >
                      {option.title}
                    </Text>
                    <Text
                      style={[styles.visibilitySubtitle, { color: colors.muted }]}
                    >
                      {option.subtitle}
                    </Text>
                  </View>

                  <Ionicons
                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={isSelected ? colors.accent : colors.muted}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          disabled={isBusy || communityFetching}
          onPress={handleSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: colors.accent,
              opacity: isBusy ? 0.65 : 1,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={21} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save changes</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <Modal
        visible={isCategoryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryModalOpen(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
          onPress={() => setIsCategoryModalOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Select category
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  Choose one active category for this community.
                </Text>
              </View>

              <Pressable
                hitSlop={12}
                onPress={() => setIsCategoryModalOpen(false)}
              >
                <Ionicons name="close" size={23} color={colors.muted} />
              </Pressable>
            </View>

            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="search-outline" size={19} color={colors.muted} />
              <TextInput
                value={categorySearch}
                onChangeText={setCategorySearch}
                placeholder="Search categories"
                placeholderTextColor={colors.muted}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
              {categorySearch ? (
                <Pressable onPress={() => setCategorySearch("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={19} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            {categoriesLoading || categoriesFetching ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.modalLoadingText, { color: colors.muted }]}>
                  Loading categories...
                </Text>
              </View>
            ) : categoriesError ? (
              <View style={styles.modalLoading}>
                <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
                <Text style={[styles.modalLoadingText, { color: colors.danger }]}>
                  Failed to load categories.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.categoryList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {categories.map((category) => {
                  const isSelected = category.id === categoryId;

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => {
                        setCategoryId(category.id);
                        setSelectedCategorySnapshot(category);
                        setIsCategoryModalOpen(false);
                      }}
                      style={[
                        styles.categoryOption,
                        {
                          backgroundColor: isSelected
                            ? colors.surfaceSecondary
                            : colors.surface,
                          borderColor: isSelected
                            ? colors.accent
                            : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: colors.surfaceSecondary },
                        ]}
                      >
                        <Ionicons name="folder-outline" size={19} color={colors.accent} />
                      </View>

                      <View style={styles.categoryTextWrap}>
                        <Text
                          style={[styles.categoryName, { color: colors.foreground }]}
                          numberOfLines={1}
                        >
                          {category.name}
                        </Text>
                        <Text
                          style={[styles.categorySlug, { color: colors.muted }]}
                          numberOfLines={1}
                        >
                          {category.slug}
                        </Text>
                      </View>

                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                      ) : null}
                    </Pressable>
                  );
                })}

                {!categories.length ? (
                  <View style={styles.emptyCategories}>
                    <Ionicons name="search-outline" size={28} color={colors.muted} />
                    <Text style={[styles.modalLoadingText, { color: colors.muted }]}>
                      No active category found.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  header: {
    minHeight: 72,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },
  headerSaveButton: {
    minWidth: 72,
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSaveText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  content: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  imageCard: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  coverPressable: {
    height: 180,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  coverEditBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    minHeight: 36,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.68)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  coverEditText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  avatarRow: {
    minHeight: 94,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarPressable: {
    width: 84,
    height: 84,
    marginTop: -30,
    borderRadius: 26,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  avatarFallback: {
    fontSize: 30,
    fontFamily: "Poppins_700Bold",
  },
  avatarCameraBadge: {
    position: "absolute",
    right: -5,
    bottom: -5,
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHelpWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: 10,
  },
  imageTitle: {
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  imageHelp: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "Poppins_400Regular",
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 18,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadingText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "Poppins_400Regular",
  },
  fieldGroup: {
    gap: 7,
  },
  nameLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  verifiedNameBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  verifiedNameBadgeText: {
    fontSize: 9,
    fontFamily: "Poppins_600SemiBold",
  },
  lockedInputWrap: {
    position: "relative",
  },
  lockedInputIcon: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedNameHelp: {
    fontSize: 10,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular",
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  textInput: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  textArea: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  characterCount: {
    alignSelf: "flex-end",
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
  },
  selectButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },
  visibilityList: {
    gap: 10,
  },
  visibilityOption: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  visibilityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  visibilityTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  visibilityTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  visibilitySubtitle: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    fontFamily: "Poppins_400Regular",
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "76%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modalHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },
  modalSubtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "Poppins_400Regular",
  },
  searchBox: {
    minHeight: 48,
    marginTop: 15,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  modalLoading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  modalLoadingText: {
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Poppins_500Medium",
  },
  categoryList: {
    marginTop: 14,
  },
  categoryOption: {
    minHeight: 64,
    marginBottom: 9,
    borderWidth: 1,
    borderRadius: 17,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  categorySlug: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
  },
  emptyCategories: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 18,
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
  },
  stateText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  stateButton: {
    minWidth: 120,
    minHeight: 46,
    marginTop: 18,
    borderRadius: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stateButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
});