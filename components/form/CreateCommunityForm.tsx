import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Button, FieldError, Input, Label, Menu, TextField } from "heroui-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  createCommunitySchema,
  type CreateCommunityFormInput,
  type CreateCommunityFormValues,
} from "@/schema/create-community.schema";
import { useCreateCommunityMutation } from "@/store/api/communityApi";
import {
  useGetCategoriesQuery,
  type CategoryRow,
} from "@/store/api/category.api";
import {
  useUploadCommunityAvatarMutation,
  useUploadCommunityCoverMutation,
} from "@/store/api/uploadApi";

type ImageTarget = "avatar" | "cover";

type CreateCommunityFormProps = {
  submitLabel?: string;
  onSuccess?: () => void;
};

export default function CreateCommunityForm({
  submitLabel = "Create Community",
  onSuccess,
}: CreateCommunityFormProps) {
  const { colors } = useAppTheme();

  const [serverError, setServerError] = useState("");
  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(
    null,
  );

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [selectedCategorySnapshot, setSelectedCategorySnapshot] =
    useState<CategoryRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearch(categorySearch.trim());
    }, 350);

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

  const [createCommunity, { isLoading: isCreating }] =
    useCreateCommunityMutation();

  const [uploadCommunityAvatar] = useUploadCommunityAvatarMutation();
  const [uploadCommunityCover] = useUploadCommunityCoverMutation();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCommunityFormInput, any, CreateCommunityFormValues>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      name: "",
      categoryId: "",
      description: "",
      avatarImage: "",
      coverImage: "",
      visibility: "PUBLIC",
    },
  });

  const selectedCategoryId = watch("categoryId");
  const selectedVisibility = watch("visibility");

  const avatarPreview = toAbsoluteFileUrl(watch("avatarImage"));
  const coverPreview = toAbsoluteFileUrl(watch("coverImage"));

  const isUploadingAvatar = uploadingTarget === "avatar";
  const isUploadingCover = uploadingTarget === "cover";

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;

    const categoryFromCurrentList =
      categories.find((category) => category.id === selectedCategoryId) ?? null;

    if (categoryFromCurrentList) return categoryFromCurrentList;

    if (selectedCategorySnapshot?.id === selectedCategoryId) {
      return selectedCategorySnapshot;
    }

    return null;
  }, [categories, selectedCategoryId, selectedCategorySnapshot]);

  const handleSelectCategory = (category: CategoryRow) => {
    setValue("categoryId", category.id, {
      shouldDirty: true,
      shouldValidate: true,
    });

    setSelectedCategorySnapshot(category);
    setCategorySearch("");
    setDebouncedCategorySearch("");
    setCategoryModalOpen(false);
  };

  const uploadPickedAsset = async (
    asset: ImagePicker.ImagePickerAsset,
    target: ImageTarget,
  ) => {
    setServerError("");
    setUploadingTarget(target);

    try {
      const uploadFn =
        target === "avatar" ? uploadCommunityAvatar : uploadCommunityCover;

      const uploaded = await uploadFn({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      }).unwrap();

      const absoluteUrl = toAbsoluteFileUrl(uploaded.url) ?? uploaded.url;

      if (target === "avatar") {
        setValue("avatarImage", absoluteUrl, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } else {
        setValue("coverImage", absoluteUrl, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } catch (error: any) {
      setServerError(error?.data?.message || "Failed to upload image");
    } finally {
      setUploadingTarget(null);
    }
  };

  const pickFromCamera = async (target: ImageTarget) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setServerError("Camera permission is required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: target === "avatar",
      aspect: target === "avatar" ? [1, 1] : undefined,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    await uploadPickedAsset(result.assets[0], target);
  };

  const pickFromGallery = async (target: ImageTarget) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setServerError("Media library permission is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: target === "avatar",
      aspect: target === "avatar" ? [1, 1] : undefined,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    await uploadPickedAsset(result.assets[0], target);
  };

  const removeImage = (target: ImageTarget) => {
    if (target === "avatar") {
      setValue("avatarImage", "", {
        shouldDirty: true,
        shouldValidate: true,
      });

      return;
    }

    setValue("coverImage", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: CreateCommunityFormValues) => {
    try {
      setServerError("");

      await createCommunity({
        name: values.name,
        categoryId: values.categoryId,
        description: values.description,
        avatarImage: values.avatarImage,
        coverImage: values.coverImage,
        visibility: values.visibility,
      }).unwrap();

      if (onSuccess) {
        onSuccess();
        return;
      }

      router.back();
    } catch (error: any) {
      setServerError(error?.data?.message || "Failed to create community");
    }
  };

  return (
    <View className="gap-5">
      <View>
        <Text
          className="text-foreground"
          style={{
            fontSize: 26,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Create Community
        </Text>

        <Text
          className="mt-1 text-muted"
          style={{
            fontSize: 14,
            fontFamily: "Poppins_400Regular",
          }}
        >
          Create your own public or private community.
        </Text>
      </View>

      <View className="gap-4">
        <View className="relative overflow-hidden rounded-[24px] border border-border bg-surface">
          {coverPreview ? (
            <Image
              source={{ uri: coverPreview }}
              style={{ width: "100%", height: 170 }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-[170px] items-center justify-center bg-segment">
              <Ionicons name="image-outline" size={28} color={colors.accent} />
            </View>
          )}

          <View className="absolute inset-0 items-center justify-center">
            <Menu>
              <Menu.Trigger asChild>
                <Pressable className="h-[52px] w-[52px] items-center justify-center rounded-full border border-white/20 bg-black/25">
                  {isUploadingCover ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="camera-outline" size={22} color="#fff" />
                  )}
                </Pressable>
              </Menu.Trigger>

              <Menu.Portal>
                <Menu.Overlay />

                <Menu.Content
                  presentation="popover"
                  placement="bottom"
                  align="center"
                  width={220}
                  className="rounded-2xl border border-border bg-surface"
                >
                  <Menu.Item onPress={() => pickFromCamera("cover")}>
                    <Menu.ItemTitle>Take photo</Menu.ItemTitle>
                  </Menu.Item>

                  <Menu.Item onPress={() => pickFromGallery("cover")}>
                    <Menu.ItemTitle>Choose from gallery</Menu.ItemTitle>
                  </Menu.Item>

                  <Menu.Item
                    onPress={() => removeImage("cover")}
                    variant="danger"
                  >
                    <Menu.ItemTitle>Remove cover photo</Menu.ItemTitle>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu>
          </View>
        </View>

        {errors.coverImage?.message ? (
          <FieldError>{errors.coverImage.message}</FieldError>
        ) : null}

        <View className="items-center">
          <View className="relative h-[108px] w-[108px]">
            <View className="h-[108px] w-[108px] overflow-hidden rounded-full border-2 border-border bg-surface">
              {avatarPreview ? (
                <Image
                  source={{ uri: avatarPreview }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center bg-segment">
                  <Ionicons
                    name="people-outline"
                    size={30}
                    color={colors.accent}
                  />
                </View>
              )}
            </View>

            <View className="absolute -bottom-1 -right-1">
              <Menu>
                <Menu.Trigger asChild>
                  <Pressable className="h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-surface">
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons
                        name="camera-outline"
                        size={18}
                        color={colors.accent}
                      />
                    )}
                  </Pressable>
                </Menu.Trigger>

                <Menu.Portal>
                  <Menu.Overlay />

                  <Menu.Content
                    presentation="popover"
                    placement="bottom"
                    align="end"
                    width={220}
                    className="rounded-2xl border border-border bg-surface"
                  >
                    <Menu.Item onPress={() => pickFromCamera("avatar")}>
                      <Menu.ItemTitle>Take photo</Menu.ItemTitle>
                    </Menu.Item>

                    <Menu.Item onPress={() => pickFromGallery("avatar")}>
                      <Menu.ItemTitle>Choose from gallery</Menu.ItemTitle>
                    </Menu.Item>

                    <Menu.Item
                      onPress={() => removeImage("avatar")}
                      variant="danger"
                    >
                      <Menu.ItemTitle>Remove avatar</Menu.ItemTitle>
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Portal>
              </Menu>
            </View>
          </View>
        </View>

        {errors.avatarImage?.message ? (
          <FieldError>{errors.avatarImage.message}</FieldError>
        ) : null}

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextField isRequired isInvalid={!!errors.name}>
              <Label>Community Name</Label>

              <Input
                value={value}
                onChangeText={onChange}
                placeholder="Enter community name"
                className="border-field-border bg-field-background"
              />

              {errors.name?.message ? (
                <FieldError>{errors.name.message}</FieldError>
              ) : null}
            </TextField>
          )}
        />

        {/*
          Description: using a plain TextInput instead of heroui-native's Input.
          The wrapped Input was not reliably forwarding focus to the page-level
          KeyboardAwareScrollView, which caused it to stay hidden behind the
          keyboard. A raw TextInput's focus is tracked correctly.
        */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextField isInvalid={!!errors.description}>
              <Label>Description</Label>

              <TextInput
                value={value ?? ""}
                onChangeText={onChange}
                placeholder="Enter community description"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
                style={{
                  minHeight: 110,
                  textAlignVertical: "top",
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  padding: 14,
                  fontSize: 14,
                  fontFamily: "Poppins_400Regular",
                }}
              />

              {errors.description?.message ? (
                <FieldError>{errors.description.message}</FieldError>
              ) : null}
            </TextField>
          )}
        />

        {/*
          Category: replaced the Menu/popover (and the broken bottom-sheet
          presentation attempt) with a plain full-screen Modal. This avoids
          heroui-native's Menu portal/bottom-sheet machinery entirely and
          gives full, predictable control over keyboard avoidance.
        */}
        <Controller
          control={control}
          name="categoryId"
          render={() => (
            <View>
              <Label>Category</Label>

              <Pressable
                onPress={() => setCategoryModalOpen(true)}
                className="mt-2 flex-row items-center justify-between rounded-2xl border border-field-border bg-field-background px-4 py-4"
              >
                <Text
                  style={{
                    color: selectedCategory
                      ? colors.foreground
                      : colors.placeholder,
                    fontSize: 15,
                    fontFamily: "Poppins_400Regular",
                  }}
                >
                  {categoriesLoading && categories.length === 0
                    ? "Loading categories..."
                    : selectedCategory?.name || "Select a category"}
                </Text>

                <Ionicons
                  name="chevron-down-outline"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>

              <Modal
                visible={isCategoryModalOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setCategoryModalOpen(false)}
              >
                <SafeAreaView
                  edges={["top", "bottom"]}
                  style={{ flex: 1, backgroundColor: colors.background }}
                >
                  <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                  >
                    <View className="flex-row items-center justify-between px-5 py-3">
                      <Text
                        style={{
                          fontSize: 18,
                          fontFamily: "Poppins_700Bold",
                          color: colors.foreground,
                        }}
                      >
                        Select Category
                      </Text>

                      <Pressable
                        onPress={() => setCategoryModalOpen(false)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name="close"
                          size={24}
                          color={colors.foreground}
                        />
                      </Pressable>
                    </View>

                    <View
                      style={{
                        marginHorizontal: 20,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        backgroundColor: colors.surface,
                        paddingHorizontal: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name="search-outline"
                        size={16}
                        color={colors.muted}
                      />

                      <TextInput
                        value={categorySearch}
                        onChangeText={setCategorySearch}
                        placeholder="Search category..."
                        placeholderTextColor={colors.placeholder}
                        autoCorrect={false}
                        autoCapitalize="none"
                        autoFocus
                        style={{
                          flex: 1,
                          minHeight: 46,
                          color: colors.foreground,
                          fontSize: 14,
                          fontFamily: "Poppins_400Regular",
                        }}
                      />

                      {categorySearch.length > 0 ? (
                        <Pressable
                          onPress={() => {
                            setCategorySearch("");
                            setDebouncedCategorySearch("");
                          }}
                          hitSlop={10}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color={colors.muted}
                          />
                        </Pressable>
                      ) : null}
                    </View>

                    {categoriesFetching && categories.length > 0 ? (
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 12,
                          fontFamily: "Poppins_400Regular",
                          marginHorizontal: 20,
                          marginBottom: 8,
                        }}
                      >
                        Searching...
                      </Text>
                    ) : null}

                    {categoriesLoading && categories.length === 0 ? (
                      <View
                        style={{
                          paddingHorizontal: 20,
                          paddingVertical: 16,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text
                          style={{
                            color: colors.muted,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          Loading categories...
                        </Text>
                      </View>
                    ) : categoriesError ? (
                      <Text
                        style={{
                          color: colors.danger,
                          fontFamily: "Poppins_500Medium",
                          marginHorizontal: 20,
                        }}
                      >
                        Failed to load categories
                      </Text>
                    ) : categories.length === 0 ? (
                      <Text
                        style={{
                          color: colors.muted,
                          fontFamily: "Poppins_500Medium",
                          marginHorizontal: 20,
                        }}
                      >
                        No categories found
                      </Text>
                    ) : (
                      <FlatList
                        data={categories}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                          paddingHorizontal: 20,
                          paddingBottom: 24,
                        }}
                        renderItem={({ item: category }) => {
                          const isSelected = selectedCategoryId === category.id;

                          return (
                            <Pressable
                              onPress={() => handleSelectCategory(category)}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                              }}
                            >
                              <Text
                                style={{
                                  color: colors.foreground,
                                  fontFamily: "Poppins_600SemiBold",
                                }}
                              >
                                {category.name}
                              </Text>

                              {isSelected ? (
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color={colors.accent}
                                />
                              ) : null}
                            </Pressable>
                          );
                        }}
                      />
                    )}
                  </KeyboardAvoidingView>
                </SafeAreaView>
              </Modal>

              {errors.categoryId?.message ? (
                <FieldError>{errors.categoryId.message}</FieldError>
              ) : null}

              {categoriesError ? (
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 13,
                    fontFamily: "Poppins_500Medium",
                    marginTop: 8,
                  }}
                >
                  Failed to load categories
                </Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="visibility"
          render={() => (
            <View>
              <Label>Visibility</Label>

              <Menu>
                <Menu.Trigger asChild>
                  <Pressable className="mt-2 flex-row items-center justify-between rounded-2xl border border-field-border bg-field-background px-4 py-4">
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name={
                          selectedVisibility === "PRIVATE"
                            ? "lock-closed-outline"
                            : selectedVisibility === "RESTRICTED"
                              ? "eye-outline"
                              : "globe-outline"
                        }
                        size={18}
                        color={colors.accent}
                      />

                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 15,
                          fontFamily: "Poppins_500Medium",
                        }}
                      >
                        {selectedVisibility === "PRIVATE"
                          ? "Private"
                          : selectedVisibility === "RESTRICTED"
                            ? "Restricted"
                            : "Public"}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-down-outline"
                      size={18}
                      color={colors.muted}
                    />
                  </Pressable>
                </Menu.Trigger>

                <Menu.Portal>
                  <Menu.Overlay />

                  <Menu.Content
                    presentation="popover"
                    placement="bottom"
                    align="start"
                    width={260}
                    className="rounded-2xl border border-border bg-surface"
                  >
                    <Menu.Item
                      onPress={() =>
                        setValue("visibility", "PUBLIC", {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <Menu.ItemTitle>Public</Menu.ItemTitle>
                    </Menu.Item>

                    <Menu.Item
                      onPress={() =>
                        setValue("visibility", "PRIVATE", {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <Menu.ItemTitle>Private</Menu.ItemTitle>
                    </Menu.Item>

                    <Menu.Item
                      onPress={() =>
                        setValue("visibility", "RESTRICTED", {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <Menu.ItemTitle>Restricted</Menu.ItemTitle>
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Portal>
              </Menu>
            </View>
          )}
        />

        {serverError ? (
          <Text
            style={{
              color: colors.danger,
              fontSize: 13,
              fontFamily: "Poppins_500Medium",
            }}
          >
            {serverError}
          </Text>
        ) : null}

        <Button
          onPress={handleSubmit(onSubmit)}
          isDisabled={
            isCreating ||
            isUploadingAvatar ||
            isUploadingCover ||
            categoriesLoading
          }
          className="mt-2 rounded-full bg-accent"
        >
          <Button.Label className="text-accent-foreground">
            {isCreating ? "Creating..." : submitLabel}
          </Button.Label>
        </Button>
      </View>
    </View>
  );
}