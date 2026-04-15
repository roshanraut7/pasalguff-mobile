import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
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
  Tabs,
  TextField,
} from "heroui-native";

import { COLORS } from "@/constants/colors";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import {
  editProfileSchema,
  type EditProfileFormInput,
  type EditProfileFormValues,
} from "@/schema/edit-profile.schema";
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from "@/store/api/profileApi";
import {
  useUploadProfileAvatarMutation,
  useUploadProfileCoverMutation,
} from "@/store/api/uploadApi";

type ImageTarget = "avatar" | "cover";

export default function EditProfileForm() {
  const [serverError, setServerError] = useState("");
  const [tab, setTab] = useState("edit");
  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(null);

  const { data: profile, isLoading } = useGetMyProfileQuery();
  const [updateMyProfile, { isLoading: isSaving }] = useUpdateMyProfileMutation();
  const [uploadProfileAvatar] = useUploadProfileAvatarMutation();
  const [uploadProfileCover] = useUploadProfileCoverMutation();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditProfileFormInput, any, EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      businessName: "",
      businessType: "",
      address: "",
      image: "",
      coverImage: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        businessName: profile.businessName ?? "",
        businessType: profile.businessType ?? "",
        address: profile.address ?? "",
        image: profile.image ?? "",
        coverImage: profile.coverImage ?? "",
      });
    }
  }, [profile, reset]);

  const avatarPreview = toAbsoluteFileUrl(watch("image"));
  const coverPreview = toAbsoluteFileUrl(watch("coverImage"));
  const isUploadingAvatar = uploadingTarget === "avatar";
  const isUploadingCover = uploadingTarget === "cover";

  const fullNamePreview = useMemo(() => {
    const firstName = watch("firstName")?.trim() ?? "";
    const lastName = watch("lastName")?.trim() ?? "";
    return `${firstName} ${lastName}`.trim();
  }, [watch("firstName"), watch("lastName")]);

  const uploadPickedAsset = async (
    asset: ImagePicker.ImagePickerAsset,
    target: ImageTarget,
  ) => {
    setServerError("");
    setUploadingTarget(target);

    try {
      const uploadFn =
        target === "avatar" ? uploadProfileAvatar : uploadProfileCover;

      const uploaded = await uploadFn({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      }).unwrap();

      const absoluteUrl = toAbsoluteFileUrl(uploaded.url) ?? uploaded.url;

      if (target === "avatar") {
        setValue("image", absoluteUrl, {
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
      setValue("image", "", {
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
const onSubmit = async (values: EditProfileFormValues) => {
  try {
    console.log("onSubmit called", values);
    setServerError("");

    const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();

    await updateMyProfile({
      name: fullName,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      businessName: values.businessName.trim(),
      businessType: values.businessType.trim(),
      address: values.address.trim(),
      image: values.image ?? null,
      coverImage: values.coverImage ?? null,
    }).unwrap();

    // console.log("profile updated");
    router.back();
  } catch (error: any) {
    // console.log("update error", error);
    setServerError(error?.data?.message || "Failed to update profile");
  }
};
// console.log("form errors", errors);

  if (isLoading) {
    return (
      <View className="py-8">
        <Text className="text-muted">Loading profile...</Text>
      </View>
    );
  }

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      variant="secondary"
      style={{ width: "100%" }}
    >
      <Tabs.List>
        <Tabs.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollAlign="start"
          contentContainerStyle={{ flexDirection: "row", gap: 20, paddingRight: 24 }}
        >
          <Tabs.Indicator />
          <Tabs.Trigger value="edit">
            <Tabs.Label>Edit</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger value="security">
            <Tabs.Label>Security</Tabs.Label>
          </Tabs.Trigger>
        </Tabs.ScrollView>
      </Tabs.List>

      <View className="pt-5">
        <Tabs.Content value="edit">
          <View className="gap-5">
            <View>
              <Text
                className="text-foreground"
                style={{ fontSize: 26, fontFamily: "Poppins_700Bold" }}
              >
                Edit Profile
              </Text>

              <Text
                className="mt-1 text-muted"
                style={{ fontSize: 14, fontFamily: "Poppins_400Regular" }}
              >
                Update your profile details, avatar, and cover image.
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
                        <Ionicons name="camera-outline" size={22} color="#fff" />
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
                          <Menu.ItemTitle>
                            {isUploadingCover ? "Uploading..." : "Take photo"}
                          </Menu.ItemTitle>
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
                          name="person-outline"
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
                          <Ionicons
                            name="camera-outline"
                            size={18}
                            color={COLORS.primary}
                          />
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
                            <Menu.ItemTitle>
                              {isUploadingAvatar ? "Uploading..." : "Take photo"}
                            </Menu.ItemTitle>
                          </Menu.Item>

                          <Menu.Item onPress={() => pickFromGallery("avatar")}>
                            <Menu.ItemTitle>Choose from gallery</Menu.ItemTitle>
                          </Menu.Item>

                          <Menu.Item
                            onPress={() => removeImage("avatar")}
                            variant="danger"
                          >
                            <Menu.ItemTitle>Remove profile photo</Menu.ItemTitle>
                          </Menu.Item>
                        </Menu.Content>
                      </Menu.Portal>
                    </Menu>
                  </View>
                </View>
              </View>

              <View className="rounded-[20px] border border-border bg-surface px-4 py-3">
                <Text
                  className="text-muted"
                  style={{ fontSize: 12, fontFamily: "Poppins_500Medium" }}
                >
                  Full Name Preview
                </Text>
                <Text
                  className="mt-1 text-foreground"
                  style={{ fontSize: 16, fontFamily: "Poppins_700Bold" }}
                >
                  {fullNamePreview || "Your full name"}
                </Text>
              </View>

              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, value } }) => (
                  <TextField isInvalid={!!errors.firstName}>
                    <Label>First Name</Label>
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter first name"
                      className="border-field-border bg-field-background"
                    />
                    {errors.firstName?.message ? (
                      <FieldError>{errors.firstName.message}</FieldError>
                    ) : null}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, value } }) => (
                  <TextField isInvalid={!!errors.lastName}>
                    <Label>Last Name</Label>
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter last name"
                      className="border-field-border bg-field-background"
                    />
                    {errors.lastName?.message ? (
                      <FieldError>{errors.lastName.message}</FieldError>
                    ) : null}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="businessName"
                render={({ field: { onChange, value } }) => (
                  <TextField isInvalid={!!errors.businessName}>
                    <Label>Business Name</Label>
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter business name"
                      className="border-field-border bg-field-background"
                    />
                    {errors.businessName?.message ? (
                      <FieldError>{errors.businessName.message}</FieldError>
                    ) : null}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="businessType"
                render={({ field: { onChange, value } }) => (
                  <TextField isInvalid={!!errors.businessType}>
                    <Label>Business Type</Label>
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter business type"
                      className="border-field-border bg-field-background"
                    />
                    {errors.businessType?.message ? (
                      <FieldError>{errors.businessType.message}</FieldError>
                    ) : null}
                  </TextField>
                )}
              />

              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, value } }) => (
                  <TextField isInvalid={!!errors.address}>
                    <Label>Address</Label>
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter address"
                      className="border-field-border bg-field-background"
                    />
                    {errors.address?.message ? (
                      <FieldError>{errors.address.message}</FieldError>
                    ) : null}
                  </TextField>
                )}
              />

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
                isDisabled={isSaving || isUploadingAvatar || isUploadingCover}
                className="mt-2 rounded-full bg-accent"
              >
                <Button.Label className="text-accent-foreground">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button.Label>
              </Button>
            </View>
          </View>
        </Tabs.Content>

        <Tabs.Content value="security">
          <View className="gap-4">
            <View>
              <Text
                className="text-foreground"
                style={{ fontSize: 24, fontFamily: "Poppins_700Bold" }}
              >
                Security
              </Text>

              <Text
                className="mt-1 text-muted"
                style={{ fontSize: 14, fontFamily: "Poppins_400Regular" }}
              >
                Change password UI is ready. Backend is not connected yet.
              </Text>
            </View>

            <TextField>
              <Label>Current Password</Label>
              <Input
                placeholder="Enter current password"
                secureTextEntry
                className="border-field-border bg-field-background"
              />
            </TextField>

            <TextField>
              <Label>New Password</Label>
              <Input
                placeholder="Enter new password"
                secureTextEntry
                className="border-field-border bg-field-background"
              />
            </TextField>

            <TextField>
              <Label>Confirm New Password</Label>
              <Input
                placeholder="Confirm new password"
                secureTextEntry
                className="border-field-border bg-field-background"
              />
            </TextField>

            <Button isDisabled className="rounded-full bg-accent">
              <Button.Label className="text-accent-foreground">
                Change Password
              </Button.Label>
            </Button>
          </View>
        </Tabs.Content>
      </View>
    </Tabs>
  );
}