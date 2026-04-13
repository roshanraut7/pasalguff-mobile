import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Menu, Tabs } from "heroui-native";

import { COLORS } from "@/constants/colors";
import { signOut, useSession } from "@/api/better-auth-client";
import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";

export default function ProfileScreen() {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [tab, setTab] = useState("posts");

    const { data: session, isPending } = useSession();

    const user = session?.user as
        | {
            id: string;
            name?: string;
            email?: string;
            image?: string | null;
            firstName?: string;
            lastName?: string;
            businessName?: string;
            businessType?: string;
            address?: string;
        }
        | undefined;

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

    if (isPending) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!session?.user) {
        return <Redirect href="/(auth)" />;
    }
    const {
        data: myCommunities = [],
        isLoading: myCommunitiesLoading,
        error: myCommunitiesError,
    } = useGetMyCommunitiesQuery();

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
        >
            <View className="bg-background">
                <View className="relative">
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primary2, COLORS.soft]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                            height: 230,
                            borderBottomLeftRadius: 30,
                            borderBottomRightRadius: 30,
                            overflow: "hidden",
                        }}
                    >
                        <View className="flex-1 justify-between px-5 pb-5 pt-6">
                            <View className="items-end">
                                <Pressable className="h-[42px] w-[42px] items-center justify-center rounded-full border border-white/20 bg-white/15">
                                    <Ionicons name="camera-outline" size={20} color="#fff" />
                                </Pressable>
                            </View>

                            <View>
                                <Text
                                    className="text-white/90"
                                    style={{
                                        fontSize: 13,
                                        fontFamily: "Poppins_500Medium",
                                    }}
                                >
                                    {user?.businessType || "Profile"}
                                </Text>

                                <Text
                                    className="text-white"
                                    style={{
                                        fontSize: 28,
                                        lineHeight: 36,
                                        fontFamily: "Poppins_700Bold",
                                        marginTop: 6,
                                    }}
                                >
                                    {user?.businessName || fullName}
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>

                    <View className="absolute left-5 -bottom-[54px]">
                        <View className="h-[116px] w-[116px] items-center justify-center overflow-hidden rounded-full border-4 border-background bg-surface">
                            {user?.image ? (
                                <Image
                                    source={{ uri: user.image }}
                                    style={{ width: "100%", height: "100%" }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="h-full w-full items-center justify-center bg-segment">
                                    <Text
                                        className="text-accent"
                                        style={{
                                            fontSize: 36,
                                            fontFamily: "Poppins_700Bold",
                                        }}
                                    >
                                        {initials}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Pressable className="absolute bottom-1 right-1 h-[34px] w-[34px] items-center justify-center rounded-full border border-border bg-surface">
                            <Ionicons
                                name="camera-outline"
                                size={16}
                                color={COLORS.primary}
                            />
                        </Pressable>
                    </View>
                </View>

                <View className="px-5 pt-[68px]">
                    <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                            <Text
                                className="text-foreground"
                                style={{
                                    fontSize: 30,
                                    lineHeight: 38,
                                    fontFamily: "Poppins_700Bold",
                                }}
                            >
                                {fullName}
                            </Text>

                            <Text
                                className="mt-1 text-muted"
                                style={{
                                    fontSize: 15,
                                    lineHeight: 22,
                                    fontFamily: "Poppins_400Regular",
                                }}
                            >
                                {user?.email}
                            </Text>

                            {!!user?.businessType && (
                                <Text
                                    className="mt-2 text-muted"
                                    style={{
                                        fontSize: 14,
                                        lineHeight: 20,
                                        fontFamily: "Poppins_500Medium",
                                    }}
                                >
                                    {user.businessType}
                                </Text>
                            )}
                        </View>

                        <Menu>
                            <Menu.Trigger asChild>
                                <Pressable className="h-[46px] w-[46px] items-center justify-center rounded-full border border-border bg-surface">
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
                                    <Menu.Item
                                        onPress={handleCreateCommunity}
                                        className="flex-row items-center gap-3"
                                    >
                                        <Ionicons
                                            name="add-circle-outline"
                                            size={20}
                                            color={COLORS.primary}
                                        />
                                        <Menu.ItemTitle>Create Community</Menu.ItemTitle>
                                    </Menu.Item>

                                    <Menu.Item
                                        onPress={handleLogout}
                                        variant="danger"
                                        isDisabled={isLoggingOut}
                                        className="flex-row items-center gap-3"
                                    >
                                        <Ionicons
                                            name="log-out-outline"
                                            size={20}
                                            color={COLORS.danger}
                                        />
                                        <Menu.ItemTitle>
                                            {isLoggingOut ? "Logging out..." : "Logout"}
                                        </Menu.ItemTitle>
                                    </Menu.Item>
                                </Menu.Content>
                            </Menu.Portal>
                        </Menu>
                    </View>
                </View>

                <View className="mt-6 px-5">
                    <View className="px-4 py-4">
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
                                    contentContainerStyle={{ flexDirection: "row", gap: 28 }}
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
                                </Tabs.ScrollView>
                            </Tabs.List>

                            <View className="pt-5">
                                <Tabs.Content value="posts">
                                    <View className="bg-background p-4">
                                        <Text
                                            className="text-foreground"
                                            style={{
                                                fontSize: 20,
                                                fontFamily: "Poppins_700Bold",
                                            }}
                                        >
                                            Posts
                                        </Text>
                                        <Text
                                            className="mt-2 text-muted"
                                            style={{
                                                fontSize: 14,
                                                lineHeight: 22,
                                                fontFamily: "Poppins_400Regular",
                                            }}
                                        >
                                            Your post activity will appear here.
                                        </Text>
                                    </View>
                                </Tabs.Content>

                                <Tabs.Content value="about">
                                    <View className="gap-3">
                                        <View className="p-2">
                                            <Text
                                                className="text-foreground"
                                                style={{
                                                    fontSize: 20,
                                                    fontFamily: "Poppins_700Bold",
                                                }}
                                            >
                                                About
                                            </Text>

                                            <View className="mt-4 gap-3">
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
                                    </View>
                                </Tabs.Content>

                                <Tabs.Content value="communities">
                                    <View className="bg-background p-2">
                                        <Text
                                            className="text-foreground"
                                            style={{
                                                fontSize: 20,
                                                fontFamily: "Poppins_700Bold",
                                            }}
                                        >
                                            Communities
                                        </Text>

                                        {myCommunitiesLoading ? (
                                            <Text
                                                className="mt-3 text-muted"
                                                style={{
                                                    fontSize: 14,
                                                    fontFamily: "Poppins_400Regular",
                                                }}
                                            >
                                                Loading communities...
                                            </Text>
                                        ) : myCommunitiesError ? (
                                            <Text
                                                className="mt-3"
                                                style={{
                                                    color: COLORS.danger,
                                                    fontSize: 14,
                                                    fontFamily: "Poppins_500Medium",
                                                }}
                                            >
                                                Failed to load communities
                                            </Text>
                                        ) : myCommunities.length === 0 ? (
                                            <>
                                                <Text
                                                    className="mt-2 text-muted"
                                                    style={{
                                                        fontSize: 14,
                                                        lineHeight: 22,
                                                        fontFamily: "Poppins_400Regular",
                                                    }}
                                                >
                                                    You have not created any communities yet.
                                                </Text>

                                                <Text
                                                    className="mt-4 text-muted"
                                                    style={{
                                                        fontSize: 13,
                                                        lineHeight: 20,
                                                        fontFamily: "Poppins_500Medium",
                                                    }}
                                                >
                                                    Use the menu at the top right to create a new community.
                                                </Text>
                                            </>
                                        ) : (
                                            <View className="mt-4 gap-3">
                                                {myCommunities.map((community) => (
                                                    <Pressable
                                                        key={community.id}
                                                        className="overflow-hidden rounded-[22px] border border-border bg-surface"
                                                    >
                                                        {!!community.coverImage ? (
                                                            <Image
                                                                source={{ uri: community.coverImage }}
                                                                style={{ width: "100%", height: 110 }}
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <LinearGradient
                                                                colors={[COLORS.primary, COLORS.primary2, COLORS.soft]}
                                                                start={{ x: 0, y: 0 }}
                                                                end={{ x: 1, y: 1 }}
                                                                style={{ height: 110 }}
                                                            />
                                                        )}

                                                        <View className="p-4">
                                                            <View className="flex-row items-start gap-3">
                                                                <View className="h-[52px] w-[52px] overflow-hidden rounded-full border border-border bg-segment">
                                                                    {!!community.avatarImage ? (
                                                                        <Image
                                                                            source={{ uri: community.avatarImage }}
                                                                            style={{ width: "100%", height: "100%" }}
                                                                            resizeMode="cover"
                                                                        />
                                                                    ) : (
                                                                        <View className="h-full w-full items-center justify-center">
                                                                            <Ionicons
                                                                                name="people-outline"
                                                                                size={22}
                                                                                color={COLORS.primary}
                                                                            />
                                                                        </View>
                                                                    )}
                                                                </View>

                                                                <View className="flex-1">
                                                                    <Text
                                                                        className="text-foreground"
                                                                        style={{
                                                                            fontSize: 16,
                                                                            lineHeight: 22,
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
                                                                        {community.category?.name} • {community.visibility}
                                                                    </Text>

                                                                    {!!community.description && (
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
                                                                    )}
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </Pressable>
                                                ))}
                                            </View>
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
                >
                    {value}
                </Text>
            </View>
        </View>
    );
}