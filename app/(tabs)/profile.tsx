import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Menu, Tabs } from "heroui-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { signOut, useSession } from "@/api/better-auth-client";

import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import type { CommunityItem } from "@/types/community";

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

import type { CommunityPost, CommunityPostMediaType } from "@/types/post";

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

const POSTS_LIMIT = 10;

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [tab, setTab] = useState("posts");

  const [uploadingTarget, setUploadingTarget] = useState<ImageTarget | null>(
    null,
  );

  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [allPosts, setAllPosts] = useState<CommunityPost[]>([]);

  const lastAppliedCursorRef = useRef<string | null>("__initial__");

  const [viewer, setViewer] = useState<{
    visible: boolean;
    media: CommunityPostMediaType[];
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
    refetch: refetchProfile,
  } = useGetMyProfileQuery(undefined, {
    skip: !session?.user,
  });

  const {
    data: myCommunitiesResponse,
    isLoading: myCommunitiesLoading,
    error: myCommunitiesError,
    refetch: refetchMyCommunities,
  } = useGetMyCommunitiesQuery(
    {
      page: 1,
      limit: 50,
    },
    {
      skip: !session?.user,
    },
  );

  const {
    data: myPostsResponse,
    isLoading: myPostsLoading,
    isFetching: myPostsFetching,
    error: myPostsError,
    refetch: refetchMyPosts,
  } = useGetMyPostsQuery(
    {
      limit: POSTS_LIMIT,
      cursor: postsCursor,
      sortBy: "newest",
    },
    {
      skip: !session?.user,
    },
  );

  const myCommunities = (myCommunitiesResponse?.data ?? []) as CommunityItem[];

  const hasMorePosts = myPostsResponse?.meta?.hasMore ?? false;
  const nextPostsCursor = myPostsResponse?.meta?.nextCursor ?? null;

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

  useEffect(() => {
    if (!myPostsResponse) return;

    const responseCursor = postsCursor ?? null;

    if (lastAppliedCursorRef.current === responseCursor) return;

    lastAppliedCursorRef.current = responseCursor;

    const posts = myPostsResponse.data ?? [];

    if (!responseCursor) {
      setAllPosts(posts);
      return;
    }

    setAllPosts((prev) => {
      const existingIds = new Set(prev.map((post) => post.id));
      const newPosts = posts.filter((post) => !existingIds.has(post.id));

      return [...prev, ...newPosts];
    });
  }, [myPostsResponse, postsCursor]);

  const loadMorePosts = useCallback(() => {
    if (tab !== "posts") return;
    if (myPostsLoading || myPostsFetching) return;
    if (!hasMorePosts || !nextPostsCursor) return;

    setPostsCursor(nextPostsCursor);
  }, [
    tab,
    myPostsLoading,
    myPostsFetching,
    hasMorePosts,
    nextPostsCursor,
  ]);

  const refreshProfilePage = useCallback(() => {
    lastAppliedCursorRef.current = "__refresh__";
    setPostsCursor(null);
    setAllPosts([]);

    refetchProfile();
    refetchMyCommunities();
    refetchMyPosts();
  }, [refetchProfile, refetchMyCommunities, refetchMyPosts]);

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

  const openViewer = useCallback(
    (media: CommunityPostMediaType[], index: number) => {
      setViewer({
        visible: true,
        media,
        index,
      });
    },
    [],
  );

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

        setAllPosts((prev) => prev.filter((item) => item.id !== post.id));
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
          const response = await unlikePost({
            communityId: post.communityId,
            postId: post.id,
          }).unwrap();

          setAllPosts((prev) =>
            prev.map((item) =>
              item.id === post.id
                ? {
                    ...item,
                    isLikedByMe: response.liked,
                    likeCount: response.likeCount,
                  }
                : item,
            ),
          );
        } else {
          const response = await likePost({
            communityId: post.communityId,
            postId: post.id,
          }).unwrap();

          setAllPosts((prev) =>
            prev.map((item) =>
              item.id === post.id
                ? {
                    ...item,
                    isLikedByMe: response.liked,
                    likeCount: response.likeCount,
                  }
                : item,
            ),
          );
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
        const response = await sharePost({
          communityId: post.communityId,
          postId: post.id,
          body: {
            platform: "copy_link",
          },
        }).unwrap();

        setAllPosts((prev) =>
          prev.map((item) =>
            item.id === post.id
              ? {
                  ...item,
                  shareCount: response.shareCount,
                }
              : item,
          ),
        );
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

  const renderPost = useCallback(
    ({ item }: { item: CommunityPost }) => {
      return (
        <CommunityPostCard
          post={item}
          disableMediaPlayback={viewer.visible}
          canDelete
          isDeleting={isDeletingPost}
          onDelete={handleDeletePost}
          onPressLike={handleLikePost}
          onPressComment={(post) => {
            console.log("Open comments:", {
              postId: post.id,
              communityId: post.communityId,
            });
          }}
          onPressShare={handleSharePost}
          onPressAuthor={(authorId) => {
            router.push({
              pathname: "/user/profile/[userId]",
              params: { userId: authorId },
            });
          }}
          onPressMedia={openViewer}
        />
      );
    },
    [
      viewer.visible,
      isDeletingPost,
      handleDeletePost,
      handleLikePost,
      handleSharePost,
      openViewer,
    ],
  );

  if (isPending || profileLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["left", "right"]}>
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
      <SafeAreaView style={styles.root} edges={["left", "right"]}>
        <FlatList
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          data={tab === "posts" ? allPosts : []}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={myPostsFetching && postsCursor === null}
              onRefresh={refreshProfilePage}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={
            <View style={styles.page}>
              <View style={styles.coverSection}>
                {!!displayCover ? (
                  <Image
                    source={{ uri: displayCover }}
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.coverFallback} />
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
                        <Text style={styles.avatarFallbackText}>
                          {initials}
                        </Text>
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
                              {isUploadingAvatar
                                ? "Uploading..."
                                : "Take photo"}
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
                      <Text style={styles.errorText}>
                        Failed to load profile
                      </Text>
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

                  {tab === "about" ? (
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
                  ) : null}

                  {tab === "communities" ? (
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
                              onPress={() =>
                                router.push("/user/community-dashboard")
                              }
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : null}

                  {tab === "joinedCommunities" ? (
                    <View style={styles.paddedPanel}>
                      <Text style={styles.sectionTitle}>
                        Joined Communities
                      </Text>

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
                  ) : null}

                  {tab === "posts" ? (
                    <View style={styles.tabPanel}>
                      {myPostsLoading && allPosts.length === 0 ? (
                        <View style={styles.stateWrap}>
                          <ActivityIndicator
                            size="small"
                            color={colors.accent}
                          />
                        </View>
                      ) : myPostsError && allPosts.length === 0 ? (
                        <Text style={styles.errorText}>
                          Failed to load your posts.
                        </Text>
                      ) : allPosts.length === 0 ? (
                        <View style={styles.emptyState}>
                          <Text style={styles.sectionTitle}>Posts</Text>
                          <Text style={styles.sectionText}>
                            You have not posted anything yet.
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </Tabs>
              </View>
            </View>
          }
          ListFooterComponent={
            tab === "posts" &&
            myPostsFetching &&
            allPosts.length > 0 &&
            postsCursor !== null ? (
              <View style={styles.stateWrap}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : null
          }
        />
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