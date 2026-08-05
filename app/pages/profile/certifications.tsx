import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Input,
  Label,
  TextField,
} from "heroui-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import {
  type UserCertificationItem,
  useCreateCertificationMutation,
  useDeleteCertificationMutation,
  useGetMyCertificationsQuery,
  useUpdateCertificationMutation,
} from "@/store/api/profileApi";

type CertificationForm = {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate: string;
  credentialId: string;
  credentialUrl: string;
  description: string;
};

const EMPTY_FORM: CertificationForm = {
  name: "",
  issuingOrganization: "",
  issueDate: "",
  expiryDate: "",
  credentialId: "",
  credentialUrl: "",
  description: "",
};

function optionalText(value: string) {
  return value.trim() || null;
}

function getApiErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (error as {
      data?: {
        message?: string | string[];
      };
    }).data;

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }

    if (typeof data?.message === "string") {
      return data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}

function formatMonthYear(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function CertificationsScreen() {
  const { colors, isDark } = useAppTheme();

  const {
    data: certifications = [],
    isLoading,
  } = useGetMyCertificationsQuery();

  const [createCertification, createState] =
    useCreateCertificationMutation();

  const [
    updateCertification,
    updateState,
  ] = useUpdateCertificationMutation();

  const [deleteCertification] =
    useDeleteCertificationMutation();

  const [editing, setEditing] =
    useState<UserCertificationItem | null>(
      null,
    );

  const [form, setForm] =
    useState<CertificationForm>(
      EMPTY_FORM,
    );

  const [modalVisible, setModalVisible] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setModalVisible(true);
  };

  const openEdit = (
    item: UserCertificationItem,
  ) => {
    setEditing(item);
    setForm({
      name: item.name,
      issuingOrganization:
        item.issuingOrganization ?? "",
      issueDate:
        item.issueDate?.slice(0, 10) ?? "",
      expiryDate:
        item.expiryDate?.slice(0, 10) ?? "",
      credentialId:
        item.credentialId ?? "",
      credentialUrl:
        item.credentialUrl ?? "",
      description:
        item.description ?? "",
    });
    setErrorMessage("");
    setModalVisible(true);
  };

  const closeModal = () => {
    if (
      createState.isLoading ||
      updateState.isLoading
    ) {
      return;
    }

    setModalVisible(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
  };

  const handleSave = async () => {
    setErrorMessage("");

    if (!form.name.trim()) {
      setErrorMessage(
        "Certification name is required.",
      );
      return;
    }

    const issueDate =
      optionalText(form.issueDate);
    const expiryDate =
      optionalText(form.expiryDate);

    if (
      issueDate &&
      Number.isNaN(
        new Date(issueDate).getTime(),
      )
    ) {
      setErrorMessage(
        "Enter the issue date as YYYY-MM-DD.",
      );
      return;
    }

    if (
      expiryDate &&
      Number.isNaN(
        new Date(expiryDate).getTime(),
      )
    ) {
      setErrorMessage(
        "Enter the expiry date as YYYY-MM-DD.",
      );
      return;
    }

    if (
      issueDate &&
      expiryDate &&
      new Date(expiryDate) <
        new Date(issueDate)
    ) {
      setErrorMessage(
        "Expiry date cannot be before issue date.",
      );
      return;
    }

    const body = {
      name: form.name.trim(),
      issuingOrganization:
        optionalText(
          form.issuingOrganization,
        ),
      issueDate,
      expiryDate,
      credentialId:
        optionalText(form.credentialId),
      credentialUrl:
        optionalText(form.credentialUrl),
      description:
        optionalText(form.description),
    };

    try {
      if (editing) {
        await updateCertification({
          certificationId: editing.id,
          body,
        }).unwrap();
      } else {
        await createCertification(
          body,
        ).unwrap();
      }

      closeModal();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error),
      );
    }
  };

  const handleDelete = (
    item: UserCertificationItem,
  ) => {
    Alert.alert(
      "Delete certification",
      `Delete ${item.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCertification(
                item.id,
              ).unwrap();
            } catch (error) {
              Alert.alert(
                "Unable to delete",
                getApiErrorMessage(error),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <StatusBar
        barStyle={
          isDark
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={colors.background}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Pressable
          hitSlop={10}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={25}
            color={colors.foreground}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 20,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Certifications
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontFamily:
                "Poppins_400Regular",
            }}
          >
            Add certificates and licences
          </Text>
        </View>

        <Pressable
          hitSlop={8}
          onPress={openCreate}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.accent,
          }}
        >
          <Ionicons
            name="add"
            size={23}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
          }}
        >
          {certifications.length ? (
            <View style={{ gap: 12 }}>
              {certifications.map((item) => (
                <View
                  key={item.id}
                  style={{
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor:
                          `${colors.accent}12`,
                      }}
                    >
                      <Ionicons
                        name="ribbon-outline"
                        size={21}
                        color={colors.accent}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color:
                            colors.foreground,
                          fontSize: 14,
                          fontFamily:
                            "Poppins_700Bold",
                        }}
                      >
                        {item.name}
                      </Text>

                      {item.issuingOrganization ? (
                        <Text
                          style={{
                            color:
                              colors.foreground,
                            fontSize: 13,
                            fontFamily:
                              "Poppins_400Regular",
                            marginTop: 2,
                          }}
                        >
                          {
                            item.issuingOrganization
                          }
                        </Text>
                      ) : null}

                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 12,
                          fontFamily:
                            "Poppins_400Regular",
                          marginTop: 4,
                        }}
                      >
                        {item.issueDate
                          ? `Issued ${formatMonthYear(
                              item.issueDate,
                            )}`
                          : "Issue date not added"}
                        {item.expiryDate
                          ? ` • Expires ${formatMonthYear(
                              item.expiryDate,
                            )}`
                          : ""}
                      </Text>

                      {item.credentialId ? (
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            fontFamily:
                              "Poppins_400Regular",
                            marginTop: 3,
                          }}
                        >
                          ID: {item.credentialId}
                        </Text>
                      ) : null}
                    </View>

                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        openEdit(item)
                      }
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={19}
                        color={colors.accent}
                      />
                    </Pressable>

                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        handleDelete(item)
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color={colors.danger}
                      />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Pressable
              onPress={openCreate}
              style={{
                alignItems: "center",
                paddingVertical: 44,
                borderRadius: 22,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.border,
              }}
            >
              <Ionicons
                name="ribbon-outline"
                size={40}
                color={colors.muted}
              />

              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 15,
                  fontFamily:
                    "Poppins_600SemiBold",
                  marginTop: 10,
                }}
              >
                Add certification
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor:
              colors.background,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Pressable
              hitSlop={10}
              onPress={closeModal}
            >
              <Ionicons
                name="close"
                size={25}
                color={colors.foreground}
              />
            </Pressable>

            <Text
              style={{
                flex: 1,
                color: colors.foreground,
                fontSize: 18,
                fontFamily:
                  "Poppins_700Bold",
                marginLeft: 12,
              }}
            >
              {editing
                ? "Edit certification"
                : "Add certification"}
            </Text>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 130,
            }}
          >
            <View style={{ gap: 16 }}>
              <TextField>
                <Label>
                  Certification name *
                </Label>

                <Input
                  value={form.name}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      name: value,
                    }))
                  }
                  placeholder="Example: CompTIA Security+"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>
                  Issuing organisation
                </Label>

                <Input
                  value={
                    form.issuingOrganization
                  }
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      issuingOrganization:
                        value,
                    }))
                  }
                  placeholder="Example: CompTIA"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>Issue date</Label>

                <Input
                  value={form.issueDate}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      issueDate: value,
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>Expiry date</Label>

                <Input
                  value={form.expiryDate}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      expiryDate: value,
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>Credential ID</Label>

                <Input
                  value={form.credentialId}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      credentialId: value,
                    }))
                  }
                  placeholder="Certificate or credential ID"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>
                  Credential URL
                </Label>

                <Input
                  value={form.credentialUrl}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      credentialUrl: value,
                    }))
                  }
                  placeholder="https://..."
                  keyboardType="url"
                  autoCapitalize="none"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>Description</Label>

                <Input
                  value={form.description}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      description: value,
                    }))
                  }
                  placeholder="Optional certificate details"
                  multiline
                  numberOfLines={4}
                  style={{
                    minHeight: 100,
                    textAlignVertical: "top",
                  }}
                  className="border-field-border bg-field-background"
                />
              </TextField>
            </View>

            {errorMessage ? (
              <Text
                style={{
                  color: colors.danger,
                  fontSize: 13,
                  lineHeight: 20,
                  fontFamily:
                    "Poppins_500Medium",
                  marginTop: 16,
                }}
              >
                {errorMessage}
              </Text>
            ) : null}
          </ScrollView>

          <View
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              bottom: 16,
              backgroundColor:
                colors.background,
            }}
          >
            <Button
              onPress={handleSave}
              isDisabled={
                createState.isLoading ||
                updateState.isLoading
              }
              className="bg-accent rounded-full"
            >
              <Button.Label className="text-accent-foreground">
                {createState.isLoading ||
                updateState.isLoading
                  ? "Saving..."
                  : "Save certification"}
              </Button.Label>
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}