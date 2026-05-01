// app/user/community-dashboard/moderator-activity.tsx

import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "heroui-native";
import { Modal, Portal } from "react-native-paper";

import AdminKpiCard from "@/components/common/Kpi-card";
import DataTable, {
  useDataTableState,
} from "@/components/common/data-table";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  communityModeratorsMock,
  type CommunityDashboardModerator,
} from "@/mocks/moderator";
import {
  moderatorActivitiesMock,
  type ModeratorActivity,
} from "@/mocks/moderator-activity";
import {
  createModeratorActivityColumns,
  createModeratorActivityFilters,
  type ModeratorActivityAction,
} from "@/components/column/user-community/moderator-activity.columns";
import { getModeratorInitials } from "@/components/column/user-community/moderator.columns";

export default function ModeratorActivityScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { moderatorId } = useLocalSearchParams<{ moderatorId?: string }>();

  const [selectedActivity, setSelectedActivity] =
    useState<ModeratorActivity | null>(null);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const moderator: CommunityDashboardModerator = useMemo(() => {
    return (
      communityModeratorsMock.find((item) => item.id === moderatorId) ??
      communityModeratorsMock[0]
    );
  }, [moderatorId]);

  const activities = useMemo(() => {
    return moderatorActivitiesMock.filter(
      (activity) => activity.moderatorId === moderator.id,
    );
  }, [moderator.id]);

  const totalActions = activities.length;

  const reportsHandled = activities.filter(
    (activity) => activity.type === "REPORT",
  ).length;

  const requestsReviewed = activities.filter(
    (activity) => activity.type === "REQUEST",
  ).length;

  const bans = activities.filter(
    (activity) =>
      activity.type === "MEMBER" &&
      activity.title.toLowerCase().includes("banned"),
  ).length;

  const openActionSheet = (activity: ModeratorActivity) => {
    setSelectedActivity(activity);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedActivity(null);
  };

  const handleActivityAction = (action: ModeratorActivityAction) => {
    if (!selectedActivity) return;

    const actionLabel: Record<ModeratorActivityAction, string> = {
      view: "View details",
      openTarget: "Open target",
      undo: "Undo action",
    };

    const activityTitle = selectedActivity.title;

    closeActionSheet();

    Alert.alert(actionLabel[action], `${actionLabel[action]}: ${activityTitle}`);
  };

  const columns = useMemo(
    () =>
      createModeratorActivityColumns({
        colors,
        onActionPress: openActionSheet,
      }),
    [colors],
  );

  const filters = useMemo(() => createModeratorActivityFilters(), []);

  const table = useDataTableState({
    data: activities,
    columns,
    filters,
    initialSort: {
      key: "createdAt",
      direction: "desc",
    },
    initialPageSize: 5,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <>
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.foreground}
              />
            </Pressable>

            <View style={styles.titleWrap}>
              <Text style={styles.pageTitle}>Moderator Activity</Text>
              <Text style={styles.pageSubtitle}>
                Audit log and action history
              </Text>
            </View>
          </View>

          <View style={styles.moderatorCard}>
            <Avatar alt="" size="lg" variant="soft" color="success">
              <Avatar.Image source={{ uri: moderator.avatar }} />
              <Avatar.Fallback>
                {getModeratorInitials(moderator.name)}
              </Avatar.Fallback>
            </Avatar>

            <View style={styles.moderatorTextWrap}>
              <Text numberOfLines={1} style={styles.moderatorName}>
                {moderator.name}
              </Text>

              <Text style={styles.moderatorMeta}>
                {moderator.status === "ACTIVE" ? "Active" : "Suspended"}{" "}
                Moderator
              </Text>

              <Text style={styles.moderatorMeta}>
                Assigned:{" "}
                {new Date(moderator.assignedAt).toLocaleDateString("en-GB")}
              </Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <AdminKpiCard
              title="Total Actions"
              value={totalActions}
              icon="flash-outline"
            />

            <AdminKpiCard
              title="Reports"
              value={reportsHandled}
              icon="flag-outline"
            />

            <AdminKpiCard
              title="Requests"
              value={requestsReviewed}
              icon="person-add-outline"
            />

            <AdminKpiCard title="Bans" value={bans} icon="ban-outline" />
          </View>

          <DataTable
            rows={table.rows}
            columns={columns}
            rowKey={(row) => row.id}
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search activity"
            filters={filters}
            activeFilters={table.activeFilters}
            onFilterChange={table.handleFilterChange}
            sortBy={table.sortBy}
            sortDirection={table.sortDirection}
            onSortChange={table.handleSortChange}
            emptyTitle="No activity found"
            emptySubtitle="This moderator has no recorded activity yet."
            pagination={{
              page: table.page,
              pageSize: table.pageSize,
              totalItems: table.filteredCount,
              totalPages: table.totalPages,
              onPageChange: table.setPage,
              onPageSizeChange: table.setPageSize,
              pageSizeOptions: [5, 10, 20],
            }}
          />
        </ScrollView>

        <Portal>
          <Modal
            visible={actionSheetVisible}
            onDismiss={closeActionSheet}
            contentContainerStyle={styles.modalContainer}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleWrap}>
                <Text numberOfLines={1} style={styles.sheetTitle}>
                  {selectedActivity?.title ?? "Activity"}
                </Text>

                <Text numberOfLines={1} style={styles.sheetSubtitle}>
                  {selectedActivity?.targetName ?? "Activity details"}
                </Text>
              </View>

              <Pressable
                onPress={closeActionSheet}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="close" size={21} color={colors.foreground} />
              </Pressable>
            </View>

            {selectedActivity ? (
              <View style={styles.detailBox}>
                <DetailLine label="Type" value={selectedActivity.type} />
                <DetailLine label="Reason" value={selectedActivity.reason} />
                <DetailLine
                  label="Date"
                  value={new Date(selectedActivity.createdAt).toLocaleString(
                    "en-GB",
                  )}
                />
                <DetailLine label="Status" value={selectedActivity.status} />
              </View>
            ) : null}

            <View style={styles.actionGrid}>
              <GridAction
                icon="eye-outline"
                label="View details"
                onPress={() => handleActivityAction("view")}
              />

              <GridAction
                icon="open-outline"
                label="Open target"
                onPress={() => handleActivityAction("openTarget")}
              />

              {selectedActivity?.status === "COMPLETED" ? (
                <GridAction
                  icon="return-down-back-outline"
                  label="Undo"
                  danger
                  onPress={() => handleActivityAction("undo")}
                />
              ) : null}
            </View>
          </Modal>
        </Portal>
      </>
    </SafeAreaView>
  );

  function DetailLine({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.detailLine}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.detailValue}>
          {value}
        </Text>
      </View>
    );
  }

  function GridAction({
    icon,
    label,
    danger,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    danger?: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.gridAction,
          pressed && { opacity: 0.65 },
        ]}
      >
        <Ionicons
          name={icon}
          size={23}
          color={danger ? colors.danger : colors.accent}
        />

        <Text
          numberOfLines={1}
          style={[
            styles.gridLabel,
            {
              color: danger ? colors.danger : colors.foreground,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 150,
      gap: 14,
    },

    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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

    titleWrap: {
      flex: 1,
    },

    pageTitle: {
      fontSize: 22,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    pageSubtitle: {
      marginTop: 2,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    moderatorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    moderatorTextWrap: {
      flex: 1,
    },

    moderatorName: {
      fontSize: 17,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    moderatorMeta: {
      marginTop: 2,
      fontSize: 12,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    kpiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },

    modalContainer: {
      marginHorizontal: 0,
      marginBottom: 0,
      marginTop: "auto",
      backgroundColor: colors.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: 10,
      paddingBottom: 28,
      borderTopWidth: 1,
      borderColor: colors.border,
    },

    sheetHandle: {
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 12,
    },

    sheetHeader: {
      paddingHorizontal: 18,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    sheetTitleWrap: {
      flex: 1,
    },

    sheetTitle: {
      fontSize: 18,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    sheetSubtitle: {
      marginTop: 2,
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    detailBox: {
      margin: 18,
      padding: 14,
      borderRadius: 20,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },

    detailLine: {
      gap: 2,
    },

    detailLabel: {
      fontSize: 12,
      fontFamily: "Poppins_700Bold",
      color: colors.muted,
    },

    detailValue: {
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
      color: colors.foreground,
    },

    actionGrid: {
      paddingHorizontal: 22,
      paddingTop: 4,
      paddingBottom: 8,
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 24,
      columnGap: 12,
    },

    gridAction: {
      width: "30%",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingVertical: 4,
    },

    gridLabel: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_600SemiBold",
      textAlign: "center",
    },
  });
}