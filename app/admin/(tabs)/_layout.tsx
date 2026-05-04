import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Stack, Tabs, router, type Href } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/useAppTheme";

type AdminRouteName =
  | "community"
  | "post"
  | "index"
  | "user"
  | "notification";

const TAB_CONFIG: Record<
  AdminRouteName,
  {
    href: Href;
    activeIcon: keyof typeof Ionicons.glyphMap;
    inactiveIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  community: {
    href: "/admin/community",
    activeIcon: "people",
    inactiveIcon: "people-outline",
  },
  post: {
    href: "/admin/post",
    activeIcon: "document-text",
    inactiveIcon: "document-text-outline",
  },
  index: {
    href: "/admin",
    activeIcon: "grid",
    inactiveIcon: "grid-outline",
  },
  user: {
    href: "/admin/user",
    activeIcon: "person",
    inactiveIcon: "person-outline",
  },
  notification: {
    href: "/admin/notification",
    activeIcon: "notifications",
    inactiveIcon: "notifications-outline",
  },
};

function SideTabButton({
  focused,
  onPress,
  onLongPress,
  activeIcon,
  inactiveIcon,
  colors,
}: {
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.sideButton}
      hitSlop={10}
    >
      <Ionicons
        name={focused ? activeIcon : inactiveIcon}
        size={22}
        color={focused ? colors.accent : colors.muted}
      />

      <View
        style={[
          styles.activeDash,
          {
            backgroundColor: focused ? colors.accent : "transparent",
            opacity: focused ? 1 : 0,
          },
        ]}
      />
    </Pressable>
  );
}

function CenterTabButton({
  focused,
  onPress,
  onLongPress,
  colors,
  isDark,
}: {
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={12}
      style={[
        styles.centerButtonWrap,
        {
          shadowColor: isDark ? "#000000" : colors.accent,
        },
      ]}
    >
      <View
        style={[
          styles.centerButton,
          {
            backgroundColor: colors.accent,
            borderColor: colors.surface,
          },
        ]}
      >
        <Ionicons
          name={focused ? "grid" : "grid-outline"}
          size={24}
          color={colors.accentForeground}
        />
      </View>
    </Pressable>
  );
}

function AdminCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const handlePress = (routeName: AdminRouteName) => {
    const index = state.routes.findIndex((route) => route.name === routeName);
    if (index === -1) return;

    const route = state.routes[index];
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      router.navigate(TAB_CONFIG[routeName].href);
    }
  };

  const handleLongPress = (routeName: AdminRouteName) => {
    const index = state.routes.findIndex((route) => route.name === routeName);
    if (index === -1) return;

    navigation.emit({
      type: "tabLongPress",
      target: state.routes[index].key,
    });
  };

  const currentRoute = state.routes[state.index]?.name as AdminRouteName;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: Math.max(insets.bottom, 10) + 8,
          
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: isDark ? "#000000" : colors.accent,
          },
        ]}
      >
        <View style={styles.row}>
          <SideTabButton
            focused={currentRoute === "community"}
            onPress={() => handlePress("community")}
            onLongPress={() => handleLongPress("community")}
            activeIcon={TAB_CONFIG.community.activeIcon}
            inactiveIcon={TAB_CONFIG.community.inactiveIcon}
            colors={colors}
          />

          <SideTabButton
            focused={currentRoute === "post"}
            onPress={() => handlePress("post")}
            onLongPress={() => handleLongPress("post")}
            activeIcon={TAB_CONFIG.post.activeIcon}
            inactiveIcon={TAB_CONFIG.post.inactiveIcon}
            colors={colors}
          />

          <View style={styles.centerSpacer} />

          <SideTabButton
            focused={currentRoute === "user"}
            onPress={() => handlePress("user")}
            onLongPress={() => handleLongPress("user")}
            activeIcon={TAB_CONFIG.user.activeIcon}
            inactiveIcon={TAB_CONFIG.user.inactiveIcon}
            colors={colors}
          />

          <SideTabButton
            focused={currentRoute === "notification"}
            onPress={() => handlePress("notification")}
            onLongPress={() => handleLongPress("notification")}
            activeIcon={TAB_CONFIG.notification.activeIcon}
            inactiveIcon={TAB_CONFIG.notification.inactiveIcon}
            colors={colors}
          />
        </View>

        <CenterTabButton
          focused={currentRoute === "index"}
          onPress={() => handlePress("index")}
          onLongPress={() => handleLongPress("index")}
          colors={colors}
          isDark={isDark}
        />
      </View>
    </View>
  );
}

export default function AdminTabsLayout() {
  return (
    
    <Tabs
      tabBar={(props) => <AdminCustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="post" options={{ title: "Post" }} />
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="user" options={{ title: "User" }} />
      <Tabs.Screen name="notification" options={{ title: "Notification" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  bar: {
    height: 78,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: "center",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    overflow: "visible",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    paddingHorizontal: 12,
  },
  sideButton: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSpacer: {
    width: 84,
  },
  activeDash: {
    position: "absolute",
    bottom: 9,
    width: 16,
    height: 3,
    borderRadius: 999,
  },
  centerButtonWrap: {
    position: "absolute",
    top: -18,
    left: "50%",
    marginLeft: -30,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    borderRadius: 30,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
  },
});