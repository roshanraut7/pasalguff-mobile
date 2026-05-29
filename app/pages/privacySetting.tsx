import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Switch } from "heroui-native";
import { useDispatch } from "react-redux";

import { baseApi } from "@/store/api/baseApi";
import { signOut } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

import {
  useGetMyPrivacySettingsQuery,
  useUpdateMyPrivacySettingsMutation,
  type PrivacyAudience,
  type UpdatePrivacySettingsPayload,
} from "@/store/api/profileApi";

type PrivacyFieldKey = keyof UpdatePrivacySettingsPayload;

type PrivacyRowConfig = {
  key: PrivacyFieldKey;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type PrivacyOption = {
  label: string;
  value: PrivacyAudience;
  icon: keyof typeof Ionicons.glyphMap;
};

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    label: "Everyone",
    value: "PUBLIC",
    icon: "earth-outline",
  },
  {
    label: "Communities",
    value: "COMMUNITY",
    icon: "people-outline",
  },
  {
    label: "Followers",
    value: "FOLLOWERS",
    icon: "person-add-outline",
  },
  {
    label: "Only me",
    value: "PRIVATE",
    icon: "lock-closed-outline",
  },
];

const MESSAGE_PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    label: "Everyone",
    value: "PUBLIC",
    icon: "earth-outline",
  },
  {
    label: "Communities",
    value: "COMMUNITY",
    icon: "people-outline",
  },
  {
    label: "Followers",
    value: "FOLLOWERS",
    icon: "person-add-outline",
  },
  {
    label: "No one",
    value: "PRIVATE",
    icon: "lock-closed-outline",
  },
];

const PROFILE_PRIVACY_ROWS: PrivacyRowConfig[] = [
  {
    key: "profileViewAudience",
    title: "Profile",
    icon: "person-circle-outline",
  },
  {
    key: "aboutAudience",
    title: "About",
    icon: "information-circle-outline",
  },
  {
    key: "postsAudience",
    title: "Posts",
    icon: "document-text-outline",
  },
];

const SOCIAL_PRIVACY_ROWS: PrivacyRowConfig[] = [
  {
    key: "communitiesAudience",
    title: "Communities",
    icon: "grid-outline",
  },
  {
    key: "followersAudience",
    title: "Followers",
    icon: "people-outline",
  },
  {
    key: "followingAudience",
    title: "Following",
    icon: "person-add-outline",
  },
];

const COMMUNICATION_ROWS: PrivacyRowConfig[] = [
  {
    key: "messageAudience",
    title: "Messages",
    icon: "chatbubble-ellipses-outline",
  },
];

function getOptionsForField(fieldKey?: PrivacyFieldKey | null) {
  if (fieldKey === "messageAudience") {
    return MESSAGE_PRIVACY_OPTIONS;
  }

  return PRIVACY_OPTIONS;
}

function getPrivacyLabel(
  value?: PrivacyAudience,
  fieldKey?: PrivacyFieldKey | null,
) {
  return (
    getOptionsForField(fieldKey).find((option) => option.value === value)
      ?.label ?? "Not set"
  );
}

export default function PrivacySettingsScreen() {
  const { colors, isDark, setThemeMode } = useAppTheme();
  const dispatch = useDispatch();

  const [selectedField, setSelectedField] =
    useState<PrivacyRowConfig | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    data: privacy,
    isLoading,
    isFetching,
    refetch,
  } = useGetMyPrivacySettingsQuery();

  const [updatePrivacy, { isLoading: isUpdating }] =
    useUpdateMyPrivacySettingsMutation();

  const selectedValue = selectedField ? privacy?.[selectedField.key] : undefined;

  const selectedOptions = getOptionsForField(selectedField?.key);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/profile");
  };

  const handleEditProfile = () => {
    router.push("/pages/editprofile");
  };

  const handleCreateCommunity = () => {
    router.push("/pages/createCommunity");
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);

            await signOut();

            dispatch(baseApi.util.resetApiState());

            router.replace("/(auth)");
          } catch (error) {
            console.log("Logout failed:", error);
            Alert.alert("Failed", "Could not logout. Please try again.");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleSelectPrivacy = async (value: PrivacyAudience) => {
    if (!selectedField) return;

    try {
      await updatePrivacy({
        [selectedField.key]: value,
      }).unwrap();

      setSelectedField(null);

      await refetch();
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.data?.message ?? "Could not update privacy setting.",
      );
    }
  };

  const renderPrivacyRow = (row: PrivacyRowConfig) => {
    const currentValue = privacy?.[row.key];

    return (
      <Pressable
        key={row.key}
        onPress={() => setSelectedField(row)}
        style={({ pressed }) => [
          styles.compactRow,
          {
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={styles.rowLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name={row.icon} size={19} color={colors.accent} />
          </View>

          <Text style={styles.rowTitle}>{row.title}</Text>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.valueText}>
            {getPrivacyLabel(currentValue, row.key)}
          </Text>

          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
      </Pressable>
    );
  };

  const renderSection = (title: string, rows: PrivacyRowConfig[]) => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>

        <View style={styles.card}>
          {rows.map((row, index) => (
            <View key={row.key}>
              {renderPrivacyRow(row)}
              {index < rows.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} />
          </Pressable>

          <Text style={styles.headerTitle}>Settings & Privacy</Text>

          <View style={styles.headerSide} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.profileCard}>
            <View style={styles.profileIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={26} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Privacy Controls</Text>
              <Text style={styles.heroText}>
                Manage your profile, activity, and account settings.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <View style={styles.card}>
              <Pressable
                onPress={handleEditProfile}
                style={({ pressed }) => [
                  styles.compactRow,
                  {
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name="create-outline"
                      size={19}
                      color={colors.accent}
                    />
                  </View>

                  <Text style={styles.rowTitle}>Edit Profile</Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>

              <View style={styles.divider} />

              <Pressable
                onPress={handleCreateCommunity}
                style={({ pressed }) => [
                  styles.compactRow,
                  {
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name="add-circle-outline"
                      size={19}
                      color={colors.accent}
                    />
                  </View>

                  <Text style={styles.rowTitle}>Create Community</Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>

              <View style={styles.divider} />

              <View style={styles.compactRow}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={isDark ? "moon-outline" : "sunny-outline"}
                      size={19}
                      color={colors.accent}
                    />
                  </View>

                  <Text style={styles.rowTitle}>
                    {isDark ? "Dark mode" : "Light mode"}
                  </Text>
                </View>

                <Switch
                  isSelected={isDark}
                  onSelectedChange={(selected) => {
                    setThemeMode(selected ? "dark" : "light");
                  }}
                />
              </View>
            </View>
          </View>

          {renderSection("Profile", PROFILE_PRIVACY_ROWS)}

          {renderSection("Social", SOCIAL_PRIVACY_ROWS)}

          {renderSection("Communication", COMMUNICATION_ROWS)}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session</Text>

            <View style={styles.card}>
              <Pressable
                onPress={handleLogout}
                disabled={isLoggingOut}
                style={({ pressed }) => [
                  styles.compactRow,
                  {
                    opacity: pressed || isLoggingOut ? 0.65 : 1,
                  },
                ]}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: colors.surfaceSecondary,
                      },
                    ]}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={19}
                      color={colors.danger}
                    />
                  </View>

                  <Text style={[styles.rowTitle, { color: colors.danger }]}>
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Text>
                </View>

                {isLoggingOut ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.danger}
                  />
                )}
              </Pressable>
            </View>
          </View>

          {isFetching ? (
            <Text style={styles.syncText}>Syncing latest settings...</Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={!!selectedField}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedField(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedField(null)}
        >
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>{selectedField?.title}</Text>

            <View style={styles.optionList}>
              {selectedOptions.map((option) => {
                const isSelected = option.value === selectedValue;

                return (
                  <Pressable
                    key={option.value}
                    disabled={isUpdating}
                    onPress={() => handleSelectPrivacy(option.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        opacity: pressed || isUpdating ? 0.72 : 1,
                      },
                    ]}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.optionIconWrap,
                          {
                            backgroundColor: isSelected
                              ? colors.accent
                              : colors.surfaceSecondary,
                          },
                        ]}
                      >
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={
                            isSelected
                              ? colors.accentForeground
                              : colors.accent
                          }
                        />
                      </View>

                      <Text style={styles.optionTitle}>{option.label}</Text>
                    </View>

                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.accent}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {isUpdating ? (
              <View style={styles.updatingRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.updatingText}>Updating...</Text>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    header: {
      height: 58,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    headerTitle: {
      flex: 1,
      textAlign: "center",
      color: colors.foreground,
      fontSize: 19,
      lineHeight: 26,
      fontFamily: "Poppins_700Bold",
    },

    headerSide: {
      width: 42,
      height: 42,
    },

    content: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },

    profileCard: {
      marginTop: 8,
      borderRadius: 28,
      padding: 18,
      flexDirection: "row",
      gap: 14,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    profileIconWrap: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    heroTitle: {
      color: colors.foreground,
      fontSize: 17,
      lineHeight: 24,
      fontFamily: "Poppins_700Bold",
    },

    heroText: {
      marginTop: 3,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
    },

    section: {
      marginTop: 24,
    },

    sectionTitle: {
      marginBottom: 9,
      marginLeft: 4,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_700Bold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },

    card: {
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },

    compactRow: {
      minHeight: 62,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    rowLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },

    rowTitle: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_700Bold",
    },

    rowRight: {
      maxWidth: 124,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    valueText: {
      color: colors.accent,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_700Bold",
      textAlign: "right",
    },

    divider: {
      height: 1,
      marginLeft: 64,
      backgroundColor: colors.border,
    },

    syncText: {
      marginTop: 18,
      textAlign: "center",
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
    },

    modalBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.35)",
    },

    modalCard: {
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 28,
      backgroundColor: colors.background,
    },

    modalHandle: {
      alignSelf: "center",
      width: 42,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 16,
    },

    modalTitle: {
      color: colors.foreground,
      fontSize: 18,
      lineHeight: 25,
      fontFamily: "Poppins_700Bold",
      textAlign: "center",
    },

    optionList: {
      marginTop: 18,
      gap: 10,
    },

    optionRow: {
      minHeight: 58,
      borderRadius: 20,
      padding: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    optionLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    optionIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },

    optionTitle: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_700Bold",
    },

    updatingRow: {
      marginTop: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
    },

    updatingText: {
      color: colors.muted,
      fontSize: 12,
      fontFamily: "Poppins_500Medium",
    },
  });
}