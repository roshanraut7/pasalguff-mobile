import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, InputOTP } from "heroui-native";

import { consumePendingPassword } from "@/lib/pending-auth";
import {
  sendSignupOTP,
  signInWithEmail,
  verifySignupOTP,
} from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export default function VerifyOtpForm() {
  const params = useLocalSearchParams<{
    email?: string | string[];
  }>();

  const { colors } = useAppTheme();

  const email = useMemo(() => {
    const rawEmail = Array.isArray(params.email)
      ? params.email[0]
      : params.email;

    return rawEmail?.trim().toLowerCase() || "";
  }, [params.email]);

  const verificationLock = useRef(false);

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [serverError, setServerError] = useState("");

  /*
   * The signup function has already sent the first OTP,
   * so prevent an immediate second request.
   */
  const [cooldown, setCooldown] = useState(
    RESEND_COOLDOWN,
  );

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  const goToLogin = () => {
    router.replace({
      pathname: "/(auth)",
      params: {
        mode: "login",
        email,
        verified: "true",
      },
    });
  };

  const handleVerify = async (inputValue?: string) => {
    if (verificationLock.current) {
      return;
    }

    const code = (inputValue ?? otp).trim();

    if (!email) {
      setServerError(
        "Email address is missing. Please return to signup.",
      );
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setServerError("Enter the full 6-digit code");
      return;
    }

    verificationLock.current = true;
    setServerError("");
    setIsVerifying(true);

    try {
      /*
       * First complete verification.
       */
      await verifySignupOTP(email, code);

      /*
       * Email is now verified.
       *
       * Try automatic login using your temporary in-memory password.
       */
      const password = consumePendingPassword();

      if (!password) {
        goToLogin();
        return;
      }

      try {
        await signInWithEmail({
          email,
          password,
        });

        router.replace("/onboarding");
      } catch (signInError) {
        /*
         * Do not show "verification failed" here because the OTP
         * verification already succeeded.
         *
         * Send the user to normal login instead.
         */
        console.error(
          "[OTP] Email verified, but automatic login failed:",
          signInError,
        );

        goToLogin();
      }
    } catch (verificationError) {
      setServerError(
        verificationError instanceof Error
          ? verificationError.message
          : "Verification failed",
      );

      setOtp("");
    } finally {
      verificationLock.current = false;
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (
      isResending ||
      isVerifying ||
      cooldown > 0 ||
      !email
    ) {
      return;
    }

    try {
      setServerError("");
      setIsResending(true);

      await sendSignupOTP(email);

      /*
       * With resendStrategy: "reuse", this will resend the current
       * OTP and extend its expiry.
       */
      setCooldown(RESEND_COOLDOWN);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Failed to resend code",
      );
    } finally {
      setIsResending(false);
    }
  };

  const resendDisabled =
    cooldown > 0 ||
    isResending ||
    isVerifying ||
    !email;

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
          Verify your email
        </Text>

        <Text
          className="text-muted mt-1"
          style={{
            fontSize: 14,
            fontFamily: "Poppins_400Regular",
          }}
        >
          {email
            ? `Enter the 6-digit code sent to ${email}`
            : "Email address is missing. Please return to signup."}
        </Text>
      </View>

      <InputOTP
        value={otp}
        maxLength={OTP_LENGTH}
        onChange={(value) => {
          /*
           * Keep only digits in case the OTP component allows
           * pasted spaces or other characters.
           */
          const numericValue = value
            .replace(/\D/g, "")
            .slice(0, OTP_LENGTH);

          setOtp(numericValue);
          setServerError("");

          if (
            numericValue.length === OTP_LENGTH &&
            !verificationLock.current
          ) {
            void handleVerify(numericValue);
          }
        }}
      >
        <InputOTP.Group>
          <InputOTP.Slot
            index={0}
            style={{ width: 38, height: 46 }}
          />
          <InputOTP.Slot
            index={1}
            style={{ width: 38, height: 46 }}
          />
          <InputOTP.Slot
            index={2}
            style={{ width: 38, height: 46 }}
          />
        </InputOTP.Group>

        <InputOTP.Separator />

        <InputOTP.Group>
          <InputOTP.Slot
            index={3}
            style={{ width: 38, height: 46 }}
          />
          <InputOTP.Slot
            index={4}
            style={{ width: 38, height: 46 }}
          />
          <InputOTP.Slot
            index={5}
            style={{ width: 38, height: 46 }}
          />
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
        onPress={() => void handleVerify()}
        isDisabled={
          isVerifying ||
          isResending ||
          otp.length !== OTP_LENGTH ||
          !email
        }
        className="bg-accent"
      >
        {isVerifying ? "Verifying..." : "Verify"}
      </Button>

      <View className="flex-row justify-center items-center mt-1">
        <Text
          className="text-muted"
          style={{
            fontSize: 13,
            fontFamily: "Poppins_400Regular",
          }}
        >
          Didn&apos;t get the code?{" "}
        </Text>

        <Text
          onPress={
            resendDisabled
              ? undefined
              : () => void handleResend()
          }
          style={{
            fontSize: 13,
            fontFamily: "Poppins_600SemiBold",
            color: resendDisabled
              ? colors.muted
              : colors.success,
          }}
        >
          {isResending
            ? "Sending..."
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend"}
        </Text>
      </View>
    </View>
  );
}