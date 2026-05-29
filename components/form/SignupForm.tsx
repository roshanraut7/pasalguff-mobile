import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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
import { NEPAL_DISTRICTS } from "@/constants/nepalDistricts";

export default function SignupForm() {
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDistrictModalOpen, setIsDistrictModalOpen] = useState(false);

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
      address: "",
      acceptedTerms: false,
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
        address: values.address.trim(),
      });

      router.replace("/onboarding");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={colors.muted}
                  />
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
                  <Pressable
                    onPress={() => setShowPassword((previous) => !previous)}
                    hitSlop={10}
                  >
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

        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, value } }) => (
            <View>
              <Text
                className="text-foreground mb-2"
                style={{
                  fontSize: 14,
                  fontFamily: "Poppins_500Medium",
                }}
              >
                Address
              </Text>

              <Pressable
                onPress={() => setIsDistrictModalOpen(true)}
                disabled={isSubmitting}
                className="h-12 flex-row items-center justify-between rounded-xl border border-field-border bg-field-background px-4"
                style={{
                  borderColor: errors.address ? colors.danger : undefined,
                }}
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={colors.muted}
                  />

                  <Text
                    className={value ? "text-foreground ml-3" : "text-muted ml-3"}
                    style={{
                      fontSize: 14,
                      fontFamily: "Poppins_400Regular",
                    }}
                  >
                    {value || "Select your district"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-down-outline"
                  size={18}
                  color={colors.muted}
                />
              </Pressable>

              {errors.address?.message ? (
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 12,
                    marginTop: 5,
                    fontFamily: "Poppins_400Regular",
                  }}
                >
                  {errors.address.message}
                </Text>
              ) : null}

              <Modal
                visible={isDistrictModalOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsDistrictModalOpen(false)}
              >
                <View className="flex-1 justify-end bg-black/40">
                  <View
                    className="rounded-t-3xl bg-background px-5 pt-5 pb-8"
                    style={{ maxHeight: "72%" }}
                  >
                    <View className="flex-row items-center justify-between mb-4">
                      <Text
                        className="text-foreground"
                        style={{
                          fontSize: 18,
                          fontFamily: "Poppins_600SemiBold",
                        }}
                      >
                        Select District
                      </Text>

                      <Pressable
                        onPress={() => setIsDistrictModalOpen(false)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name="close-outline"
                          size={26}
                          color={colors.muted}
                        />
                      </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                      {NEPAL_DISTRICTS.map((district) => {
                        const isSelected = value === district;

                        return (
                          <Pressable
                            key={district}
                            onPress={() => {
                              onChange(district);
                              setIsDistrictModalOpen(false);
                            }}
                            className="flex-row items-center justify-between border-b border-field-border py-4"
                          >
                            <Text
                              className="text-foreground"
                              style={{
                                fontSize: 14,
                                fontFamily: isSelected
                                  ? "Poppins_600SemiBold"
                                  : "Poppins_400Regular",
                              }}
                            >
                              {district}
                            </Text>

                            {isSelected ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={21}
                                color={colors.success}
                              />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </View>
          )}
        />

        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field: { onChange, value } }) => (
            <View className="mt-1">
              <View className="flex-row items-start">
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: value }}
                  onPress={() => onChange(!value)}
                  disabled={isSubmitting}
                  hitSlop={8}
                  className="mr-3 mt-0.5"
                >
                  <Ionicons
                    name={value ? "checkbox" : "square-outline"}
                    size={23}
                    color={value ? colors.success : colors.muted}
                  />
                </Pressable>

                <Text
                  className="text-muted flex-1"
                  style={{
                    fontSize: 13,
                    lineHeight: 21,
                    fontFamily: "Poppins_400Regular",
                  }}
                >
                  I have read and agree to the{" "}
                  <Text
                    onPress={() =>
                      router.push("/pages/terms-condition")
                    }
                    style={{
                      color: colors.success,
                      fontFamily: "Poppins_600SemiBold",
                    }}
                  >
                    Terms and Conditions
                  </Text>
                  .
                </Text>
              </View>

              {errors.acceptedTerms?.message ? (
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 12,
                    marginTop: 5,
                    fontFamily: "Poppins_400Regular",
                  }}
                >
                  {errors.acceptedTerms.message}
                </Text>
              ) : null}
            </View>
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
    </>
  );
}