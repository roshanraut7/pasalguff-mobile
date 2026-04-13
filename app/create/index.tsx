import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/colors";
import CreateCommunityForm from "@/components/form/CreateCommunityForm";

export default function CreateCommunityPage() {
    return (
        <View className="flex-1 bg-background">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View className="px-5 pt-6">
                        <View className="mb-6 flex-row items-center gap-3">
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

                            <View className="flex-1">
                                <Text
                                    className="text-foreground"
                                    style={{
                                        fontSize: 22,
                                        fontFamily: "Poppins_700Bold",
                                    }}
                                >
                                    New Community
                                </Text>

                                <Text
                                    className="text-muted"
                                    style={{
                                        fontSize: 13,
                                        fontFamily: "Poppins_400Regular",
                                    }}
                                >
                                    Set up your community details
                                </Text>
                            </View>
                        </View>

                        <View className="rounded-[30px] border border-border bg-surface px-5 py-6">
                            <CreateCommunityForm />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}