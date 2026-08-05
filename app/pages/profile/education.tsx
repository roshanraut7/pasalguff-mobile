import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
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
  type UserEducationItem,
  useCreateEducationMutation,
  useDeleteEducationMutation,
  useGetMyEducationQuery,
  useUpdateEducationMutation,
} from "@/store/api/profileApi";

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

type EducationForm = {
  institutionName: string;
  qualification: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  isCurrentlyStudying: boolean;
  description: string;
};

const EMPTY_FORM: EducationForm = {
  institutionName: "",
  qualification: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
  isCurrentlyStudying: false,
  description: "",
};

function optionalText(value: string) {
  return value.trim() || null;
}

function optionalYear(value: string) {
  return value.trim()
    ? Number(value)
    : null;
}

export default function EducationScreen() {
  const { colors, isDark } = useAppTheme();

  const {
    data: education = [],
    isLoading,
  } = useGetMyEducationQuery();

  const [createEducation, createState] =
    useCreateEducationMutation();

  const [updateEducation, updateState] =
    useUpdateEducationMutation();

  const [deleteEducation] =
    useDeleteEducationMutation();

  const [editing, setEditing] =
    useState<UserEducationItem | null>(
      null,
    );

  const [modalVisible, setModalVisible] =
    useState(false);

  const [form, setForm] =
    useState<EducationForm>(EMPTY_FORM);

  const [errorMessage, setErrorMessage] =
    useState("");

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setModalVisible(true);
  };

  const openEdit = (
    item: UserEducationItem,
  ) => {
    setEditing(item);
    setForm({
      institutionName:
        item.institutionName,
      qualification:
        item.qualification ?? "",
      fieldOfStudy:
        item.fieldOfStudy ?? "",
      startYear:
        item.startYear?.toString() ?? "",
      endYear:
        item.endYear?.toString() ?? "",
      isCurrentlyStudying:
        item.isCurrentlyStudying,
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

    if (!form.institutionName.trim()) {
      setErrorMessage(
        "Institution name is required.",
      );
      return;
    }

    const startYear =
      optionalYear(form.startYear);
    const endYear =
      form.isCurrentlyStudying
        ? null
        : optionalYear(form.endYear);

    const years = [
      ["Start year", startYear],
      ["End year", endYear],
    ] as const;

    for (const [label, value] of years) {
      if (
        value !== null &&
        (!Number.isInteger(value) ||
          value < 1900 ||
          value > 2100)
      ) {
        setErrorMessage(
          `${label} must be between 1900 and 2100.`,
        );
        return;
      }
    }

    if (
      startYear !== null &&
      endYear !== null &&
      endYear < startYear
    ) {
      setErrorMessage(
        "End year cannot be before start year.",
      );
      return;
    }

    const body = {
      institutionName:
        form.institutionName.trim(),
      qualification:
        optionalText(form.qualification),
      fieldOfStudy:
        optionalText(form.fieldOfStudy),
      startYear,
      endYear,
      isCurrentlyStudying:
        form.isCurrentlyStudying,
      description:
        optionalText(form.description),
    };

    try {
      if (editing) {
        await updateEducation({
          educationId: editing.id,
          body,
        }).unwrap();
      } else {
        await createEducation(body).unwrap();
      }

      closeModal();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error),
      );
    }
  };

  const handleDelete = (
    item: UserEducationItem,
  ) => {
    Alert.alert(
      "Delete education",
      `Delete ${item.institutionName}?`,
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
              await deleteEducation(
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
            Education
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontFamily:
                "Poppins_400Regular",
            }}
          >
            Add schools and qualifications
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
          {education.length ? (
            <View style={{ gap: 12 }}>
              {education.map((item) => (
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
                        name="school-outline"
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
                        {item.qualification ||
                          item.institutionName}
                      </Text>

                      {item.qualification ? (
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
                          {item.institutionName}
                        </Text>
                      ) : null}

                      {item.fieldOfStudy ? (
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            fontFamily:
                              "Poppins_400Regular",
                            marginTop: 3,
                          }}
                        >
                          {item.fieldOfStudy}
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
                        {item.startYear ?? "—"} –{" "}
                        {item.isCurrentlyStudying
                          ? "Present"
                          : item.endYear ?? "—"}
                      </Text>
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

                  {item.description ? (
                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: 12,
                        lineHeight: 18,
                        fontFamily:
                          "Poppins_400Regular",
                        marginTop: 12,
                      }}
                    >
                      {item.description}
                    </Text>
                  ) : null}
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
                name="school-outline"
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
                Add your education
              </Text>

              <Text
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  fontFamily:
                    "Poppins_400Regular",
                  marginTop: 4,
                }}
              >
                Add a school, college or qualification
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
                ? "Edit education"
                : "Add education"}
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
                  Institution name *
                </Label>

                <Input
                  value={
                    form.institutionName
                  }
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      institutionName:
                        value,
                    }))
                  }
                  placeholder="University or college"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>Qualification</Label>

                <Input
                  value={
                    form.qualification
                  }
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      qualification: value,
                    }))
                  }
                  placeholder="Example: MSc Cybersecurity"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>Field of study</Label>

                <Input
                  value={form.fieldOfStudy}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      fieldOfStudy: value,
                    }))
                  }
                  placeholder="Example: Cybersecurity"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                <TextField
                  style={{ flex: 1 }}
                >
                  <Label>Start year</Label>

                  <Input
                    value={form.startYear}
                    onChangeText={(value) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          startYear: value,
                        }),
                      )
                    }
                    placeholder="2024"
                    keyboardType="number-pad"
                    className="border-field-border bg-field-background"
                  />
                </TextField>

                <TextField
                  style={{ flex: 1 }}
                  isDisabled={
                    form.isCurrentlyStudying
                  }
                >
                  <Label>End year</Label>

                  <Input
                    value={form.endYear}
                    onChangeText={(value) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          endYear: value,
                        }),
                      )
                    }
                    placeholder="2026"
                    keyboardType="number-pad"
                    className="border-field-border bg-field-background"
                  />
                </TextField>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    color:
                      colors.foreground,
                    fontSize: 14,
                    fontFamily:
                      "Poppins_500Medium",
                  }}
                >
                  I currently study here
                </Text>

                <Switch
                  value={
                    form.isCurrentlyStudying
                  }
                  onValueChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      isCurrentlyStudying:
                        value,
                      ...(value
                        ? { endYear: "" }
                        : {}),
                    }))
                  }
                  trackColor={{
                    true: colors.accent,
                  }}
                />
              </View>

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
                  placeholder="Activities, achievements or details"
                  multiline
                  numberOfLines={5}
                  style={{
                    minHeight: 110,
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
                  : "Save education"}
              </Button.Label>
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}