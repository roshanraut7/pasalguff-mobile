import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import {
    Button,
    FieldError,
    InputGroup,
    Label,
    TextField,
} from "heroui-native";

import { COLORS } from "@/constants/colors";
import { loginSchema, type LoginFormValues } from "@/schema/login.schema";
import { signInWithEmail } from "@/lib/auth-client";

export default function LoginForm() {
    const [serverError, setServerError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (values: LoginFormValues) => {
        try {
            setServerError("");
            setIsSubmitting(true);

            await signInWithEmail({
                email: values.email.trim().toLowerCase(),
                password: values.password,
            });

            router.replace("/(tabs)");
        } catch (error) {
            setServerError(error instanceof Error ? error.message : "Login failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View className="gap-4">
            <View>
                <Text
                    className="text-foreground"
                    style={{
                        fontSize: 24,
                        fontFamily: "Poppins_700Bold",
                    }}
                >
                    Login
                </Text>

                <Text
                    className="text-muted mt-1"
                    style={{
                        fontSize: 14,
                        fontFamily: "Poppins_400Regular",
                    }}
                >
                    Enter your details to continue.
                </Text>
            </View>

            <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                    <TextField isRequired isInvalid={!!errors.email}>
                        <Label>Email</Label>

                        <InputGroup className="border-field-border bg-field-background">
                            <InputGroup.Prefix isDecorative>
                                <Ionicons name="mail-outline" size={18} color={COLORS.muted} />
                            </InputGroup.Prefix>

                            <InputGroup.Input
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </InputGroup>

                        {errors.email?.message ? (
                            <FieldError>{errors.email.message}</FieldError>
                        ) : null}
                    </TextField>
                )}
            />

            <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                    <TextField isRequired isInvalid={!!errors.password}>
                        <Label>Password</Label>

                        <InputGroup className="border-field-border bg-field-background">
                            <InputGroup.Prefix isDecorative>
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={18}
                                    color={COLORS.muted}
                                />
                            </InputGroup.Prefix>

                            <InputGroup.Input
                                value={value}
                                onChangeText={onChange}
                                placeholder="Enter your password"
                                secureTextEntry={!showPassword}
                            />

                            <InputGroup.Suffix>
                                <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={18}
                                        color={COLORS.muted}
                                    />
                                </Pressable>
                            </InputGroup.Suffix>
                        </InputGroup>

                        {errors.password?.message ? (
                            <FieldError>{errors.password.message}</FieldError>
                        ) : null}
                    </TextField>
                )}
            />

            {serverError ? (
                <Text
                    style={{
                        color: COLORS.danger,
                        fontSize: 13,
                        fontFamily: "Poppins_500Medium",
                    }}
                >
                    {serverError}
                </Text>
            ) : null}

            <Button
                onPress={handleSubmit(onSubmit)}
                isDisabled={isSubmitting}
                className="mt-2 bg-accent rounded-full"
            >
                <Button.Label className="text-accent-foreground">
                    {isSubmitting ? "Logging in..." : "Login"}
                </Button.Label>
            </Button>

            <Pressable className="self-center mt-1">
                <Text
                    style={{
                        color: COLORS.primary2,
                        fontSize: 14,
                        fontFamily: "Poppins_600SemiBold",
                    }}
                >
                    Forgot password?
                </Text>
            </Pressable>
        </View>
    );
}