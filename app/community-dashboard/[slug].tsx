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
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-gifted-charts";
import { DataTable } from "react-native-paper";
import { Menu, Tabs } from "heroui-native";

import { COLORS } from "@/constants/colors";
import { toAbsoluteFileUrl } from "@/lib/file-url";
import { useSession } from "@/api/better-auth-client";
import {
  useBanCommunityMemberMutation,
  useGetCommunityAccessQuery,
  useGetCommunityBySlugQuery,
  useGetCommunityJoinRequestsQuery,
  useGetCommunityMembersQuery,
  useReviewCommunityJoinRequestMutation,
} from "@/store/api/communityApi";

export default function CommunityDashboardScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: session, isPending } = useSession();

  const [tab, setTab] = useState("overview");
  const [memberPage, setMemberPage] = useState(0);
  const [requestPage, setRequestPage] = useState(0);

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

  const isOwner = access?.role === "ADMIN" || community?.memberRole === "ADMIN";
  const isPrivateCommunity = community?.visibility === "PRIVATE";

  const {
    data: members = [],
    isLoading: membersLoading,
    error: membersError,
  } = useGetCommunityMembersQuery(community?.id ?? "", {
    skip: !session?.user || !community?.id || !isOwner,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: joinRequests = [],
    isLoading: joinRequestsLoading,
    error: joinRequestsError,
  } = useGetCommunityJoinRequestsQuery(community?.id ?? "", {
    skip: !session?.user || !community?.id || !isOwner || !isPrivateCommunity,
    refetchOnMountOrArgChange: true,
  });

  const [reviewJoinRequest, { isLoading: reviewingRequest }] =
    useReviewCommunityJoinRequestMutation();
  const [banCommunityMember, { isLoading: banningMember }] =
    useBanCommunityMemberMutation();

  const avatarUrl = toAbsoluteFileUrl(community?.avatarImage);

  // Snapshot metrics that already exist in your current backend response.
  const memberCount = Number(community?.memberCount ?? members.length ?? 0);
  const postCount = Number(community?.postCount ?? 0);
  const moderatorsCount = useMemo(
    () => members.filter((member) => member.role === "MODERATOR").length,
    [members],
  );
  const pendingRequestsCount = joinRequests.length;

  // KPI cards are built conditionally so public communities do not show request KPI.
  const kpiCards = useMemo(() => {
    const baseCards = [
      {
        key: "members",
        label: "Members",
        value: memberCount,
        icon: "people-outline" as const,
      },
      {
        key: "moderators",
        label: "Moderators",
        value: moderatorsCount,
        icon: "shield-checkmark-outline" as const,
      },
      {
        key: "posts",
        label: "Posts",
        value: postCount,
        icon: "bar-chart-outline" as const,
      },
    ];

    if (isPrivateCommunity) {
      baseCards.splice(2, 0, {
        key: "requests",
        label: "Requests",
        value: pendingRequestsCount,
        icon: "mail-unread-outline" as const,
      });
    }

    return baseCards;
  }, [
    isPrivateCommunity,
    memberCount,
    moderatorsCount,
    pendingRequestsCount,
    postCount,
  ]);

  // Area chart data using values we honestly have right now.
  // For public communities we do not include requests as a point.
  const overviewAreaData = useMemo(() => {
    const base = [
      { value: Math.max(memberCount, 0), label: "Members" },
      { value: Math.max(moderatorsCount, 0), label: "Mods" },
      { value: Math.max(postCount, 0), label: "Posts" },
    ];

    if (isPrivateCommunity) {
      return [
        { value: Math.max(memberCount, 0), label: "Members" },
        { value: Math.max(moderatorsCount, 0), label: "Mods" },
        { value: Math.max(pendingRequestsCount, 0), label: "Requests" },
        { value: Math.max(postCount, 0), label: "Posts" },
      ];
    }

    return base;
  }, [isPrivateCommunity, memberCount, moderatorsCount, pendingRequestsCount, postCount]);

  const memberPageSize = 5;
  const requestPageSize = 4;

  const memberRows = useMemo(() => {
    const from = memberPage * memberPageSize;
    const to = Math.min(from + memberPageSize, members.length);
    return members.slice(from, to);
  }, [memberPage, members]);

  const requestRows = useMemo(() => {
    const from = requestPage * requestPageSize;
    const to = Math.min(from + requestPageSize, joinRequests.length);
    return joinRequests.slice(from, to);
  }, [requestPage, joinRequests]);

  // Tab list is also conditional so public communities do not show a Requests tab.
  const dashboardTabs = useMemo(() => {
    const tabs = [
      { key: "overview", label: "Overview" },
      { key: "members", label: "Members" },
      { key: "settings", label: "Settings" },
    ];

    if (isPrivateCommunity) {
      tabs.splice(1, 0, { key: "requests", label: "Requests" });
    }

    return tabs;
  }, [isPrivateCommunity]);

  const handleReviewRequest = async (
    requestId: string,
    action: "APPROVE" | "REJECT",
  ) => {
    if (!community?.id) return;

    try {
      await reviewJoinRequest({
        communityId: community.id,
        requestId,
        action,
      }).unwrap();
    } catch (error) {
      console.log("Review join request failed:", error);
    }
  };

  const handleBanMember = async (targetUserId: string) => {
    if (!community?.id) return;

    try {
      await banCommunityMember({
        communityId: community.id,
        targetUserId,
      }).unwrap();
    } catch (error) {
      console.log("Ban member failed:", error);
    }
  };

  const handleViewCommunity = () => {
    if (!community?.slug) return;

    router.push({
      pathname: "/community/[slug]",
      params: { slug: community.slug },
    } as any);
  };

  const formatJoinedDate = (value?: string) => {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return "-";
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
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: COLORS.background }}
      >
        <View className="flex-1 bg-background px-5 pt-6">
          <Pressable
            onPress={() => router.back()}
            className="mb-5 h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface"
          >
            <Ionicons
              name="arrow-back-outline"
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
        </View>
      </SafeAreaView>
    );
  }

  if (!isOwner) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: COLORS.background }}
      >
        <View className="flex-1 bg-background px-5 pt-6">
          <Pressable
            onPress={() => router.back()}
            className="mb-5 h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface"
          >
            <Ionicons
              name="arrow-back-outline"
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
            Owner access only
          </Text>

          <Text
            className="mt-2 text-muted"
            style={{
              fontSize: 14,
              lineHeight: 22,
              fontFamily: "Poppins_400Regular",
            }}
          >
            This dashboard is only for the community owner.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-3">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface"
            >
              <Ionicons
                name="arrow-back-outline"
                size={20}
                color={COLORS.primary}
              />
            </Pressable>

            <Pressable
              onPress={handleViewCommunity}
              className="h-[42px] w-[42px] items-center justify-center rounded-full border border-border bg-surface"
            >
              <Ionicons
                name="eye-outline"
                size={20}
                color={COLORS.primary}
              />
            </Pressable>
          </View>

          {/* Header section uses avatar only, no cover image */}
          <View className="mt-5 rounded-[30px] border border-border bg-surface px-5 py-5">
            <View className="flex-row items-center gap-4">
              <View className="h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border border-border bg-segment">
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons
                    name="people-outline"
                    size={30}
                    color={COLORS.primary}
                  />
                )}
              </View>

              <View className="flex-1">
                <Text
                  className="text-foreground"
                  style={{
                    fontSize: 24,
                    lineHeight: 30,
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
                  {community.category?.name ?? "Unknown"} • {community.visibility}
                </Text>

                {!!community.description ? (
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
                ) : null}
              </View>
            </View>
          </View>

          {/* Scrollable KPI cards */}
          <View className="mt-5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 12 }}
            >
              {kpiCards.map((item) => (
                <View
                  key={item.key}
                  className="w-[158px] rounded-[24px] border border-border bg-surface px-4 py-4"
                >
                  <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#DCFCE7]">
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>

                  <Text
                    className="mt-5 text-muted"
                    style={{
                      fontSize: 12,
                      fontFamily: "Poppins_500Medium",
                    }}
                  >
                    {item.label}
                  </Text>

                  <Text
                    className="mt-1 text-foreground"
                    style={{
                      fontSize: 28,
                      lineHeight: 34,
                      fontFamily: "Poppins_700Bold",
                    }}
                  >
                    {item.value}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View className="mt-6 rounded-[28px] border border-border bg-surface px-4 py-4">
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
                  {dashboardTabs.map((item) => (
                    <Tabs.Trigger key={item.key} value={item.key}>
                      <Tabs.Label>{item.label}</Tabs.Label>
                    </Tabs.Trigger>
                  ))}
                </Tabs.ScrollView>
              </Tabs.List>

              <View className="pt-5">
                <Tabs.Content value="overview">
                  <View className="gap-4">
                    <SectionCard title="Community Snapshot">
                      {/* Area chart replaces bar/pie analytics */}
                      <LineChart
                        areaChart
                        curved
                        hideDataPoints
                        data={overviewAreaData}
                        thickness={3}
                        color={COLORS.primary}
                        startFillColor="rgba(34,197,94,0.24)"
                        endFillColor="rgba(34,197,94,0.03)"
                        startOpacity={0.9}
                        endOpacity={0.1}
                        hideRules
                        yAxisThickness={0}
                        xAxisThickness={0}
                        noOfSections={4}
                        yAxisTextStyle={{
                          color: COLORS.muted,
                          fontSize: 11,
                        }}
                        xAxisLabelTextStyle={{
                          color: COLORS.muted,
                          fontSize: 11,
                        }}
                        initialSpacing={10}
                        endSpacing={10}
                      />
                    </SectionCard>
                  </View>
                </Tabs.Content>

                {isPrivateCommunity ? (
                  <Tabs.Content value="requests">
                    <SectionCard title="Pending Requests">
                      {joinRequestsLoading ? (
                        <View className="py-8">
                          <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                      ) : joinRequestsError ? (
                        <ErrorText text="Failed to load join requests" />
                      ) : joinRequests.length === 0 ? (
                        <EmptyText text="No pending join requests right now." />
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <DataTable>
                            <DataTable.Header>
                              <DataTable.Title>Name</DataTable.Title>
                              <DataTable.Title>Business</DataTable.Title>
                              <DataTable.Title>Action</DataTable.Title>
                            </DataTable.Header>

                            {requestRows.map((request) => (
                              <DataTable.Row key={request.id}>
                                <DataTable.Cell>{request.user.name}</DataTable.Cell>
                                <DataTable.Cell>
                                  {request.user.businessName || "-"}
                                </DataTable.Cell>
                                <DataTable.Cell>
                                  <View className="flex-row gap-2">
                                    <Pressable
                                      onPress={() =>
                                        handleReviewRequest(request.id, "APPROVE")
                                      }
                                      disabled={reviewingRequest}
                                      className="rounded-full bg-accent px-3 py-1.5"
                                    >
                                      <Text
                                        style={{
                                          color: "#fff",
                                          fontSize: 11,
                                          fontFamily: "Poppins_600SemiBold",
                                        }}
                                      >
                                        Approve
                                      </Text>
                                    </Pressable>

                                    <Pressable
                                      onPress={() =>
                                        handleReviewRequest(request.id, "REJECT")
                                      }
                                      disabled={reviewingRequest}
                                      className="rounded-full border border-border bg-background px-3 py-1.5"
                                    >
                                      <Text
                                        style={{
                                          color: COLORS.text,
                                          fontSize: 11,
                                          fontFamily: "Poppins_600SemiBold",
                                        }}
                                      >
                                        Reject
                                      </Text>
                                    </Pressable>
                                  </View>
                                </DataTable.Cell>
                              </DataTable.Row>
                            ))}

                            <DataTable.Pagination
                              page={requestPage}
                              numberOfPages={Math.max(
                                1,
                                Math.ceil(joinRequests.length / requestPageSize),
                              )}
                              onPageChange={setRequestPage}
                              label={`${Math.min(
                                requestPage * requestPageSize + 1,
                                joinRequests.length,
                              )}-${Math.min(
                                (requestPage + 1) * requestPageSize,
                                joinRequests.length,
                              )} of ${joinRequests.length}`}
                              showFastPaginationControls
                            />
                          </DataTable>
                        </ScrollView>
                      )}
                    </SectionCard>
                  </Tabs.Content>
                ) : null}

                <Tabs.Content value="members">
                  <View className="gap-4">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="text-foreground"
                        style={{
                          fontSize: 18,
                          fontFamily: "Poppins_700Bold",
                        }}
                      >
                        Members
                      </Text>

                      {/* Placeholder button for now as requested */}
                      <Pressable className="rounded-full bg-accent px-4 py-2">
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontFamily: "Poppins_600SemiBold",
                          }}
                        >
                          Add Moderator
                        </Text>
                      </Pressable>
                    </View>

                    <SectionCard title="Members Table">
                      {membersLoading ? (
                        <View className="py-8">
                          <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                      ) : membersError ? (
                        <ErrorText text="Failed to load members" />
                      ) : members.length === 0 ? (
                        <EmptyText text="No active members found." />
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <DataTable>
                            <DataTable.Header>
                              <DataTable.Title>Name</DataTable.Title>
                              <DataTable.Title>Role</DataTable.Title>
                              <DataTable.Title>Posts</DataTable.Title>
                              <DataTable.Title>Joined</DataTable.Title>
                              <DataTable.Title>Action</DataTable.Title>
                            </DataTable.Header>

                            {memberRows.map((member) => (
                              <DataTable.Row key={member.id}>
                                <DataTable.Cell>{member.user.name}</DataTable.Cell>
                                <DataTable.Cell>{member.role}</DataTable.Cell>
                                <DataTable.Cell>-</DataTable.Cell>
                                <DataTable.Cell>
                                  {formatJoinedDate(member.joinedAt)}
                                </DataTable.Cell>
                                <DataTable.Cell>
                                  {member.user.id === session.user.id ? (
                                    <Text
                                      style={{
                                        color: COLORS.muted,
                                        fontSize: 11,
                                        fontFamily: "Poppins_500Medium",
                                      }}
                                    >
                                      You
                                    </Text>
                                  ) : (
                                    <Menu>
                                      <Menu.Trigger asChild>
                                        <Pressable className="h-[34px] w-[34px] items-center justify-center rounded-full border border-border bg-background">
                                          <Ionicons
                                            name="ellipsis-horizontal"
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
                                          width={180}
                                          className="rounded-2xl border border-border bg-surface"
                                        >
                                          <Menu.Item onPress={handleViewCommunity}>
                                            <Menu.ItemTitle>View</Menu.ItemTitle>
                                          </Menu.Item>

                                          <Menu.Item
                                            onPress={() => handleBanMember(member.user.id)}
                                            isDisabled={
                                              banningMember || member.role === "ADMIN"
                                            }
                                          >
                                            <Menu.ItemTitle>Ban</Menu.ItemTitle>
                                          </Menu.Item>

                                          <Menu.Item isDisabled>
                                            <Menu.ItemTitle>Delete</Menu.ItemTitle>
                                          </Menu.Item>
                                        </Menu.Content>
                                      </Menu.Portal>
                                    </Menu>
                                  )}
                                </DataTable.Cell>
                              </DataTable.Row>
                            ))}

                            <DataTable.Pagination
                              page={memberPage}
                              numberOfPages={Math.max(
                                1,
                                Math.ceil(members.length / memberPageSize),
                              )}
                              onPageChange={setMemberPage}
                              label={`${Math.min(
                                memberPage * memberPageSize + 1,
                                members.length,
                              )}-${Math.min(
                                (memberPage + 1) * memberPageSize,
                                members.length,
                              )} of ${members.length}`}
                              showFastPaginationControls
                            />
                          </DataTable>
                        </ScrollView>
                      )}
                    </SectionCard>
                  </View>
                </Tabs.Content>

                <Tabs.Content value="settings">
                  <View className="gap-4">
                    <SectionCard title="Community Info">
                      <InfoTile
                        icon="grid-outline"
                        label="Category"
                        value={community.category?.name ?? "-"}
                      />
                      <InfoTile
                        icon="globe-outline"
                        label="Visibility"
                        value={community.visibility}
                      />
                      <InfoTile
                        icon="document-text-outline"
                        label="Description"
                        value={community.description || "-"}
                      />
                    </SectionCard>

                    <SectionCard title="Admin Notes">
                      <Text
                        className="text-muted"
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                          fontFamily: "Poppins_400Regular",
                        }}
                      >
                        This version is now more dashboard-focused. It removes the
                        repeated profile layout, hides requests for public
                        communities, uses an area chart, and gives members a cleaner
                        action menu for future moderation tools.
                      </Text>
                    </SectionCard>
                  </View>
                </Tabs.Content>
              </View>
            </Tabs>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="rounded-[24px] border border-border bg-surface px-4 py-4">
      <Text
        className="mb-4 text-foreground"
        style={{
          fontSize: 18,
          fontFamily: "Poppins_700Bold",
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <Text
      className="text-muted"
      style={{
        fontSize: 14,
        lineHeight: 22,
        fontFamily: "Poppins_400Regular",
      }}
    >
      {text}
    </Text>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: COLORS.danger,
        fontSize: 14,
        fontFamily: "Poppins_500Medium",
      }}
    >
      {text}
    </Text>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="mb-3 flex-row items-start rounded-[18px] bg-background px-4 py-3">
      <View className="mr-3 h-[38px] w-[38px] items-center justify-center rounded-full bg-[#DCFCE7]">
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