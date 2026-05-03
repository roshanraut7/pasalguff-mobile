// src/components/admin/categories/CreateCategoryForm.tsx

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useCreateCategoryMutation } from "@/store/api/category.api";
import {
  createCategorySchema,
  CreateCategoryFormErrors,
} from "@/schema/category.schema";

type CreateCategoryFormProps = {
  visible: boolean;
  onClose: () => void;
};

export default function CreateCategoryForm({
  visible,
  onClose,
}: CreateCategoryFormProps) {
  const { colors } = useAppTheme();

  const [createCategory, { isLoading }] = useCreateCategoryMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<CreateCategoryFormErrors>({});

  useEffect(() => {
    if (!visible) {
      setName("");
      setDescription("");
      setErrors({});
    }
  }, [visible]);

  const validateForm = () => {
    const result = createCategorySchema.safeParse({
      name,
      description,
    });

    if (result.success) {
      return {
        success: true as const,
        data: result.data,
      };
    }

    const nextErrors: CreateCategoryFormErrors = {};

    for (const issue of result.error.issues) {
      const fieldName = issue.path[0];

      if (fieldName === "name" || fieldName === "description") {
        nextErrors[fieldName] = issue.message;
      }
    }

    setErrors(nextErrors);

    return {
      success: false as const,
    };
  };

  const handleSubmit = async () => {
    setErrors({});

    const validation = validateForm();

    if (!validation.success) {
      return;
    }

    const trimmedDescription = validation.data.description?.trim();

    try {
      await createCategory({
        name: validation.data.name,
        ...(trimmedDescription
          ? {
              description: trimmedDescription,
            }
          : {}),
      }).unwrap();

      onClose();
    } catch {
      setErrors({
        root: "Failed to create category. Please try again.",
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Create Category
          </Text>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Add a new category for communities.
          </Text>

          {errors.root ? (
            <Text style={styles.rootError}>{errors.root}</Text>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Category Name
            </Text>

            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);

                if (errors.name) {
                  setErrors((previous) => ({
                    ...previous,
                    name: undefined,
                  }));
                }
              }}
              placeholder="Example: Electronics"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              editable={!isLoading}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: errors.name ? "#dc2626" : colors.border,
                  color: colors.foreground,
                },
              ]}
            />

            {errors.name ? (
              <Text style={styles.errorText}>{errors.name}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Description
            </Text>

            <TextInput
              value={description}
              onChangeText={(value) => {
                setDescription(value);

                if (errors.description) {
                  setErrors((previous) => ({
                    ...previous,
                    description: undefined,
                  }));
                }
              }}
              placeholder="Short description about this category"
              placeholderTextColor={colors.muted}
              multiline
              editable={!isLoading}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: errors.description ? "#dc2626" : colors.border,
                  color: colors.foreground,
                },
              ]}
            />

            {errors.description ? (
              <Text style={styles.errorText}>{errors.description}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              disabled={isLoading}
              onPress={onClose}
              style={[
                styles.cancelButton,
                {
                  borderColor: colors.border,
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.foreground }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={isLoading}
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                {
                  backgroundColor: colors.accent,
                  opacity: isLoading ? 0.7 : 1,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.accentForeground}
                />
              ) : (
                <Text
                  style={[
                    styles.submitText,
                    {
                      color: colors.accentForeground,
                    },
                  ]}
                >
                  Create
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },

  title: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: "Poppins_700Bold",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  rootError: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium",
    color: "#dc2626",
  },

  field: {
    marginTop: 16,
  },

  label: {
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },

  textArea: {
    minHeight: 110,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  errorText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular",
    color: "#dc2626",
  },

  actions: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
    columnGap: 10,
  },

  cancelButton: {
    height: 46,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  submitButton: {
    height: 46,
    minWidth: 110,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  submitText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
});