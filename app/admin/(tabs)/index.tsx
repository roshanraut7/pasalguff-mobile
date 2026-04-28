import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-gifted-charts";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import AdminKpiCard from "@/components/common/Kpi-card";
import { signOut } from "@/api/better-auth-client";

import {
  adminKpiData,
  communityGrowthData,
  userGrowthData,
} from "@/mocks/admin-dashboard-data";

export default function AdminDashboardScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const chartWidth = Math.max(width - 72, 220);

  const maxValue = Math.max(
    ...communityGrowthData.map((item) => item.value),
    ...userGrowthData.map((item) => item.value),
  );

  async function handleLogout() {
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

            router.replace("/(auth)");
          } catch (error) {
            Alert.alert(
              "Logout failed",
              error instanceof Error
                ? error.message
                : "Something went wrong while logging out.",
            );
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>
              Community and user growth overview
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={styles.logoutButton}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={22}
                color={colors.danger}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {adminKpiData.map((item) => (
            <AdminKpiCard
              key={item.id}
              title={item.title}
              value={item.value}
              icon={item.icon}
            />
          ))}
        </View>

        <Text style={styles.chartTitle}>Community & User Growth</Text>

        <LineChart
          areaChart
          curved
          data={communityGrowthData}
          data2={userGrowthData}
          width={chartWidth}
          height={240}
          maxValue={maxValue + 20}
          noOfSections={5}
          spacing={40}
          initialSpacing={10}
          thickness={3}
          thickness2={3}
          color={colors.accent}
          color2={colors.foreground}
          startFillColor={colors.accent}
          endFillColor={colors.accent}
          startOpacity={0.18}
          endOpacity={0.03}
          startFillColor2={colors.foreground}
          endFillColor2={colors.foreground}
          startOpacity2={0.08}
          endOpacity2={0.01}
          dataPointsColor={colors.accent}
          dataPointsColor2={colors.foreground}
          hideRules={false}
          rulesColor={colors.border}
          xAxisColor={colors.border}
          yAxisColor={colors.border}
          yAxisTextStyle={{
            color: colors.muted,
            fontSize: 11,
            fontFamily: "Poppins_400Regular",
          }}
          xAxisLabelTextStyle={{
            color: colors.muted,
            fontSize: 11,
            fontFamily: "Poppins_400Regular",
          }}
        />

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.accent }]}
            />
            <Text style={styles.legendText}>Community</Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.foreground }]}
            />
            <Text style={styles.legendText}>Users</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 120,
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 14,
      marginBottom: 18,
    },

    headerText: {
      flex: 1,
    },

    title: {
      fontSize: 30,
      lineHeight: 38,
      fontFamily: "Poppins_700Bold",
      color: colors.foreground,
    },

    subtitle: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: "Poppins_400Regular",
      color: colors.muted,
    },

    logoutButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
      marginBottom: 22,
    },

    chartTitle: {
      marginBottom: 16,
      fontSize: 18,
      fontFamily: "Poppins_600SemiBold",
      color: colors.foreground,
    },

    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      marginTop: 14,
    },

    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },

    legendText: {
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
      color: colors.muted,
    },
  });
}