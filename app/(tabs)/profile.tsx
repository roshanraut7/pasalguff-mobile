import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Menu, Tabs } from "heroui-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/constants/colors";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { signOut, useSession } from "@/api/better-auth-client";
import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} from "@/store/api/profileApi";
import {
  type CommunityPostMedia,
  useGetMyPostsQuery,
} from "@/store/api/postApi";
import {
  useUploadProfileAvatarMutation,
  useUploadProfileCoverMutation,
} from "@/store/api/uploadApi";
import CommunityPostCard from "@/components/post/CommunityPostCard";
import PostMediaViewer from "@/components/post/PostMediaViewer";

type ImageTarget = "avatar" | "cover";

type CommunityPreview = {
  id: string;
  slug: string;
  name: string;
  visibility: string;
  description?: string | null;
  coverImage?: string | null;
  avatarImage?: string | null;
  memberRole?: string | null;
  category?: {
    name?: string | null;
  } | null;
};

export default function ProfileScreen() {
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
    data: myCommunities = [],
    isLoading: myCommunitiesLoading,
    error: myCommunitiesError,
  } = useGetMyCommunitiesQuery(undefined, {
    skip: !session?.user,
  });

  const {
    data: myPosts = [],
    isLoading: myPostsLoading,
    error: myPostsError,
  } = useGetMyPostsQuery(undefined, {
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
          <ActivityIndicator size="large" color={COLORS.primary} />
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
                  colors={[COLORS.primary, COLORS.primary2, COLORS.soft]}
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
                          <ActivityIndicator size="small" color={COLORS.primary} />
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
                              onPressLike={(item) => {
                                console.log("Like pressed:", item.id);
                              }}
                              onPressComment={(item) => {
                                console.log("Comment pressed:", item.id);
                              }}
                              onPressShare={(item) => {
                                console.log("Share pressed:", item.id);
                              }}
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
                  </Tabs.Content>

                  <Tabs.Content value="communities">
                    <View style={styles.paddedPanel}>
                      <Text style={styles.sectionTitle}>Communities</Text>

                      {myCommunitiesLoading ? (
                        <Text style={styles.sectionText}>Loading communities...</Text>
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
                            Use the menu at the top right to create a new community.
                          </Text>
                        </>
                      ) : (
                        <View style={styles.communityList}>
                          {ownedCommunities.map((community) => (
                            <CommunityPreviewCard
                              key={community.id}
                              community={community}
                              badgeText="Owner"
                              onPress={() =>
                                router.push(`/community-dashboard/${community.slug}`)
                              }
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
                            <CommunityPreviewCard
                              key={community.id}
                              community={community}
                              badgeText={community.memberRole ?? "Joined"}
                              onPress={() =>
                                router.push(`/community/${community.slug}`)
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

function CommunityPreviewCard({
  community,
  badgeText,
  onPress,
}: {
  community: CommunityPreview;
  badgeText: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.communityCard}>
      {!!community.coverImage ? (
        <Image
          source={{ uri: toAbsoluteFileUrl(community.coverImage)! }}
          style={styles.communityCover}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primary2, COLORS.soft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.communityCover}
        />
      )}

      <View style={styles.communityBody}>
        <View style={styles.communityRow}>
          <View style={styles.communityAvatarWrap}>
            {!!community.avatarImage ? (
              <Image
                source={{ uri: toAbsoluteFileUrl(community.avatarImage)! }}
                style={styles.communityAvatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.communityAvatarFallback}>
                <Ionicons
                  name="people-outline"
                  size={22}
                  color={COLORS.primary}
                />
              </View>
            )}
          </View>

          <View style={styles.communityTextArea}>
            <View style={styles.communityHeaderRow}>
              <View style={styles.communityTitleArea}>
                <Text style={styles.communityName}>{community.name}</Text>
                <Text style={styles.communityMeta}>
                  {community.category?.name} • {community.visibility}
                </Text>
              </View>

              <View style={styles.communityBadge}>
                <Text style={styles.communityBadgeText}>{badgeText}</Text>
              </View>
            </View>

            {!!community.description && (
              <Text style={styles.communityDescription} numberOfLines={2}>
                {community.description}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
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
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>

      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
    backgroundColor: COLORS.background,
  },
  page: {
    backgroundColor: COLORS.background,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  coverSection: {
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: 230,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  coverFallback: {
    height: 230,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },
  coverFallbackContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 24,
  },
  coverSmallText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },
  coverBigText: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 36,
    fontFamily: "Poppins_700Bold",
    marginTop: 6,
  },
  coverActionWrap: {
    position: "absolute",
    right: 20,
    top: 20,
  },
  coverActionButton: {
    height: 42,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  avatarFloatingWrap: {
    position: "absolute",
    left: 20,
    bottom: -54,
    width: 116,
    height: 116,
  },
  avatarOuter: {
    width: 116,
    height: 116,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 4,
    borderColor: COLORS.background,
    backgroundColor: COLORS.card,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.soft,
  },
  avatarFallbackText: {
    color: COLORS.primary,
    fontSize: 36,
    fontFamily: "Poppins_700Bold",
  },
  avatarActionWrap: {
    position: "absolute",
    right: 4,
    bottom: 4,
  },
  avatarActionButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  profileInfoSection: {
    paddingHorizontal: 20,
    paddingTop: 68,
  },
  profileInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  profileInfoLeft: {
    width: "78%",
  },
  profileInfoRight: {
    width: "18%",
    alignItems: "flex-end",
  },
  profileName: {
    color: COLORS.text,
    fontSize: 30,
    lineHeight: 38,
    fontFamily: "Poppins_700Bold",
  },
  profileEmail: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
  profileBusinessType: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium",
  },

  tabsSection: {
    marginTop: 24,
  },
  tabsListContent: {
    flexDirection: "row",
    gap: 20,
    paddingLeft: 20,
    paddingRight: 24,
  },
  tabsBody: {
    paddingTop: 20,
    backgroundColor: COLORS.background,
  },

  tabPanel: {
    backgroundColor: COLORS.background,
  },
  paddedPanel: {
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
  },
  postsList: {
    marginTop: 8,
  },
  stateWrap: {
    paddingVertical: 32,
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
  },
  sectionText: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },
  sectionHint: {
    marginTop: 16,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium",
  },
  errorText: {
    marginTop: 8,
    color: COLORS.danger,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },

  infoList: {
    marginTop: 16,
    rowGap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoIconWrap: {
    marginRight: 12,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: COLORS.soft,
  },
  infoTextWrap: {
    width: "84%",
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  infoValue: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_600SemiBold",
  },

  communityList: {
    marginTop: 16,
    rowGap: 12,
  },
  communityCard: {
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  communityCover: {
    width: "100%",
    height: 110,
  },
  communityBody: {
    padding: 16,
  },
  communityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  communityAvatarWrap: {
    width: 52,
    height: 52,
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.soft,
  },
  communityAvatar: {
    width: "100%",
    height: "100%",
  },
  communityAvatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  communityTextArea: {
    width: "82%",
    marginLeft: 12,
  },
  communityHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  communityTitleArea: {
    width: "72%",
  },
  communityName: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold",
  },
  communityMeta: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
  },
  communityBadge: {
    borderRadius: 999,
    backgroundColor: COLORS.soft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  communityBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  communityDescription: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  menuButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
});