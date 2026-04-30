import React, { useCallback, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { signOut, useSession } from "@/api/better-auth-client";
import {
  useGetMyCommunitiesQuery,
  type CommunityItem,
} from "@/store/api/communityApi";
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from "@/store/api/profileApi";
import {
  useDeletePostMutation,
  useGetMyPostsQuery,
  useLikePostMutation,
  useSharePostMutation,
  useUnlikePostMutation,
} from "@/store/api/postApi";
import type { CommunityPost, CommunityPostMedia } from "@/types/post";
import {
  useUploadProfileAvatarMutation,
  useUploadProfileCoverMutation,
} from "@/store/api/uploadApi";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import PostMediaViewer from "@/components/post/PostMediaViewer";
import CommunityCard from "@/components/common/communityCard";
import {
  createProfileStyles,
  type ProfileColors,
  type ProfileStyles,
} from "@/constants/styles/profile.styles";

type ImageTarget = "avatar" | "cover";

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [tab, setTab] = useState("posts");
  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(
    null,
  );

  const [viewer, setViewer] = useState<{
    visible: boolean;
    media: CommunityPostMedia[];
    index: number;
  }>({
    visible: false,
    media: [],
    index: 0,
  });

  const { data: session, isPending } = useSession();

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useGetMyProfileQuery(undefined, {
    skip: !session?.user,
  });

  const {
    data: myCommunitiesResponse,
    isLoading: myCommunitiesLoading,
    error: myCommunitiesError,
  } = useGetMyCommunitiesQuery(
    {
      page: 1,
      limit: 50,
    },
    {
      skip: !session?.user,
    },
  );

  const myCommunities = (myCommunitiesResponse?.data ?? []) as CommunityItem[];

  const {
    data: myPostsResponse,
    isLoading: myPostsLoading,
    error: myPostsError,
  } = useGetMyPostsQuery(
    {
      limit: 20,
      sortBy: "newest",
    },
    {
      skip: !session?.user,
    },
  );

  const myPosts = myPostsResponse?.data ?? [];

  const [deletePost, { isLoading: isDeletingPost }] = useDeletePostMutation();
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [sharePost] = useSharePostMutation();

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
      (community) =>
        community.myRole === "ADMIN" && community.myMemberStatus === "ACTIVE",
    );
  }, [myCommunities]);

  const joinedCommunities = useMemo(() => {
    return myCommunities.filter(
      (community) =>
        community.myRole !== "ADMIN" && community.myMemberStatus === "ACTIVE",
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
    router.push("/pages/createCommunity");
  };

  const handleEditProfile = () => {
    router.push("/pages/editprofile");
  };

  const openViewer = useCallback((media: CommunityPostMedia[], index: number) => {
    setViewer({
      visible: true,
      media,
      index,
    });
  }, []);

  const closeViewer = useCallback(() => {
    setViewer((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const handleDeletePost = useCallback(
    async (post: CommunityPost) => {
      try {
        await deletePost({
          communityId: post.communityId,
          postId: post.id,
        }).unwrap();
      } catch (error) {
        console.log("Delete post failed:", error);
        throw error;
      }
    },
    [deletePost],
  );

  const handleLikePost = useCallback(
    async (post: CommunityPost) => {
      try {
        if (post.isLikedByMe) {
          await unlikePost({
            communityId: post.communityId,
            postId: post.id,
          }).unwrap();
        } else {
          await likePost({
            communityId: post.communityId,
            postId: post.id,
          }).unwrap();
        }
      } catch (error) {
        console.log("Like/unlike failed:", error);
      }
    },
    [likePost, unlikePost],
  );

  const handleSharePost = useCallback(
    async (post: CommunityPost) => {
      try {
        await sharePost({
          communityId: post.communityId,
          postId: post.id,
          body: {
            platform: "copy_link",
          },
        }).unwrap();
      } catch (error) {
        console.log("Share post failed:", error);
      }
    },
    [sharePost],
  );

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
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <>
      <SafeAreaView style={styles.root} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            <View style={styles.coverSection}>
              {!!displayCover ? (
                <Image
                  source={{ uri: displayCover }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={[colors.accent, colors.surfaceTertiary, colors.segment]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coverFallback}
                >
                  <View style={styles.coverFallbackContent}>
                    <Text style={styles.coverSmallText}>
                      {user?.businessType || "Profile"}
                    </Text>

                    <Text style={styles.coverBigText}>
                      {user?.businessName || fullName}
                    </Text>
                  </View>
                </LinearGradient>
              )}

              <View style={styles.coverActionWrap}>
                <Menu>
                  <Menu.Trigger asChild>
                    <Pressable style={styles.coverActionButton}>
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

              <View style={styles.avatarFloatingWrap}>
                <View style={styles.avatarOuter}>
                  {displayAvatar ? (
                    <Image
                      source={{ uri: displayAvatar }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{initials}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.avatarActionWrap}>
                  <Menu>
                    <Menu.Trigger asChild>
                      <Pressable style={styles.avatarActionButton}>
                        <Ionicons
                          name="camera-outline"
                          size={16}
                          color={colors.accent}
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

            <View style={styles.profileInfoSection}>
              <View style={styles.profileInfoRow}>
                <View style={styles.profileInfoLeft}>
                  <Text style={styles.profileName}>{fullName}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>

                  {!!user?.businessType && (
                    <Text style={styles.profileBusinessType}>
                      {user.businessType}
                    </Text>
                  )}

                  {profileError ? (
                    <Text style={styles.errorText}>Failed to load profile</Text>
                  ) : null}
                </View>

                <View style={styles.profileInfoRight}>
                  <Menu>
                    <Menu.Trigger asChild>
                      <Pressable style={styles.menuButton}>
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={22}
                          color={colors.accent}
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
                        <Menu.Item onPress={handleEditProfile}>
                          <Menu.ItemTitle>Edit Profile</Menu.ItemTitle>
                        </Menu.Item>

                        <Menu.Item onPress={handleCreateCommunity}>
                          <Menu.ItemTitle>Create Community</Menu.ItemTitle>
                        </Menu.Item>

                        <Menu.Item
                          onPress={handleLogout}
                          variant="danger"
                          isDisabled={isLoggingOut}
                        >
                          <Menu.ItemTitle>
                            {isLoggingOut ? "Logging out..." : "Logout"}
                          </Menu.ItemTitle>
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Portal>
                  </Menu>
                </View>
              </View>
            </View>

            <View style={styles.tabsSection}>
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
                    contentContainerStyle={styles.tabsListContent}
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

                <View style={styles.tabsBody}>
                  <Tabs.Content value="posts">
                    <View style={styles.tabPanel}>
                      {myPostsLoading ? (
                        <View style={styles.stateWrap}>
                          <ActivityIndicator size="small" color={colors.accent} />
                        </View>
                      ) : myPostsError ? (
                        <Text style={styles.errorText}>
                          Failed to load your posts.
                        </Text>
                      ) : myPosts.length === 0 ? (
                        <View style={styles.emptyState}>
                          <Text style={styles.sectionTitle}>Posts</Text>
                          <Text style={styles.sectionText}>
                            You have not posted anything yet.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.postsList}>
                          {myPosts.map((post) => (
                            <CommunityPostCard
                              key={post.id}
                              post={post}
                              disableMediaPlayback={viewer.visible}
                              canDelete
                              isDeleting={isDeletingPost}
                              onDelete={handleDeletePost}
                              onPressLike={handleLikePost}
                              onPressComment={(item) => {
                                console.log("Open comments:", {
                                  postId: item.id,
                                  communityId: item.communityId,
                                });
                              }}
                              onPressShare={handleSharePost}
                              onPressAuthor={(authorId) => {
                                console.log("Open author:", authorId);
                              }}
                              onPressMedia={openViewer}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  </Tabs.Content>

                  <Tabs.Content value="about">
                    <View style={styles.paddedPanel}>
                      <Text style={styles.sectionTitle}>About</Text>

                      <View style={styles.infoList}>
                        <InfoRow
                          icon="person-outline"
                          label="Name"
                          value={fullName}
                          colors={colors}
                          styles={styles}
                        />

                        <InfoRow
                          icon="mail-outline"
                          label="Email"
                          value={user?.email || "-"}
                          colors={colors}
                          styles={styles}
                        />

                        <InfoRow
                          icon="briefcase-outline"
                          label="Business Type"
                          value={user?.businessType || "-"}
                          colors={colors}
                          styles={styles}
                        />

                        <InfoRow
                          icon="location-outline"
                          label="Address"
                          value={user?.address || "-"}
                          colors={colors}
                          styles={styles}
                        />
                      </View>
                    </View>
                  </Tabs.Content>

                  <Tabs.Content value="communities">
                    <View style={styles.paddedPanel}>
                      <Text style={styles.sectionTitle}>Communities</Text>

                      {myCommunitiesLoading ? (
                        <Text style={styles.sectionText}>
                          Loading communities...
                        </Text>
                      ) : myCommunitiesError ? (
                        <Text style={styles.errorText}>
                          Failed to load communities
                        </Text>
                      ) : ownedCommunities.length === 0 ? (
                        <>
                          <Text style={styles.sectionText}>
                            You do not own any communities yet.
                          </Text>

                          <Text style={styles.sectionHint}>
                            Use the menu at the top right to create a new
                            community.
                          </Text>
                        </>
                      ) : (
                        <View style={styles.communityList}>
                        {ownedCommunities.map((community) => (
  <CommunityCard
    key={community.id}
    community={community}
    variant="profile"
    badgeText="Owner"
    onPress={() => router.push(`/user/community-dashboard`)}
  />
))}
                        </View>
                      )}
                    </View>
                  </Tabs.Content>

                  <Tabs.Content value="joinedCommunities">
                    <View style={styles.paddedPanel}>
                      <Text style={styles.sectionTitle}>Joined Communities</Text>

                      {myCommunitiesLoading ? (
                        <Text style={styles.sectionText}>
                          Loading joined communities...
                        </Text>
                      ) : myCommunitiesError ? (
                        <Text style={styles.errorText}>
                          Failed to load joined communities
                        </Text>
                      ) : joinedCommunities.length === 0 ? (
                        <Text style={styles.sectionText}>
                          You have not joined any communities yet.
                        </Text>
                      ) : (
                        <View style={styles.communityList}>
                          {joinedCommunities.map((community) => (
                            <CommunityCard
                              key={community.id}
                              community={community}
                              variant="profile"
                              badgeText={
                                community.myRole === "MODERATOR"
                                  ? "Moderator"
                                  : "Joined"
                              }
                              onPress={() =>
                                router.push(`/user/community/${community.slug}`)
                              }
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  </Tabs.Content>
                </View>
              </Tabs>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <PostMediaViewer
        visible={viewer.visible}
        media={viewer.media}
        initialIndex={viewer.index}
        onClose={closeViewer}
      />
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ProfileColors;
  styles: ProfileStyles;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>

      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}