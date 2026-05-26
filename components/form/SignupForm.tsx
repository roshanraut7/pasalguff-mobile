import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  FieldError,
  Input,
  InputGroup,
  Label,
  TextField,
} from "heroui-native";

import {
  signupSchema,
  type SignupFormValues,
} from "@/schema/singup.schema";
import { signUpWithEmail } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function SignupForm() {
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { colors } = useAppTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      setServerError("");
      setIsSubmitting(true);

      await signUpWithEmail({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      /**
       * After signup, user should complete onboarding.
       * Business type, interests, business name, and address
       * will be saved from onboarding screen.
       */
      router.replace("/onboarding");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Signup failed");
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
          Sign Up
        </Text>

        <Text
          className="text-muted mt-1"
          style={{
            fontSize: 14,
            fontFamily: "Poppins_400Regular",
          }}
        >
          Create your account to get started.
        </Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, value } }) => (
              <TextField isRequired isInvalid={!!errors.firstName}>
                <Label>First Name</Label>

                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="First name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  className="border-field-border bg-field-background"
                />

                {errors.firstName?.message ? (
                  <FieldError>{errors.firstName.message}</FieldError>
                ) : null}
              </TextField>
            )}
          />
        </View>

        <View className="flex-1">
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, value } }) => (
              <TextField isRequired isInvalid={!!errors.lastName}>
                <Label>Last Name</Label>

                <Input
                  value={value}
                  onChangeText={onChange}
                  placeholder="Last name"
                  autoCapitalize="words"
                  autoCorrect={false}
                  className="border-field-border bg-field-background"
                />

                {errors.lastName?.message ? (
                  <FieldError>{errors.lastName.message}</FieldError>
                ) : null}
              </TextField>
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextField isRequired isInvalid={!!errors.email}>
            <Label>Email</Label>

            <InputGroup className="border-field-border bg-field-background">
              <InputGroup.Prefix isDecorative>
                <Ionicons name="mail-outline" size={18} color={colors.muted} />
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
                  color={colors.muted}
                />
              </InputGroup.Prefix>

              <InputGroup.Input
                value={value}
                onChangeText={onChange}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
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
        className="mt-2 bg-accent rounded-full"
      >
        <Button.Label className="text-accent-foreground">
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button.Label>
      </Button>
    </View>
  );
}