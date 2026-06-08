// src/components/settings/ChangePasswordForm.tsx

import React, { useMemo, useState } from "react";
import * as z from "zod";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { changeMyPassword } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/schema/change-password.schema";

type ChangePasswordErrors = Partial<Record<keyof ChangePasswordInput, string>>;

type ChangePasswordFormProps = {
  onSuccess?: () => void;
};

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const { colors } = useAppTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [form, setForm] = useState<ChangePasswordInput>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: keyof ChangePasswordInput, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  };

  const handleSubmit = async () => {
    const parsed = changePasswordSchema.safeParse(form);

    if (!parsed.success) {
      // const fieldErrors = parsed.error.flatten().fieldErrors;
     const fieldErrors = z.treeifyError(parsed.error).properties;
      setErrors({
        currentPassword: fieldErrors?.currentPassword?.errors?.[0],
        newPassword: fieldErrors?.newPassword?.errors?.[0],
        confirmPassword: fieldErrors?.confirmPassword?.errors?.[0],
      });

      return;
    }

    try {
      setIsSubmitting(true);

      await changeMyPassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setErrors({});

      Alert.alert("Success", "Your password has been changed successfully.");

      onSuccess?.();
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error?.message || "Could not change password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <PasswordField
        label="Current Password"
        value={form.currentPassword}
        error={errors.currentPassword}
        visible={showCurrentPassword}
        onToggleVisible={() => setShowCurrentPassword((value) => !value)}
        onChangeText={(value) => updateField("currentPassword", value)}
      />

      <PasswordField
        label="New Password"
        value={form.newPassword}
        error={errors.newPassword}
        visible={showNewPassword}
        onToggleVisible={() => setShowNewPassword((value) => !value)}
        onChangeText={(value) => updateField("newPassword", value)}
      />

      <PasswordField
        label="Confirm New Password"
        value={form.confirmPassword}
        error={errors.confirmPassword}
        visible={showConfirmPassword}
        onToggleVisible={() => setShowConfirmPassword((value) => !value)}
        onChangeText={(value) => updateField("confirmPassword", value)}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.submitButton,
          {
            opacity: pressed || isSubmitting ? 0.7 : 1,
          },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={colors.accentForeground} />
        ) : (
          <Text style={styles.submitText}>Change Password</Text>
        )}
      </Pressable>
    </View>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  error?: string;
  visible: boolean;
  onToggleVisible: () => void;
  onChangeText: (value: string) => void;
};

function PasswordField({
  label,
  value,
  error,
  visible,
  onToggleVisible,
  onChangeText,
}: PasswordFieldProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrap,
          {
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={label}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Pressable onPress={onToggleVisible} hitSlop={10}>
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.muted}
          />
        </Pressable>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    root: {
      gap: 14,
    },

    fieldGroup: {
      gap: 7,
    },

    label: {
      color: colors.foreground,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_700Bold",
    },

    inputWrap: {
      minHeight: 52,
      borderRadius: 18,
      borderWidth: 1,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: 14,
      fontFamily: "Poppins_400Regular",
    },

    errorText: {
      color: colors.danger,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Poppins_400Regular",
    },

    submitButton: {
      marginTop: 4,
      minHeight: 52,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },

    submitText: {
      color: colors.accentForeground,
      fontSize: 14,
      fontFamily: "Poppins_700Bold",
    },
  });
}