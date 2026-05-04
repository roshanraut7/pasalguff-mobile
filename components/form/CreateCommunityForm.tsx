import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  Button,
  FieldError,
  Input,
  Label,
  Menu,
  SearchField,
  TextField,
} from "heroui-native";

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

  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [selectedCategorySnapshot, setSelectedCategorySnapshot] =
    useState<CategoryRow | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearch(categorySearch.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [categorySearch]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextField isInvalid={!!errors.description}>
              <Label>Description</Label>

              <Input
                value={value ?? ""}
                onChangeText={onChange}
                placeholder="Enter community description"
                multiline
                numberOfLines={4}
                className="border-field-border bg-field-background"
                style={{ minHeight: 110, textAlignVertical: "top" }}
              />

              {errors.description?.message ? (
                <FieldError>{errors.description.message}</FieldError>
              ) : null}
            </TextField>
          )}
        />

        <Controller
          control={control}
          name="categoryId"
          render={() => (
            <View>
              <Label>Category</Label>

              <Menu>
                <Menu.Trigger asChild>
                  <Pressable className="mt-2 flex-row items-center justify-between rounded-2xl border border-field-border bg-field-background px-4 py-4">
                    <Text
                      style={{
                        color: selectedCategory
                          ? colors.foreground
                          : colors.placeholder,
                        fontSize: 15,
                        fontFamily: "Poppins_400Regular",
                      }}
                    >
                      {categoriesLoading
                        ? "Loading categories..."
                        : selectedCategory?.name || "Select a category"}
                    </Text>

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
                    placement={keyboardVisible ? "top" : "bottom"}
                    align="center"
                    width={300}
                    className="rounded-3xl border border-border bg-surface p-3"
                  >
                    <View className="mb-2">
                      <SearchField
                        value={categorySearch}
                        onChange={setCategorySearch}
                      >
                        <SearchField.Group className="">
                          <SearchField.SearchIcon  />

                          <SearchField.Input
                            placeholder="Search category..."
                            className="flex-1"
                          />

                          <SearchField.ClearButton />
                        </SearchField.Group>
                      </SearchField>
                    </View>

                    {categoriesLoading || categoriesFetching ? (
                      <Menu.Item isDisabled>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />

                          <Menu.ItemTitle
                            style={{
                              color: colors.muted,
                              fontFamily: "Poppins_500Medium",
                            }}
                          >
                            Searching categories...
                          </Menu.ItemTitle>
                        </View>
                      </Menu.Item>
                    ) : categoriesError ? (
                      <Menu.Item isDisabled>
                        <Menu.ItemTitle
                          style={{
                            color: colors.danger,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          Failed to load categories
                        </Menu.ItemTitle>
                      </Menu.Item>
                    ) : categories.length === 0 ? (
                      <Menu.Item isDisabled>
                        <Menu.ItemTitle
                          style={{
                            color: colors.muted,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          No categories found
                        </Menu.ItemTitle>
                      </Menu.Item>
                    ) : (
                      <ScrollView
                        style={{ maxHeight: keyboardVisible ? 220 : 360 }}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                      >
                        {categories.map((category) => {
                          const isSelected =
                            selectedCategoryId === category.id;

                          return (
                            <Menu.Item
                              key={category.id}
                              onPress={() => handleSelectCategory(category)}
                              className={isSelected ? "bg-segment" : ""}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                }}
                              >
                                <Menu.ItemTitle
                                  style={{
                                    color: colors.foreground,
                                    fontFamily: "Poppins_600SemiBold",
                                  }}
                                >
                                  {category.name}
                                </Menu.ItemTitle>

                                {isSelected ? (
                                  <Ionicons
                                    name="checkmark"
                                    size={16}
                                    color={colors.accent}
                                  />
                                ) : null}
                              </View>
                            </Menu.Item>
                          );
                        })}
                      </ScrollView>
                    )}
                  </Menu.Content>
                </Menu.Portal>
              </Menu>

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
                    width={220}
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