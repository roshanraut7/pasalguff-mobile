import React, { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
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
  TextField,
} from "heroui-native";

import { COLORS } from "@/constants/colors";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  createCommunitySchema,
  type CreateCommunityFormInput,
  type CreateCommunityFormValues,
} from "@/schema/create-community.schema";
import {
  useCreateCommunityMutation,
  useGetCategoriesQuery,
} from "@/store/api/communityApi";
import {
  useUploadCommunityAvatarMutation,
  useUploadCommunityCoverMutation,
} from "@/store/api/uploadApi";

type ImageTarget = "avatar" | "cover";

export default function CreateCommunityForm() {
  const [serverError, setServerError] = useState("");
  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(null);

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useGetCategoriesQuery();

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

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

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
              <Ionicons name="image-outline" size={28} color={COLORS.primary} />
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
                    color={COLORS.primary}
                  />
                </View>
              )}
            </View>

            <View className="absolute -bottom-1 -right-1">
              <Menu>
                <Menu.Trigger asChild>
                  <Pressable className="h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-surface">
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Ionicons
                        name="camera-outline"
                        size={18}
                        color={COLORS.primary}
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

        <View>
          <Label>Category</Label>

          <Menu>
            <Menu.Trigger asChild>
              <Pressable className="mt-2 flex-row items-center justify-between rounded-2xl border border-field-border bg-field-background px-4 py-4">
                <Text
                  className={selectedCategory ? "text-foreground" : "text-muted"}
                  style={{
                    fontSize: 15,
                    fontFamily: "Poppins_500Medium",
                  }}
                >
                  {categoriesLoading
                    ? "Loading categories..."
                    : selectedCategory?.name || "Select a category"}
                </Text>

                <Ionicons
                  name="chevron-down-outline"
                  size={18}
                  color={COLORS.muted}
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
                {categoriesLoading ? (
                  <Menu.Item isDisabled>
                    <Menu.ItemTitle>Loading categories...</Menu.ItemTitle>
                  </Menu.Item>
                ) : categoriesError ? (
                  <Menu.Item isDisabled>
                    <Menu.ItemTitle>Failed to load categories</Menu.ItemTitle>
                  </Menu.Item>
                ) : categories.length === 0 ? (
                  <Menu.Item isDisabled>
                    <Menu.ItemTitle>No categories available</Menu.ItemTitle>
                  </Menu.Item>
                ) : (
                  categories.map((category) => (
                    <Menu.Item
                      key={category.id}
                      onPress={() =>
                        setValue("categoryId", category.id, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    >
                      <Menu.ItemTitle>{category.name}</Menu.ItemTitle>
                    </Menu.Item>
                  ))
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
                color: COLORS.danger,
                fontSize: 13,
                fontFamily: "Poppins_500Medium",
                marginTop: 8,
              }}
            >
              Failed to load categories
            </Text>
          ) : null}
        </View>

        <Controller
          control={control}
          name="categoryId"
          render={() => <View />}
        />

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
                    color={COLORS.primary}
                  />
                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 15,
                      fontFamily: "Poppins_500Medium",
                    }}
                  >
                    {selectedVisibility === "PRIVATE" ? "Private" : "Public"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down-outline"
                  size={18}
                  color={COLORS.muted}
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

        {serverError ? (
          <Text
            style={{
              color: COLORS.danger,
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
            {isCreating ? "Creating..." : "Create Community"}
          </Button.Label>
        </Button>
      </View>
    </View>
  );
}