import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "heroui-native";

import { COLORS } from "@/constants/colors";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useSession } from "@/api/better-auth-client";
import {
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
  useGetCommunityMembersQuery,
  useJoinCommunityMutation,
} from "@/store/api/communityApi";

export default function CommunityDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();

  const [tab, setTab] = useState("posts");
  const [isJoining, setIsJoining] = useState(false);

  const {
    data: community,
    isLoading: communityLoading,
    error: communityError,
  } = useGetCommunityBySlugQuery(slug ?? "", {
    skip: !session?.user || !slug,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: access,
    isLoading: accessLoading,
  } = useGetCommunityAccessQuery(community?.id ?? "", {
    skip: !session?.user || !community?.id,
    refetchOnMountOrArgChange: true,
  });

  const canLoadMembers =
    !!session?.user &&
    !!community?.id &&
    (access?.role === "ADMIN" || access?.permissions?.canManageMembers);

  const {
    data: members = [],
    isLoading: membersLoading,
    error: membersError,
  } = useGetCommunityMembersQuery(community?.id ?? "", {
    skip: !canLoadMembers,
    refetchOnMountOrArgChange: true,
  });

  const [joinCommunity] = useJoinCommunityMutation();

  const coverUrl = toAbsoluteFileUrl(community?.coverImage);
  const avatarUrl = toAbsoluteFileUrl(community?.avatarImage);

  const isOwner = access?.role === "ADMIN" || community?.memberRole === "ADMIN";
  const isJoined =
    Boolean(access?.isJoined) ||
    Boolean(community?.isJoined) ||
    community?.memberRole === "ADMIN" ||
    community?.memberRole === "MODERATOR" ||
    community?.memberRole === "MEMBER";

  const canViewContent =
    access?.canViewContent ?? community?.canViewContent ?? false;

  const showJoinButton = !!community && !isOwner && !isJoined;

  // current backend does not provide public counts yet
  const memberCount = canLoadMembers ? members.length : "--";
  const totalPostCount = "--";

  const roleLabel = useMemo(() => {
    if (isOwner) return "Owner";
    if (access?.role === "MODERATOR" || community?.memberRole === "MODERATOR") {
      return "Moderator";
    }
    if (isJoined) return "Joined";
    return null;
  }, [access?.role, community?.memberRole, isJoined, isOwner]);

  const handleJoin = async () => {
    if (!community?.id) return;

    try {
      setIsJoining(true);
      await joinCommunity(community.id).unwrap();
    } catch (error) {
      console.log("Join community failed:", error);
    } finally {
      setIsJoining(false);
    }
  };

  if (isPending || communityLoading || accessLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  if (!community || communityError) {
    return (
      <View className="flex-1 bg-background px-5 pt-16">
        <Pressable
          onPress={() => router.back()}
          className="mb-5 h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface"
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={COLORS.primary}
          />
        </Pressable>

        <Text
          className="text-foreground"
          style={{
            fontSize: 24,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Community not found
        </Text>

        <Text
          className="mt-2 text-muted"
          style={{
            fontSize: 14,
            lineHeight: 22,
            fontFamily: "Poppins_400Regular",
          }}
        >
          This community could not be loaded.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-background">
        <View className="relative">
          {!!coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={{
                width: "100%",
                height: 220,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="bg-segment"
              style={{
                height: 220,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
              }}
            />
          )}

          <View className="absolute left-5 top-5">
            <Pressable
              onPress={() => router.back()}
              className="h-[42px] w-[42px] items-center justify-center rounded-full border border-white/20 bg-white/15"
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
          </View>

          <View className="absolute left-5 -bottom-[52px]">
            <View className="h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-full border-4 border-background bg-surface">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center bg-segment">
                  <Ionicons
                    name="people-outline"
                    size={40}
                    color={COLORS.primary}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="px-5 pt-[66px]">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text
                className="text-foreground"
                style={{
                  fontSize: 28,
                  lineHeight: 36,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {community.name}
              </Text>

              <Text
                className="mt-1 text-muted"
                style={{
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: "Poppins_500Medium",
                }}
              >
                {community.category?.name ?? "Unknown"} • {community.visibility}
              </Text>

              {!!community.description ? (
                <Text
                  className="mt-3 text-muted"
                  numberOfLines={3}
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    fontFamily: "Poppins_400Regular",
                  }}
                >
                  {community.description}
                </Text>
              ) : null}
            </View>

            {roleLabel ? (
              <View className="rounded-full bg-segment px-3 py-2">
                <Text
                  style={{
                    color: COLORS.primary,
                    fontSize: 12,
                    fontFamily: "Poppins_600SemiBold",
                  }}
                >
                  {roleLabel}
                </Text>
              </View>
            ) : showJoinButton ? (
              <Pressable
                onPress={handleJoin}
                disabled={isJoining}
                className="rounded-full bg-accent px-4 py-2"
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 12,
                      fontFamily: "Poppins_600SemiBold",
                    }}
                  >
                    Join
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>

          <View className="mt-5 flex-row gap-3">
            <StatCard label="Members" value={String(memberCount)} />
            <StatCard label="Posts" value={String(totalPostCount)} />
          </View>
        </View>

        <View className="mt-6 px-5">
          <View className="px-2 py-4">
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
                  <Tabs.Trigger value="guidelines">
                    <Tabs.Label>Guidelines</Tabs.Label>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="members">
                    <Tabs.Label>Members</Tabs.Label>
                  </Tabs.Trigger>
                </Tabs.ScrollView>
              </Tabs.List>

              <View className="pt-5">
                <Tabs.Content value="posts">
                  <View className="bg-background p-2">
                    <Text
                      className="text-foreground"
                      style={{
                        fontSize: 20,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      Posts
                    </Text>

                    {!canViewContent && community.visibility === "PRIVATE" ? (
                      <Text
                        className="mt-2 text-muted"
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        Join this private community to view posts.
                      </Text>
                    ) : (
                      <Text
                        className="mt-2 text-muted"
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        Community posts API is not added yet. This tab is ready for
                        your future posts list.
                      </Text>
                    )}
                  </View>
                </Tabs.Content>

                <Tabs.Content value="about">
                  <View className="gap-3 p-2">
                    <Text
                      className="text-foreground"
                      style={{
                        fontSize: 20,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      About
                    </Text>

                    <InfoRow
                      icon="people-outline"
                      label="Community Name"
                      value={community.name}
                    />
                    <InfoRow
                      icon="grid-outline"
                      label="Category"
                      value={community.category?.name ?? "-"}
                    />
                    <InfoRow
                      icon="lock-closed-outline"
                      label="Visibility"
                      value={community.visibility}
                    />
                    <InfoRow
                      icon="shield-checkmark-outline"
                      label="Your Role"
                      value={roleLabel ?? "Visitor"}
                    />
                    <InfoRow
                      icon="document-text-outline"
                      label="Description"
                      value={community.description || "-"}
                      multiline
                    />
                  </View>
                </Tabs.Content>

                <Tabs.Content value="guidelines">
                  <View className="bg-background p-2">
                    <Text
                      className="text-foreground"
                      style={{
                        fontSize: 20,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      Guidelines
                    </Text>

                    <Text
                      className="mt-2 text-muted"
                      style={{
                        fontSize: 14,
                        lineHeight: 22,
                        fontFamily: "Poppins_400Regular",
                      }}
                    >
                      Guidelines API is not added yet, so this tab is only a UI
                      placeholder for now.
                    </Text>
                  </View>
                </Tabs.Content>

                <Tabs.Content value="members">
                  <View className="bg-background p-2">
                    <Text
                      className="text-foreground"
                      style={{
                        fontSize: 20,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      Members
                    </Text>

                    {!isJoined && community.visibility === "PRIVATE" ? (
                      <Text
                        className="mt-2 text-muted"
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        Join this private community to access member-related
                        information.
                      </Text>
                    ) : canLoadMembers ? (
                      membersLoading ? (
                        <View className="py-6">
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        </View>
                      ) : membersError ? (
                        <Text
                          className="mt-2"
                          style={{
                            color: COLORS.danger,
                            fontSize: 14,
                            fontFamily: "Poppins_500Medium",
                          }}
                        >
                          Failed to load members
                        </Text>
                      ) : members.length === 0 ? (
                        <Text
                          className="mt-2 text-muted"
                          style={{
                            fontSize: 14,
                            lineHeight: 22,
                            fontFamily: "Poppins_400Regular",
                          }}
                        >
                          No members found.
                        </Text>
                      ) : (
                        <View className="mt-4 gap-3">
                          {members.map((member) => {
                            const memberAvatar = toAbsoluteFileUrl(member.user.image);

                            return (
                              <View
                                key={member.id}
                                className="flex-row items-center rounded-[20px] border border-border bg-surface px-4 py-3"
                              >
                                <View className="mr-3 h-[48px] w-[48px] overflow-hidden rounded-full border border-border bg-segment">
                                  {memberAvatar ? (
                                    <Image
                                      source={{ uri: memberAvatar }}
                                      style={{ width: "100%", height: "100%" }}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View className="h-full w-full items-center justify-center">
                                      <Ionicons
                                        name="person-outline"
                                        size={20}
                                        color={COLORS.primary}
                                      />
                                    </View>
                                  )}
                                </View>

                                <View className="flex-1">
                                  <Text
                                    className="text-foreground"
                                    style={{
                                      fontSize: 15,
                                      fontFamily: "Poppins_600SemiBold",
                                    }}
                                  >
                                    {member.user.name}
                                  </Text>

                                  <Text
                                    className="mt-1 text-muted"
                                    style={{
                                      fontSize: 13,
                                      fontFamily: "Poppins_400Regular",
                                    }}
                                  >
                                    {member.role}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )
                    ) : (
                      <Text
                        className="mt-2 text-muted"
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        Your current backend only allows the members endpoint for
                        admin or users with member-management permission. If you want
                        every joined user to see members, add a public members list or
                        at least a members count field in the community detail API.
                      </Text>
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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-[18px] border border-border bg-surface px-4 py-4">
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
          fontSize: 22,
          fontFamily: "Poppins_700Bold",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  multiline = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  multiline?: boolean;
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
          numberOfLines={multiline ? undefined : 2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}