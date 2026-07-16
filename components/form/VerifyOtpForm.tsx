import React, { useState, useEffect } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, InputOTP } from "heroui-native";
// ADD these imports near your existing ones
import { consumePendingPassword } from "@/lib/pending-auth";

import {
  sendSignupOTP,
  verifySignupOTP,
  signInWithEmail
} from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function VerifyOtpForm() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { colors } = useAppTheme();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (value: string) => {
    const code = value ?? otp;

    if (code.length !== OTP_LENGTH) {
      setServerError("Enter the full 6-digit code");
      return;
    }

    try {
      setServerError("");
      setIsVerifying(true);
      await verifySignupOTP(email, code);

      const password = consumePendingPassword();

      if (password) {
        await signInWithEmail({ email, password });
        router.replace("/onboarding");
      } else {
        router.replace({ pathname: "/(auth)", params: { mode: "login" } });
      }
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Verification failed"
      );
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setServerError("");
      setIsResending(true);
      await sendSignupOTP(email);
      setCooldown(RESEND_COOLDOWN);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Failed to resend code"
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View className="gap-4">
      <View>
        <Text
          className="text-foreground"
          style={{ fontSize: 24, fontFamily: "Poppins_700Bold" }}
        >
          Verify your email
        </Text>

        <Text
          className="text-muted mt-1"
          style={{ fontSize: 14, fontFamily: "Poppins_400Regular" }}
        >
          Enter the 6-digit code sent to {email}
        </Text>
      </View>

    <InputOTP
  value={otp}
  onChange={(value) => {
    setOtp(value);
    if (value.length === OTP_LENGTH) {
      handleVerify(value);
    }
  }}
  maxLength={OTP_LENGTH}
>
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
        onPress={() => handleVerify(otp)}
        isDisabled={isVerifying || otp.length !== OTP_LENGTH}
        className="bg-accent"
      >
        {isVerifying ? "Verifying..." : "Verify"}
      </Button>

      <View className="flex-row justify-center items-center mt-1">
        <Text
          className="text-muted"
          style={{ fontSize: 13, fontFamily: "Poppins_400Regular" }}
        >
          Didn't get the code?{" "}
        </Text>
        <Text
          onPress={cooldown > 0 || isResending ? undefined : handleResend}
          style={{
            fontSize: 13,
            fontFamily: "Poppins_600SemiBold",
            color: cooldown > 0 ? colors.muted : colors.success,
          }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
        </Text>
      </View>
    </View>
  );
}