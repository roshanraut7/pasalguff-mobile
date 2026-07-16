import React, { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FieldError,
  InputGroup,
  Label,
  TextField,
  useToast,
} from "heroui-native";

import { sendForgotPasswordOTP } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";

const schema = z.object({
  email: z.email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colors } = useAppTheme();
  const { toast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      const email = values.email.trim().toLowerCase();
      await sendForgotPasswordOTP(email);

      toast.show({
        variant: "success",
        label: "Code sent",
        description: `Check ${email} for your reset code.`,
      });

      router.replace({ pathname: "/pages/reset-password", params: { email } });
    } catch (error) {
      toast.show({
        variant: "danger",
        label: "Couldn't send code",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
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
            <Text
              className="text-foreground"
              style={{ fontSize: 24, fontFamily: "Poppins_700Bold" }}
            >
              Forgot password
            </Text>
            <Text
              className="text-muted mt-1"
              style={{ fontSize: 14, fontFamily: "Poppins_400Regular" }}
            >
              Enter your email and we'll send you a reset code.
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

          <Button
            onPress={handleSubmit(onSubmit)}
            isDisabled={isSubmitting}
            className="bg-accent"
          >
            {isSubmitting ? "Sending..." : "Send code"}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}