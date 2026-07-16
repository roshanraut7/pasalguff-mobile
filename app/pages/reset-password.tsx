import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  FieldError,
  InputGroup,
  InputOTP,
  Label,
  TextField,
  useToast,
} from "heroui-native";

import { resetPasswordWithOTP, sendForgotPasswordOTP } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

const schema = z.object({
  otp: z.string().trim().length(6, "Enter the 6-digit code"),
  newPassword: z.string().min(8, "At least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colors } = useAppTheme();
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otp: "", newPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      await resetPasswordWithOTP({
        email,
        otp: values.otp.trim(),
        newPassword: values.newPassword,
      });

      toast.show({
        variant: "success",
        label: "Password updated",
        description: "Log in with your new password.",
      });

      router.replace({ pathname: "/(auth)", params: { mode: "login" } });
    } catch (error) {
      toast.show({
        variant: "danger",
        label: "Reset failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await sendForgotPasswordOTP(email);
      toast.show({
        variant: "success",
        label: "Code resent",
        description: `Check ${email} for the new code.`,
      });
    } catch (error) {
      toast.show({
        variant: "danger",
        label: "Couldn't resend code",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>
        <View
          style={{
            borderRadius: 28,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 18,
          }}
          className="gap-4"
        >
          <View>
            <Text className="text-foreground" style={{ fontSize: 24, fontFamily: "Poppins_700Bold" }}>
              Reset password
            </Text>
            <Text className="text-muted mt-1" style={{ fontSize: 14, fontFamily: "Poppins_400Regular" }}>
              Enter the code sent to {email} and choose a new password.
            </Text>
          </View>

       <Controller
  control={control}
  name="otp"
  render={({ field: { onChange, value } }) => (
    <TextField isRequired isInvalid={!!errors.otp}>
      <Label>Verification code</Label>
      <InputOTP value={value} onChange={onChange} maxLength={6}>
        <InputOTP.Group>
          <InputOTP.Slot index={0} style={{ width: 38, height: 46 }} />
          <InputOTP.Slot index={1} style={{ width: 38, height: 46 }} />
          <InputOTP.Slot index={2} style={{ width: 38, height: 46 }} />
        </InputOTP.Group>
        <InputOTP.Separator />
        <InputOTP.Group>
          <InputOTP.Slot index={3} style={{ width: 38, height: 46 }} />
          <InputOTP.Slot index={4} style={{ width: 38, height: 46 }} />
          <InputOTP.Slot index={5} style={{ width: 38, height: 46 }} />
        </InputOTP.Group>
      </InputOTP>
      {errors.otp?.message ? <FieldError>{errors.otp.message}</FieldError> : null}
    </TextField>
  )}
/>

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <TextField isRequired isInvalid={!!errors.newPassword}>
                <Label>New password</Label>
                <InputGroup className="border-field-border bg-field-background">
                  <InputGroup.Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter new password"
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
                {errors.newPassword?.message ? (
                  <FieldError>{errors.newPassword.message}</FieldError>
                ) : null}
              </TextField>
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} isDisabled={isSubmitting} className="bg-accent">
            {isSubmitting ? "Resetting..." : "Reset password"}
          </Button>

          <Text
            onPress={handleResend}
            style={{
              fontSize: 13,
              fontFamily: "Poppins_600SemiBold",
              color: colors.success,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            Resend code
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}