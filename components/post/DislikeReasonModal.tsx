import React, { memo, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";

type DislikeReasonModalProps = {
  visible: boolean;
  reason: string;
  errorText?: string | null;
  isSubmitting?: boolean;
  onChangeReason: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

const MAX_REASON_LENGTH = 250;

const DislikeReasonModal = memo(function DislikeReasonModal({
  visible,
  reason,
  errorText,
  isSubmitting = false,
  onChangeReason,
  onClose,
  onSubmit,
}: DislikeReasonModalProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  // Manually track keyboard height.
  // KeyboardAvoidingView breaks on Android edgeToEdgeEnabled:true because
  // the system reports keyboard height INCLUDING the nav bar inset,
  // causing double-offset. We subtract insets.bottom to correct it.
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardOffset(0);
      return;
    }

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: any) => {
      const kbHeight = e.endCoordinates.height;
      // On Android edge-to-edge, subtract insets.bottom to avoid double-counting nav bar
      const corrected = Platform.OS === "android"
        ? Math.max(0, kbHeight - insets.bottom)
        : kbHeight;
      setKeyboardOffset(corrected);
    };

    const onHide = () => setKeyboardOffset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, insets.bottom]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    Keyboard.dismiss();
    onClose();
  }, [isSubmitting, onClose]);

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    onSubmit();
  }, [onSubmit]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Full screen container */}
      <View style={styles.flex}>
        {/* Backdrop tap to close */}
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          disabled={isSubmitting}
        />

        {/* Card pushed up by keyboard manually */}
        <View style={[styles.sheetArea, { marginBottom: keyboardOffset }]}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  // When keyboard is hidden, respect nav bar inset.
                  // When keyboard is shown, we already pushed up via marginBottom.
                  paddingBottom: keyboardOffset > 0
                    ? 20
                    : Math.max(insets.bottom, Platform.OS === "ios" ? 28 : 20),
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.surfaceSecondary },
                    ]}
                  >
                    <Ionicons
                      name="arrow-down-circle-outline"
                      size={22}
                      color={colors.danger}
                    />
                  </View>

                  <View style={styles.titleContent}>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                      Dislike this post?
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.muted }]}>
                      Please explain why this post was not useful.
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={isSubmitting}
                  onPress={handleClose}
                  hitSlop={10}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={22} color={colors.muted} />
                </Pressable>
              </View>

              {/* Text input */}
              <TextInput
                value={reason}
                onChangeText={(value) =>
                  onChangeReason(value.slice(0, MAX_REASON_LENGTH))
                }
                placeholder="Write your reason..."
                placeholderTextColor={colors.placeholder}
                editable={!isSubmitting}
                multiline
                maxLength={MAX_REASON_LENGTH}
                textAlignVertical="top"
                returnKeyType="default"
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: errorText ? colors.danger : colors.border,
                    backgroundColor: colors.surfaceSecondary,
                  },
                ]}
              />

              {/* Helper row */}
              <View style={styles.helperRow}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.errorText,
                    { color: errorText ? colors.danger : colors.muted },
                  ]}
                >
                  {errorText ?? "Your feedback helps improve post quality."}
                </Text>
                <Text style={[styles.counter, { color: colors.muted }]}>
                  {reason.length}/{MAX_REASON_LENGTH}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  disabled={isSubmitting}
                  onPress={handleClose}
                  style={[
                    styles.cancelButton,
                    {
                      borderColor: colors.border,
                      opacity: isSubmitting ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.cancelText, { color: colors.foreground }]}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: colors.danger,
                      opacity: isSubmitting ? 0.7 : 1,
                    },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons
                        name="arrow-down-circle-outline"
                        size={17}
                        color="#ffffff"
                      />
                      <Text style={styles.submitText}>Submit dislike</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },

  sheetArea: {
    maxHeight: "92%",
    justifyContent: "flex-end",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },

  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    // paddingBottom set dynamically above based on keyboard/insets
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },

  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  titleContent: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    minHeight: 105,
    maxHeight: 125,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
  },

  helperRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  errorText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: "Poppins_400Regular",
  },

  counter: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  cancelButton: {
    flex: 1,
    height: 47,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  submitButton: {
    flex: 1.35,
    height: 47,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  submitText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
});

export default DislikeReasonModal;