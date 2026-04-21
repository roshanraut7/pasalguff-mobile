import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Menu, Tabs } from "heroui-native";

import { COLORS } from "@/constants/colors";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { signOut, useSession } from "@/api/better-auth-client";
import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from "@/store/api/profileApi";
import {
  useUploadProfileAvatarMutation,
  useUploadProfileCoverMutation,
} from "@/store/api/uploadApi";

type ImageTarget = "avatar" | "cover";

export default function ProfileScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [tab, setTab] = useState("posts");
  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(
    null,
  );

  const { data: session, isPending } = useSession();

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useGetMyProfileQuery(undefined, {
    skip: !session?.user,
  });

  const {
    data: myCommunities = [],
    isLoading: myCommunitiesLoading,
    error: myCommunitiesError,
  } = useGetMyCommunitiesQuery(undefined, {
    skip: !session?.user,
  });

  const [updateMyProfile] = useUpdateMyProfileMutation();
  const [uploadProfileAvatar] = useUploadProfileAvatarMutation();
  const [uploadProfileCover] = useUploadProfileCoverMutation();

  const user = profile ?? session?.user;

  const fullName = useMemo(() => {
    if (user?.name?.trim()) return user.name.trim();
    const joined = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
    return joined || "User";
  }, [user]);

  const initials = useMemo(() => {
    const parts = fullName.split(" ").filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U";
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [fullName]);

  const displayAvatar = toAbsoluteFileUrl(user?.image);
  const displayCover = toAbsoluteFileUrl(user?.coverImage);

  const ownedCommunities = useMemo(() => {
    return myCommunities.filter(
      (community) => community.memberRole === "ADMIN",
    );
  }, [myCommunities]);

  const joinedCommunities = useMemo(() => {
    return myCommunities.filter(
      (community) => community.memberRole !== "ADMIN",
    );
  }, [myCommunities]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace("/(auth)");
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCreateCommunity = () => {
    router.push("/create");
  };

  const handleEditProfile = () => {
    router.push("/editprofile");
  };

  const uploadPickedAsset = async (
    asset: ImagePicker.ImagePickerAsset,
    target: ImageTarget,
  ) => {
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
        await updateMyProfile({ image: absoluteUrl }).unwrap();
      } else {
        await updateMyProfile({ coverImage: absoluteUrl }).unwrap();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setUploadingTarget(null);
    }
  };

  const pickFromCamera = async (target: ImageTarget) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

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
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: target === "avatar",
      aspect: target === "avatar" ? [1, 1] : undefined,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadPickedAsset(result.assets[0], target);
  };

  const removeProfileImage = async (target: ImageTarget) => {
    try {
      if (target === "avatar") {
        await updateMyProfile({ image: null }).unwrap();
      } else {
        await updateMyProfile({ coverImage: null }).unwrap();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const isUploadingAvatar = uploadingTarget === "avatar";
  const isUploadingCover = uploadingTarget === "cover";

  if (isPending || profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-background">
        <View className="relative">
          {!!displayCover ? (
            <Image
              source={{ uri: displayCover }}
              style={{
                width: "100%",
                height: 230,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
              }}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[COLORS.primary, COLORS.primary2, COLORS.soft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 230,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
                overflow: "hidden",
              }}
            >
              <View className="flex-1 justify-end px-5 pb-5 pt-6">
                <View>
                  <Text
                    className="text-white/90"
                    style={{
                      fontSize: 13,
                      fontFamily: "Poppins_500Medium",
                    }}
                  >
                    {user?.businessType || "Profile"}
                  </Text>

                  <Text
                    className="text-white"
                    style={{
                      fontSize: 28,
                      lineHeight: 36,
                      fontFamily: "Poppins_700Bold",
                      marginTop: 6,
                    }}
                  >
                    {user?.businessName || fullName}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          <View className="absolute right-5 top-5">
            <Menu>
              <Menu.Trigger asChild>
                <Pressable className="h-[42px] w-[42px] items-center justify-center rounded-full border border-white/20 bg-white/15">
                  <Ionicons name="camera-outline" size={20} color="#fff" />
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
                  <Menu.Item onPress={() => pickFromCamera("cover")}>
                    <Menu.ItemTitle>
                      {isUploadingCover ? "Uploading..." : "Take photo"}
                    </Menu.ItemTitle>
                  </Menu.Item>

                  <Menu.Item onPress={() => pickFromGallery("cover")}>
                    <Menu.ItemTitle>Choose from gallery</Menu.ItemTitle>
                  </Menu.Item>

                  <Menu.Item
                    onPress={() => removeProfileImage("cover")}
                    variant="danger"
                  >
                    <Menu.ItemTitle>Remove cover photo</Menu.ItemTitle>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu>
          </View>

          <View className="absolute left-5 -bottom-[54px]">
            <View className="relative h-[116px] w-[116px]">
              <View className="h-[116px] w-[116px] items-center justify-center overflow-hidden rounded-full border-4 border-background bg-surface">
                {displayAvatar ? (
                  <Image
                    source={{ uri: displayAvatar }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-segment">
                    <Text
                      className="text-accent"
                      style={{
                        fontSize: 36,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      {initials}
                    </Text>
                  </View>
                )}
              </View>

              <View className="absolute bottom-1 right-1">
                <Menu>
                  <Menu.Trigger asChild>
                    <Pressable className="h-[34px] w-[34px] items-center justify-center rounded-full border border-border bg-surface">
                      <Ionicons
                        name="camera-outline"
                        size={16}
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
                        onPress={() => removeProfileImage("avatar")}
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
        </View>

        <View className="px-5 pt-[68px]">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text
                className="text-foreground"
                style={{
                  fontSize: 30,
                  lineHeight: 38,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {fullName}
              </Text>

              <Text
                className="mt-1 text-muted"
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  fontFamily: "Poppins_400Regular",
                }}
              >
                {user?.email}
              </Text>

              {!!user?.businessType && (
                <Text
                  className="mt-2 text-muted"
                  style={{
                    fontSize: 14,
                    lineHeight: 20,
                    fontFamily: "Poppins_500Medium",
                  }}
                >
                  {user.businessType}
                </Text>
              )}

              {profileError ? (
                <Text
                  className="mt-2"
                  style={{
                    color: COLORS.danger,
                    fontSize: 13,
                    fontFamily: "Poppins_500Medium",
                  }}
                >
                  Failed to load profile
                </Text>
              ) : null}
            </View>

            <Menu>
              <Menu.Trigger asChild>
                <Pressable className="h-[46px] w-[46px] items-center justify-center rounded-full border border-border bg-surface">
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={22}
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
                  width={230}
                  className="rounded-2xl border border-border bg-surface"
                >
                  <Menu.Item
                    onPress={handleEditProfile}
                    className="flex-row items-center gap-3"
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                    <Menu.ItemTitle>Edit Profile</Menu.ItemTitle>
                  </Menu.Item>

                  <Menu.Item
                    onPress={handleCreateCommunity}
                    className="flex-row items-center gap-3"
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                    <Menu.ItemTitle>Create Community</Menu.ItemTitle>
                  </Menu.Item>

                  <Menu.Item
                    onPress={handleLogout}
                    variant="danger"
                    isDisabled={isLoggingOut}
                    className="flex-row items-center gap-3"
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={20}
                      color={COLORS.danger}
                    />
                    <Menu.ItemTitle>
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </Menu.ItemTitle>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Portal>
            </Menu>
          </View>
        </View>

        <View className="mt-6 px-5">
          <View className="px-4 py-4">
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
                  contentContainerStyle={{
                    flexDirection: "row",
                    gap: 20,
                    paddingRight: 24,
                  }}
                >
                  <Tabs.Indicator />
                  <Tabs.Trigger value="posts">
                    <Tabs.Label>Posts</Tabs.Label>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="about">
                    <Tabs.Label>About</Tabs.Label>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="communities">
                    <Tabs.Label>Communities</Tabs.Label>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="joinedCommunities">
                    <Tabs.Label>Joined</Tabs.Label>
                  </Tabs.Trigger>
                </Tabs.ScrollView>
              </Tabs.List>

              <View className="pt-5">
                <Tabs.Content value="posts">
                  <View className="bg-background p-4">
                    <Text
                      className="text-foreground"
                      style={{
                        fontSize: 20,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      Posts
                    </Text>
                    <Text
                      className="mt-2 text-muted"
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        fontFamily: "Poppins_400Regular",
                      }}
                    >
                      Your post activity will appear here.
                    </Text>
                  </View>
                </Tabs.Content>

                <Tabs.Content value="about">
                  <View className="gap-3">
                    <View className="p-2">
                      <Text
                        className="text-foreground"
                        style={{
                          fontSize: 20,
                          fontFamily: "Poppins_700Bold",
                        }}
                      >
                        About
                      </Text>

                      <View className="mt-4 gap-3">
                        <InfoRow
                          icon="person-outline"
                          label="Name"
                          value={fullName}
                        />
                        <InfoRow
                          icon="mail-outline"
                          label="Email"
                          value={user?.email || "-"}
                        />
                        <InfoRow
                          icon="briefcase-outline"
                          label="Business Type"
                          value={user?.businessType || "-"}
                        />
                        <InfoRow
                          icon="location-outline"
                          label="Address"
                          value={user?.address || "-"}
                        />
                      </View>
                    </View>
                  </View>
                </Tabs.Content>

                <Tabs.Content value="communities">
                  <View className="bg-background p-2">
                    <Text
                      className="text-foreground"
                      style={{
                        fontSize: 20,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      Communities
                    </Text>

                    {myCommunitiesLoading ? (
                      <Text
                        className="mt-3 text-muted"
                        style={{
                          fontSize: 14,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        Loading communities...
                      </Text>
                    ) : myCommunitiesError ? (
                      <Text
                        className="mt-3"
                        style={{
                          color: COLORS.danger,
                          fontSize: 14,
                          fontFamily: "Poppins_500Medium",
                        }}
                      >
                        Failed to load communities
                      </Text>
                    ) : ownedCommunities.length === 0 ? (
                      <>
                        <Text
                          className="mt-2 text-muted"
                          style={{
                            fontSize: 14,
                            lineHeight: 22,
                            fontFamily: "Poppins_400Regular",
                          }}
                        >
                          You do not own any communities yet.
                        </Text>

                        <Text
                          className="mt-4 text-muted"
                          style={{
                            fontSize: 13,
                            lineHeight: 20,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          Use the menu at the top right to create a new
                          community.
                        </Text>
                      </>
                    ) : (
                      <View className="mt-4 gap-3">
                        {ownedCommunities.map((community) => (
                          <Pressable
                            key={community.id}
                            onPress={() =>
                              router.push(
                                `/community-dashboard/${community.slug}`,
                              )
                            }
                            className="overflow-hidden rounded-[22px] border border-border bg-surface"
                          >
                            {!!community.coverImage ? (
                              <Image
                                source={{
                                  uri: toAbsoluteFileUrl(
                                    community.coverImage,
                                  )!,
                                }}
                                style={{ width: "100%", height: 110 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <LinearGradient
                                colors={[
                                  COLORS.primary,
                                  COLORS.primary2,
                                  COLORS.soft,
                                ]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ height: 110 }}
                              />
                            )}

                            <View className="p-4">
                              <View className="flex-row items-start gap-3">
                                <View className="h-[52px] w-[52px] overflow-hidden rounded-full border border-border bg-segment">
                                  {!!community.avatarImage ? (
                                    <Image
                                      source={{
                                        uri: toAbsoluteFileUrl(
                                          community.avatarImage,
                                        )!,
                                      }}
                                      style={{ width: "100%", height: "100%" }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View className="h-full w-full items-center justify-center">
                                      <Ionicons
                                        name="people-outline"
                                        size={22}
                                        color={COLORS.primary}
                                      />
                                    </View>
                                  )}
                                </View>

                                <View className="flex-1">
                                  <View className="flex-row items-start justify-between gap-3">
                                    <View className="flex-1">
                                      <Text
                                        className="text-foreground"
                                        style={{
                                          fontSize: 16,
                                          lineHeight: 22,
                                          fontFamily: "Poppins_700Bold",
                                        }}
                                      >
                                        {community.name}
                                      </Text>

                                      <Text
                                        className="mt-1 text-muted"
                                        style={{
                                          fontSize: 13,
                                          lineHeight: 18,
                                          fontFamily: "Poppins_500Medium",
                                        }}
                                      >
                                        {community.category?.name} •{" "}
                                        {community.visibility}
                                      </Text>
                                    </View>

                                    <View className="rounded-full bg-segment px-3 py-2">
                                      <Text
                                        style={{
                                          color: COLORS.primary,
                                          fontSize: 12,
                                          fontFamily: "Poppins_600SemiBold",
                                        }}
                                      >
                                        Owner
                                      </Text>
                                    </View>
                                  </View>

                                  {!!community.description && (
                                    <Text
                                      className="mt-2 text-muted"
                                      numberOfLines={2}
                                      style={{
                                        fontSize: 13,
                                        lineHeight: 20,
                                        fontFamily: "Poppins_400Regular",
                                      }}
                                    >
                                      {community.description}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </Tabs.Content>

                <Tabs.Content value="joinedCommunities">
                  <View className="bg-background p-2">
                    <Text
                      className="text-foreground"
                      style={{
                        fontSize: 20,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      Joined Communities
                    </Text>

                    {myCommunitiesLoading ? (
                      <Text
                        className="mt-3 text-muted"
                        style={{
                          fontSize: 14,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        Loading joined communities...
                      </Text>
                    ) : myCommunitiesError ? (
                      <Text
                        className="mt-3"
                        style={{
                          color: COLORS.danger,
                          fontSize: 14,
                          fontFamily: "Poppins_500Medium",
                        }}
                      >
                        Failed to load joined communities
                      </Text>
                    ) : joinedCommunities.length === 0 ? (
                      <Text
                        className="mt-2 text-muted"
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        You have not joined any communities yet.
                      </Text>
                    ) : (
                      <View className="mt-4 gap-3">
                        {joinedCommunities.map((community) => (
                          <Pressable
                            key={community.id}
                            onPress={() =>
                              router.push(`/community/${community.slug}`)
                            }
                            className="overflow-hidden rounded-[22px] border border-border bg-surface"
                          >
                            {!!community.coverImage ? (
                              <Image
                                source={{
                                  uri: toAbsoluteFileUrl(
                                    community.coverImage,
                                  )!,
                                }}
                                style={{ width: "100%", height: 110 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <LinearGradient
                                colors={[
                                  COLORS.primary,
                                  COLORS.primary2,
                                  COLORS.soft,
                                ]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ height: 110 }}
                              />
                            )}

                            <View className="p-4">
                              <View className="flex-row items-start gap-3">
                                <View className="h-[52px] w-[52px] overflow-hidden rounded-full border border-border bg-segment">
                                  {!!community.avatarImage ? (
                                    <Image
                                      source={{
                                        uri: toAbsoluteFileUrl(
                                          community.avatarImage,
                                        )!,
                                      }}
                                      style={{ width: "100%", height: "100%" }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View className="h-full w-full items-center justify-center">
                                      <Ionicons
                                        name="people-outline"
                                        size={22}
                                        color={COLORS.primary}
                                      />
                                    </View>
                                  )}
                                </View>

                                <View className="flex-1">
                                  <View className="flex-row items-start justify-between gap-3">
                                    <View className="flex-1">
                                      <Text
                                        className="text-foreground"
                                        style={{
                                          fontSize: 16,
                                          lineHeight: 22,
                                          fontFamily: "Poppins_700Bold",
                                        }}
                                      >
                                        {community.name}
                                      </Text>

                                      <Text
                                        className="mt-1 text-muted"
                                        style={{
                                          fontSize: 13,
                                          lineHeight: 18,
                                          fontFamily: "Poppins_500Medium",
                                        }}
                                      >
                                        {community.category?.name} •{" "}
                                        {community.visibility}
                                      </Text>
                                    </View>

                                    <View className="rounded-full bg-segment px-3 py-2">
                                      <Text
                                        style={{
                                          color: COLORS.primary,
                                          fontSize: 12,
                                          fontFamily: "Poppins_600SemiBold",
                                        }}
                                      >
                                        {community.memberRole ?? "Joined"}
                                      </Text>
                                    </View>
                                  </View>

                                  {!!community.description && (
                                    <Text
                                      className="mt-2 text-muted"
                                      numberOfLines={2}
                                      style={{
                                        fontSize: 13,
                                        lineHeight: 20,
                                        fontFamily: "Poppins_400Regular",
                                      }}
                                    >
                                      {community.description}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </Tabs.Content>
              </View>
            </Tabs>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start rounded-[18px] bg-surface px-4 py-3">
      <View className="mr-3 h-[34px] w-[34px] items-center justify-center rounded-full bg-segment">
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>

      <View className="flex-1">
        <Text
          className="text-muted"
          style={{
            fontSize: 12,
            fontFamily: "Poppins_500Medium",
          }}
        >
          {label}
        </Text>
        <Text
          className="mt-1 text-foreground"
          style={{
            fontSize: 15,
            lineHeight: 22,
            fontFamily: "Poppins_600SemiBold",
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}