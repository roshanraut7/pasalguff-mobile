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

import { loginSchema, type LoginFormValues } from "@/schema/login.schema";
import { signInWithEmail } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function LoginForm() {
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useAppTheme();

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

      const result = await signInWithEmail({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      const role = result?.user?.role;
      const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

      router.replace(isAdmin ? "/admin" : "/(tabs)");
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
          Sign in to continue.
        </Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextField isRequired isInvalid={!!errors.email}>
            <Label>Email</Label>
            <InputGroup className="border-field-border bg-field-background">
              <InputGroup.Input
                value={value}
                onChangeText={onChange}
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
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
                    color={colors.muted}
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
            color: colors.danger,
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
        className="bg-accent"
      >
        {isSubmitting ? "Signing in..." : "Login"}
      </Button>
    </View>
  );
}