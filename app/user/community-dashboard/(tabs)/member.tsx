// app/user/community-dashboard/(tabs)/member.tsx

import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "heroui-native";
import { Modal, Portal } from "react-native-paper";

import DataTable, {
  useDataTableState,
} from "@/components/common/data-table";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  communityMembersMock,
  type CommunityDashboardMember,
} from "@/mocks/member";
import {
  createMemberColumns,
  createMemberFilters,
  getMemberInitials,
  type MemberAction,
} from "@/components/column/user-community/member.columns";

export default function MemberScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedMember, setSelectedMember] =
    useState<CommunityDashboardMember | null>(null);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const openActionSheet = (member: CommunityDashboardMember) => {
    setSelectedMember(member);
    setActionSheetVisible(true);
  };

  const closeActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedMember(null);
  };

  const handleMemberAction = (action: MemberAction) => {
    if (!selectedMember) return;

    const actionLabel: Record<MemberAction, string> = {
      view: "View profile",
      message: "Message",
      approve: "Approve request",
      reject: "Reject request",
      ban: "Ban member",
      unban: "Unban member",
      remove: "Remove member",
    };

    const memberName = selectedMember.name;

    closeActionSheet();

    Alert.alert(actionLabel[action], `${actionLabel[action]}: ${memberName}`);
  };

  const columns = useMemo(
    () =>
      createMemberColumns({
        colors,
        onActionPress: openActionSheet,
      }),
    [colors],
  );

  const filters = useMemo(() => createMemberFilters(), []);

  const table = useDataTableState({
    data: communityMembersMock,
    columns,
    filters,
    initialSort: {
      key: "joinedAt",
      direction: "desc",
    },
    initialPageSize: 10,
  });

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DataTable
          rows={table.rows}
          columns={columns}
          rowKey={(row) => row.id}
          searchValue={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search members"
          filters={filters}
          activeFilters={table.activeFilters}
          onFilterChange={table.handleFilterChange}
          sortBy={table.sortBy}
          sortDirection={table.sortDirection}
          onSortChange={table.handleSortChange}
          emptyTitle="No members found"
          emptySubtitle="Try searching another member or changing the status filter."
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
            <View style={styles.memberInfo}>
              {selectedMember ? (
                <Avatar alt="" size="lg" variant="soft" color="success">
                  <Avatar.Image source={{ uri: selectedMember.avatar }} />
                  <Avatar.Fallback>
                    {getMemberInitials(selectedMember.name)}
                  </Avatar.Fallback>
                </Avatar>
              ) : null}

              <View style={styles.memberTextWrap}>
                <Text numberOfLines={1} style={styles.sheetTitle}>
                  {selectedMember?.name ?? "Member"}
                </Text>

                <Text numberOfLines={1} style={styles.sheetSubtitle}>
                  Choose what you want to do
                </Text>
              </View>
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

          <View style={styles.actionGrid}>
            <GridAction
              icon="person-outline"
              label="View profile"
              onPress={() => handleMemberAction("view")}
            />

            <GridAction
              icon="chatbubble-outline"
              label="Message"
              onPress={() => handleMemberAction("message")}
            />

            {selectedMember?.status === "PENDING" ? (
              <>
                <GridAction
                  icon="checkmark-circle-outline"
                  label="Approve"
                  onPress={() => handleMemberAction("approve")}
                />

                <GridAction
                  icon="close-circle-outline"
                  label="Reject"
                  danger
                  onPress={() => handleMemberAction("reject")}
                />
              </>
            ) : null}

            {selectedMember?.status === "ACTIVE" ? (
              <GridAction
                icon="ban-outline"
                label="Ban"
                danger
                onPress={() => handleMemberAction("ban")}
              />
            ) : null}

            {selectedMember?.status === "BANNED" ? (
              <GridAction
                icon="refresh-outline"
                label="Unban"
                onPress={() => handleMemberAction("unban")}
              />
            ) : null}

            <GridAction
              icon="trash-outline"
              label="Remove"
              danger
              onPress={() => handleMemberAction("remove")}
            />
          </View>
        </Modal>
      </Portal>
    </>
  );

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
    root: {
      flex: 1,
      backgroundColor: colors.surface,
    },

    scrollContent: {
      flexGrow: 1,

      // no padding from left, right or top
      // only bottom padding so pagination is visible above floating tab bar
      paddingBottom: 155,
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

    memberInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    memberTextWrap: {
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

    actionGrid: {
      paddingHorizontal: 22,
      paddingTop: 22,
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