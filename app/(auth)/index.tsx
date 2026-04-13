import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { ScrollShadow, Tabs } from "heroui-native";

import LoginForm from "@/components/form/LoginForm";
import SignupForm from "@/components/form/SignupForm";
import { COLORS } from "@/constants/colors";
import Logo from "@/assets/images/logo.svg";
import { useSession } from "@/api/better-auth-client";

type AuthMode = "login" | "signup";

export default function AuthPage() {
    const [mode, setMode] = useState<AuthMode>("login");
    const { data: session, isPending } = useSession();

    if (isPending) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (session?.user) {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollShadow
                    LinearGradientComponent={LinearGradient}
                    size={48}
                    color={COLORS.background}
                    visibility="auto"
                >
                    <ScrollView
                        contentContainerStyle={{
                            flexGrow: 1,
                            paddingHorizontal: 24,
                            paddingTop: 12,
                            paddingBottom: 32,
                        }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="flex-1">
                            <View className="items-center">
                                <View className="mb-5 items-center justify-center">
                                    <Logo width={125} height={125} />
                                </View>

                                <View
                                    style={{
                                        backgroundColor: COLORS.soft,
                                        borderRadius: 999,
                                        paddingHorizontal: 18,
                                        paddingVertical: 10,
                                        marginBottom: 14,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: COLORS.primary,
                                            fontSize: 13,
                                            fontFamily: "Poppins_600SemiBold",
                                        }}
                                    >
                                        Pasal Guff
                                    </Text>
                                </View>

                                <Text
                                    className="text-foreground text-center"
                                    style={{
                                        fontSize: 30,
                                        lineHeight: 38,
                                        fontFamily: "Poppins_700Bold",
                                    }}
                                >
                                    {mode === "login" ? "Welcome Back" : "Create Account"}
                                </Text>

                                <Text
                                    className="text-center text-muted mt-2"
                                    style={{
                                        fontSize: 15,
                                        lineHeight: 24,
                                        maxWidth: 330,
                                        fontFamily: "Poppins_400Regular",
                                    }}
                                >
                                    {mode === "login"
                                        ? "Login to continue to your business community."
                                        : "Create your account and start connecting with trusted vendors."}
                                </Text>
                            </View>

                            <View className="mt-2 items-center">
                                <Tabs
                                    value={mode}
                                    onValueChange={(value) => setMode(value as AuthMode)}
                                    style={{ width: "100%" }}
                                >
                                    <View style={{ alignSelf: "center", marginBottom: 20 }}>
                                        <Tabs.List className="rounded-full bg-segment px-1 py-1">
                                            <Tabs.ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                style={{ flexGrow: 0, flexShrink: 1 }}
                                                contentContainerStyle={{ flexDirection: "row" }}
                                            >
                                                <Tabs.Indicator />
                                                <Tabs.Trigger value="login" className="px-6">
                                                    <Tabs.Label>Login</Tabs.Label>
                                                </Tabs.Trigger>

                                                <Tabs.Trigger value="signup" className="px-6">
                                                    <Tabs.Label>Sign Up</Tabs.Label>
                                                </Tabs.Trigger>
                                            </Tabs.ScrollView>
                                        </Tabs.List>
                                    </View>

                                    <View className="w-full rounded-[30px] border border-border bg-surface px-5 py-6">
                                        <Tabs.Content value="login">
                                            <LoginForm />
                                        </Tabs.Content>

                                        <Tabs.Content value="signup">
                                            <SignupForm />
                                        </Tabs.Content>
                                    </View>
                                </Tabs>
                            </View>
                        </View>
                    </ScrollView>
                </ScrollShadow>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}