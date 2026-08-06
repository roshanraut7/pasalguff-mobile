import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import {
  Tabs,
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useGetCommunityAccessQuery,
  useGetCommunityDetailsByIdQuery,
} from "@/store/api/communityApi";

import {
  useGetMyNotificationsQuery,
} from "@/store/api/notificationApi";

import {
  useGetContributorRequestsQuery,
} from "@/store/api/postApi";

type CommunityPurpose =
  | "GENERAL"
  | "BUSINESS"
  | "DISTRICT_OFFICIAL";

type BusinessCommunityKind =
  | "BUSINESS"
  | "INSTITUTE";

type CommunityTypeMetadata = {
  purpose?: CommunityPurpose;
  communityKind?: BusinessCommunityKind | null;
  isBusinessCommunity?: boolean;
  isInstituteCommunity?: boolean;
};

const TAB_BAR_HEIGHT = 64;

function getParamValue(
  value: string | string[] | undefined,
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getInitialLetter(
  name?: string | null,
) {
  const safeName = name?.trim();

  if (!safeName) {
    return "C";
  }

  return safeName
    .charAt(0)
    .toUpperCase();
}

function NotificationTabIcon({
  focused,
  colors,
  count,
}: {
  focused: boolean;
  colors: ReturnType<
    typeof useAppTheme
  >["colors"];
  count: number;
}) {
  const displayCount =
    count > 99
      ? "99+"
      : String(count);

  return (
    <View
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Ionicons
        name={
          focused
            ? "notifications"
            : "notifications-outline"
        }
        size={23}
        color={
          focused
            ? colors.accent
            : colors.muted
        }
      />

      {count > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              colors.danger,
            borderWidth: 2,
            borderColor:
              colors.surface,
          }}
        >
          <Text
            style={{
              color:
                colors.dangerForeground ??
                "#ffffff",

              fontSize: 9,

              fontFamily:
                "Poppins_700Bold",
            }}
          >
            {displayCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function RequestsTabIcon({
  focused,
  colors,
  count,
}: {
  focused: boolean;
  colors: ReturnType<
    typeof useAppTheme
  >["colors"];
  count: number;
}) {
  const displayCount =
    count > 99
      ? "99+"
      : String(count);

  return (
    <View
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Ionicons
        name={
          focused
            ? "person-add"
            : "person-add-outline"
        }
        size={23}
        color={
          focused
            ? colors.accent
            : colors.muted
        }
      />

      {count > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              colors.danger,
            borderWidth: 2,
            borderColor:
              colors.surface,
          }}
        >
          <Text
            style={{
              color:
                colors.dangerForeground ??
                "#ffffff",

              fontSize: 9,

              fontFamily:
                "Poppins_700Bold",
            }}
          >
            {displayCount}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CommunityDashboardTabsLayout() {
  const {
    colors,
    isDark,
  } = useAppTheme();

  const insets =
    useSafeAreaInsets();

  const [
    isSettingsOpen,
    setIsSettingsOpen,
  ] = useState(false);

  const params =
    useLocalSearchParams<{
      communityId?:
        | string
        | string[];

      id?:
        | string
        | string[];

      communityName?:
        | string
        | string[];

      communityAvatar?:
        | string
        | string[];

      communityVisibility?:
        | string
        | string[];
    }>();

  const communityId =
    getParamValue(
      params.communityId,
    ) ||
    getParamValue(
      params.id,
    );

  const paramCommunityName =
    getParamValue(
      params.communityName,
    );

  const paramCommunityAvatar =
    getParamValue(
      params.communityAvatar,
    );

  const paramCommunityVisibility =
    getParamValue(
      params.communityVisibility,
    );

  const {
    data: community,
    isLoading:
      isCommunityLoading,
  } =
    useGetCommunityDetailsByIdQuery(
      communityId,
      {
        skip:
          !communityId,

        refetchOnMountOrArgChange:
          true,
      },
    );

  const {
    data: communityAccess,
  } =
    useGetCommunityAccessQuery(
      communityId,
      {
        skip:
          !communityId,

        refetchOnMountOrArgChange:
          true,
      },
    );

  /*
   * This cast can be removed after communityApi.ts
   * officially includes these response properties.
   */
  const typedCommunity =
    community as
      | (
          typeof community &
          CommunityTypeMetadata
        )
      | undefined;

  const resolvedVisibility =
    String(
      typedCommunity?.visibility ??
        paramCommunityVisibility ??
        "PUBLIC",
    ).toUpperCase();

  const isPublicCommunity =
    resolvedVisibility ===
    "PUBLIC";

  const isPrivateCommunity =
    resolvedVisibility ===
    "PRIVATE";

  const isRestrictedCommunity =
    resolvedVisibility ===
    "RESTRICTED";

  /*
   * Public:
   * Members, Moderators, Dashboard,
   * Posts, Notifications.
   *
   * Private/Restricted:
   * Members, Requests, Dashboard,
   * Posts, Notifications.
   */
  const shouldShowRequestsTab =
    isPrivateCommunity ||
    isRestrictedCommunity;

  const shouldShowModeratorTab =
    isPublicCommunity;

  /**
   * Resolve one reliable catalogue kind.
   *
   * Some community-detail responses currently include purpose="BUSINESS"
   * and the helper flags, but may omit communityKind. Previously the
   * settings button still appeared, while navigation sent an empty
   * communityKind to /community-catalog.
   */
  const resolvedCommunityKind:
    BusinessCommunityKind | null =
    typedCommunity?.communityKind ===
    "INSTITUTE"
      ? "INSTITUTE"
      : typedCommunity
            ?.communityKind ===
          "BUSINESS"
        ? "BUSINESS"
        : typedCommunity
              ?.isInstituteCommunity ===
            true
          ? "INSTITUTE"
          : typedCommunity
                ?.isBusinessCommunity ===
              true ||
              typedCommunity?.purpose ===
                "BUSINESS"
            ? "BUSINESS"
            : null;

  const isInstituteCommunity =
    resolvedCommunityKind ===
    "INSTITUTE";

  const isBusinessCommunity =
    resolvedCommunityKind ===
    "BUSINESS";

  const canManageCatalog =
    resolvedCommunityKind !== null;

  const canEditCommunity =
    communityAccess
      ?.permissions
      ?.canEditCommunity ===
    true;

  const canOpenSettings =
    canManageCatalog ||
    canEditCommunity;

  const {
    data:
      notificationCountResponse,
  } =
    useGetMyNotificationsQuery(
      {
        page: 1,
        limit: 1,
        communityId,
      },
      {
        skip:
          !communityId,

        pollingInterval:
          30000,
      },
    );

  const notificationUnreadCount =
    notificationCountResponse
      ?.meta
      ?.unreadCount ?? 0;

  /*
   * Contributor requests belong to
   * RESTRICTED communities.
   *
   * Private community request count can
   * be connected later using the normal
   * community join-request endpoint.
   */
  const {
    data:
      contributorRequestsResponse,
  } =
    useGetContributorRequestsQuery(
      {
        communityId,
        status:
          "PENDING",

        page:
          1,

        limit:
          1,
      },
      {
        skip:
          !communityId ||
          !isRestrictedCommunity,

        pollingInterval:
          30000,
      },
    );

  const pendingRequestCount =
    isRestrictedCommunity
      ? contributorRequestsResponse
          ?.meta
          ?.total ?? 0
      : 0;

  const communityName =
    typedCommunity?.name ||
    paramCommunityName ||
    "Community Dashboard";

  const avatarUrl =
    toAbsoluteFileUrl(
      typedCommunity
        ?.avatarImage ||
        paramCommunityAvatar,
    ) ?? null;

  const subtitle =
    useMemo(() => {
      const categoryName =
        typedCommunity
          ?.category
          ?.name ??
        "Community";

      const visibilityLabel =
        resolvedVisibility
          .charAt(0) +
        resolvedVisibility
          .slice(1)
          .toLowerCase();

      const typeLabel =
        isInstituteCommunity
          ? "Institute"
          : isBusinessCommunity
            ? "Business"
            : null;

      return [
        categoryName,
        visibilityLabel,
        typeLabel,
      ]
        .filter(Boolean)
        .join(" • ");
    }, [
      typedCommunity
        ?.category
        ?.name,

      resolvedVisibility,
      isBusinessCommunity,
      isInstituteCommunity,
    ]);

  const tabBarBottom =
    Math.max(
      insets.bottom,
      10,
    );

  const tabBarStyle =
    useMemo(
      () => ({
        position:
          "absolute" as const,

        left:
          14,

        right:
          14,

        bottom:
          tabBarBottom,

        height:
          TAB_BAR_HEIGHT,

        backgroundColor:
          colors.surface,

        borderRadius:
          32,

        borderWidth:
          1,

        borderColor:
          colors.border,

        paddingHorizontal:
          8,

        paddingTop:
          5,

        paddingBottom:
          5,

        elevation:
          12,

        shadowColor:
          isDark
            ? "#000000"
            : colors.accent,

        shadowOpacity:
          isDark
            ? 0.25
            : 0.12,

        shadowRadius:
          16,

        shadowOffset: {
          width:
            0,

          height:
            7,
        },
      }),
      [
        colors,
        isDark,
        tabBarBottom,
      ],
    );

  const handleBackPress = () => {
    setIsSettingsOpen(false);

    /**
     * Always leave community management and return to Profile.
     * router.back() is intentionally not used because it can
     * return to the previous Members tab.
     */
    router.replace(
      "/(tabs)/profile" as never,
    );
  };

  const handleOpenCatalog = () => {
    if (
      !communityId ||
      !resolvedCommunityKind
    ) {
      console.log(
        "Cannot open catalogue:",
        {
          communityId,
          purpose:
            typedCommunity?.purpose,
          communityKind:
            typedCommunity
              ?.communityKind,
          isBusinessCommunity:
            typedCommunity
              ?.isBusinessCommunity,
          isInstituteCommunity:
            typedCommunity
              ?.isInstituteCommunity,
        },
      );

      return;
    }

    setIsSettingsOpen(false);

    router.push({
      pathname:
        "/community-catalog",

      params: {
        communityId,
        communityKind:
          resolvedCommunityKind,
        communityName,
      },
    } as never);
  };

  const handleEditCommunity = () => {
    setIsSettingsOpen(false);

    router.push({
      pathname:
        "/pages/editCommunity",

      params: {
        communityId,
      },
    } as never);
  };

  /**
   * Android system back normally follows the tab history.
   * Override it so it also returns directly to Profile.
   */
  useEffect(() => {
    const subscription =
      BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          router.replace(
            "/(tabs)/profile" as never,
          );

          return true;
        },
      );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <Tabs
        initialRouteName="index"
        backBehavior="none"
      screenOptions={{
        headerShown:
          true,

        header: () => (
          <View
            style={{
              backgroundColor:
                colors.background,

              paddingTop:
                Math.max(
                  insets.top,
                  12,
                ),

              paddingHorizontal:
                18,

              paddingBottom:
                16,

              borderBottomWidth:
                1,

              borderBottomColor:
                colors.border,
            }}
          >
            <View
              style={{
                flexDirection:
                  "row",

                alignItems:
                  "center",

                gap:
                  10,
              }}
            >
              <Pressable
                onPress={
                  handleBackPress
                }
                hitSlop={8}
                style={({
                  pressed,
                }) => [
                  {
                    width:
                      42,

                    height:
                      42,

                    borderRadius:
                      21,

                    alignItems:
                      "center",

                    justifyContent:
                      "center",
                  },

                  pressed
                    ? {
                        opacity:
                          0.7,
                      }
                    : null,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={23}
                  color={
                    colors.foreground
                  }
                />
              </Pressable>

              <View
                style={{
                  width:
                    44,

                  height:
                    44,

                  borderRadius:
                    22,

                  overflow:
                    "hidden",

                  backgroundColor:
                    colors.surfaceTertiary,

                  borderWidth:
                    1,

                  borderColor:
                    colors.border,

                  alignItems:
                    "center",

                  justifyContent:
                    "center",
                }}
              >
                {isCommunityLoading &&
                !paramCommunityName ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.accent
                    }
                  />
                ) : avatarUrl ? (
                  <Image
                    source={{
                      uri:
                        avatarUrl,
                    }}
                    style={{
                      width:
                        "100%",

                      height:
                        "100%",
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={{
                      color:
                        colors.accent,

                      fontSize:
                        20,

                      fontFamily:
                        "Poppins_700Bold",
                    }}
                  >
                    {getInitialLetter(
                      communityName,
                    )}
                  </Text>
                )}
              </View>

              <View
                style={{
                  flex:
                    1,

                  minWidth:
                    0,

                  justifyContent:
                    "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color:
                      colors.foreground,

                    fontSize:
                      19,

                    fontFamily:
                      "Poppins_700Bold",
                  }}
                >
                  {communityName}
                </Text>

                <Text
                  numberOfLines={1}
                  style={{
                    marginTop:
                      3,

                    color:
                      colors.muted,

                    fontSize:
                      12,

                    fontFamily:
                      "Poppins_400Regular",
                  }}
                >
                  {subtitle}
                </Text>
              </View>

              {canOpenSettings ? (
                <Pressable
                  onPress={() =>
                    setIsSettingsOpen(true)
                  }
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Open community settings"
                  style={({
                    pressed,
                  }) => [
                    {
                      width:
                        42,

                      height:
                        42,

                      borderRadius:
                        21,

                      borderWidth:
                        1,

                      borderColor:
                        colors.border,

                      backgroundColor:
                        colors.surfaceSecondary,

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      flexShrink:
                        0,
                    },

                    pressed
                      ? {
                          opacity:
                            0.65,
                        }
                      : null,
                  ]}
                >
                  <Ionicons
                    name="settings-outline"
                    size={22}
                    color={
                      colors.foreground
                    }
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        ),

        tabBarShowLabel:
          false,

        tabBarHideOnKeyboard:
          true,

        tabBarStyle,

        tabBarItemStyle: {
          flex:
            1,

          height:
            54,

          alignItems:
            "center",

          justifyContent:
            "center",
        },

        sceneStyle: {
          backgroundColor:
            colors.background,

          paddingBottom:
            TAB_BAR_HEIGHT +
            tabBarBottom +
            10,
        },
      }}
    >
      <Tabs.Screen
        name="member"
        options={{
          title:
            "Members",

          tabBarIcon: ({
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "people"
                  : "people-outline"
              }
              size={23}
              color={
                focused
                  ? colors.accent
                  : colors.muted
              }
            />
          ),
        }}
      />

      {/*
       * Students remains a valid route,
       * but it does not appear in the footer.
       *
       * Institute MemberScreen can open it
       * programmatically.
       */}
      <Tabs.Screen
        name="students"
        options={{
          href:
            null,
        }}
      />

      <Tabs.Screen
        name="moderator"
        options={{
          title:
            "Moderators",

          href:
            shouldShowModeratorTab
              ? undefined
              : null,

          tabBarIcon: ({
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "shield-checkmark"
                  : "shield-checkmark-outline"
              }
              size={23}
              color={
                focused
                  ? colors.accent
                  : colors.muted
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title:
            "Requests",

          href:
            shouldShowRequestsTab
              ? undefined
              : null,

          tabBarIcon: ({
            focused,
          }) => (
            <RequestsTabIcon
              focused={
                focused
              }
              colors={
                colors
              }
              count={
                pendingRequestCount
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title:
            "Dashboard",

          tabBarIcon: ({
            focused,
          }) => (
            <MaterialIcons
              name="dashboard"
              size={23}
              color={
                focused
                  ? colors.accent
                  : colors.muted
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="post"
        options={{
          title:
            "Posts",

          tabBarIcon: ({
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "newspaper"
                  : "newspaper-outline"
              }
              size={23}
              color={
                focused
                  ? colors.accent
                  : colors.muted
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title:
            "Notifications",

          tabBarIcon: ({
            focused,
          }) => (
            <NotificationTabIcon
              focused={
                focused
              }
              colors={
                colors
              }
              count={
                notificationUnreadCount
              }
            />
          ),
        }}
      />
      </Tabs>

      <Modal
        visible={
          isSettingsOpen
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setIsSettingsOpen(false)
        }
      >
        <Pressable
          onPress={() =>
            setIsSettingsOpen(false)
          }
          style={{
            flex:
              1,

            justifyContent:
              "flex-end",

            backgroundColor:
              colors.backdrop ??
              "rgba(0,0,0,0.45)",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor:
                colors.surface,

              borderColor:
                colors.border,

              borderWidth:
                1,

              borderTopLeftRadius:
                28,

              borderTopRightRadius:
                28,

              paddingTop:
                18,

              paddingHorizontal:
                16,

              paddingBottom:
                Math.max(
                  insets.bottom,
                  20,
                ) + 12,
            }}
          >
            <View
              style={{
                flexDirection:
                  "row",

                alignItems:
                  "flex-start",

                gap:
                  12,

                marginBottom:
                  14,
              }}
            >
              <View
                style={{
                  flex:
                    1,

                  minWidth:
                    0,
                }}
              >
                <Text
                  style={{
                    color:
                      colors.foreground,

                    fontSize:
                      18,

                    fontFamily:
                      "Poppins_700Bold",
                  }}
                >
                  Community settings
                </Text>

                <Text
                  style={{
                    marginTop:
                      3,

                    color:
                      colors.muted,

                    fontSize:
                      12,

                    lineHeight:
                      18,

                    fontFamily:
                      "Poppins_400Regular",
                  }}
                >
                  Choose what you want to manage.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setIsSettingsOpen(false)
                }
                hitSlop={12}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={
                    colors.muted
                  }
                />
              </Pressable>
            </View>

            <View
              style={{
                gap:
                  10,
              }}
            >
              {canManageCatalog ? (
                <Pressable
                  onPress={
                    handleOpenCatalog
                  }
                  style={({
                    pressed,
                  }) => ({
                    minHeight:
                      78,

                    borderWidth:
                      1,

                    borderColor:
                      colors.border,

                    borderRadius:
                      18,

                    padding:
                      13,

                    flexDirection:
                      "row",

                    alignItems:
                      "center",

                    gap:
                      12,

                    backgroundColor:
                      pressed
                        ? colors
                            .surfaceSecondary
                        : colors.surface,
                  })}
                >
                  <View
                    style={{
                      width:
                        46,

                      height:
                        46,

                      borderRadius:
                        15,

                      backgroundColor:
                        colors
                          .surfaceSecondary,

                      alignItems:
                        "center",

                      justifyContent:
                        "center",
                    }}
                  >
                    <Ionicons
                      name={
                        isInstituteCommunity
                          ? "school-outline"
                          : "storefront-outline"
                      }
                      size={22}
                      color={
                        colors.accent
                      }
                    />
                  </View>

                  <View
                    style={{
                      flex:
                        1,

                      minWidth:
                        0,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          colors.foreground,

                        fontSize:
                          15,

                        fontFamily:
                          "Poppins_700Bold",
                      }}
                    >
                      Add Catalog
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={{
                        marginTop:
                          3,

                        color:
                          colors.muted,

                        fontSize:
                          11,

                        lineHeight:
                          17,

                        fontFamily:
                          "Poppins_400Regular",
                      }}
                    >
                      {isInstituteCommunity
                        ? "Add and manage the institute course catalog."
                        : "Add and manage the business product catalog."}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={
                      colors.muted
                    }
                  />
                </Pressable>
              ) : null}

              {canEditCommunity ? (
                <Pressable
                  onPress={
                    handleEditCommunity
                  }
                  style={({
                    pressed,
                  }) => ({
                    minHeight:
                      78,

                    borderWidth:
                      1,

                    borderColor:
                      colors.border,

                    borderRadius:
                      18,

                    padding:
                      13,

                    flexDirection:
                      "row",

                    alignItems:
                      "center",

                    gap:
                      12,

                    backgroundColor:
                      pressed
                        ? colors
                            .surfaceSecondary
                        : colors.surface,
                  })}
                >
                  <View
                    style={{
                      width:
                        46,

                      height:
                        46,

                      borderRadius:
                        15,

                      backgroundColor:
                        colors
                          .surfaceSecondary,

                      alignItems:
                        "center",

                      justifyContent:
                        "center",
                    }}
                  >
                    <Ionicons
                      name="create-outline"
                      size={22}
                      color={
                        colors.accent
                      }
                    />
                  </View>

                  <View
                    style={{
                      flex:
                        1,

                      minWidth:
                        0,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          colors.foreground,

                        fontSize:
                          15,

                        fontFamily:
                          "Poppins_700Bold",
                      }}
                    >
                      Edit Community
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={{
                        marginTop:
                          3,

                        color:
                          colors.muted,

                        fontSize:
                          11,

                        lineHeight:
                          17,

                        fontFamily:
                          "Poppins_400Regular",
                      }}
                    >
                      Update images, category, visibility and community details.
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={
                      colors.muted
                    }
                  />
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}