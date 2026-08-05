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
  type EmploymentType,
  type UserExperienceItem,
  useCreateExperienceMutation,
  useDeleteExperienceMutation,
  useGetMyExperiencesQuery,
  useUpdateExperienceMutation,
} from "@/store/api/profileApi";

const EMPLOYMENT_TYPES: Array<{
  value: EmploymentType;
  label: string;
}> = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  {
    value: "SELF_EMPLOYED",
    label: "Self-employed",
  },
  { value: "FREELANCE", label: "Freelance" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
  {
    value: "APPRENTICESHIP",
    label: "Apprenticeship",
  },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "OTHER", label: "Other" },
];

type ExperienceForm = {
  title: string;
  organizationName: string;
  employmentType: EmploymentType | null;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

const EMPTY_FORM: ExperienceForm = {
  title: "",
  organizationName: "",
  employmentType: null,
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
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
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function ExperiencesScreen() {
  const { colors, isDark } = useAppTheme();

  const {
    data: experiences = [],
    isLoading,
  } = useGetMyExperiencesQuery();

  const [createExperience, createState] =
    useCreateExperienceMutation();

  const [updateExperience, updateState] =
    useUpdateExperienceMutation();

  const [deleteExperience] =
    useDeleteExperienceMutation();

  const [editing, setEditing] =
    useState<UserExperienceItem | null>(
      null,
    );

  const [form, setForm] =
    useState<ExperienceForm>(EMPTY_FORM);

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
    item: UserExperienceItem,
  ) => {
    setEditing(item);
    setForm({
      title: item.title,
      organizationName:
        item.organizationName,
      employmentType:
        item.employmentType,
      location: item.location ?? "",
      startDate:
        item.startDate?.slice(0, 10) ?? "",
      endDate:
        item.endDate?.slice(0, 10) ?? "",
      isCurrent: item.isCurrent,
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

    if (!form.title.trim()) {
      setErrorMessage(
        "Job title is required.",
      );
      return;
    }

    if (!form.organizationName.trim()) {
      setErrorMessage(
        "Organisation name is required.",
      );
      return;
    }

    const startDate =
      optionalText(form.startDate);
    const endDate = form.isCurrent
      ? null
      : optionalText(form.endDate);

    if (
      startDate &&
      Number.isNaN(
        new Date(startDate).getTime(),
      )
    ) {
      setErrorMessage(
        "Enter the start date as YYYY-MM-DD.",
      );
      return;
    }

    if (
      endDate &&
      Number.isNaN(new Date(endDate).getTime())
    ) {
      setErrorMessage(
        "Enter the end date as YYYY-MM-DD.",
      );
      return;
    }

    if (
      startDate &&
      endDate &&
      new Date(endDate) <
        new Date(startDate)
    ) {
      setErrorMessage(
        "End date cannot be before start date.",
      );
      return;
    }

    const body = {
      title: form.title.trim(),
      organizationName:
        form.organizationName.trim(),
      employmentType:
        form.employmentType,
      location:
        optionalText(form.location),
      startDate,
      endDate,
      isCurrent: form.isCurrent,
      description:
        optionalText(form.description),
    };

    try {
      if (editing) {
        await updateExperience({
          experienceId: editing.id,
          body,
        }).unwrap();
      } else {
        await createExperience(body).unwrap();
      }

      closeModal();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error),
      );
    }
  };

  const handleDelete = (
    item: UserExperienceItem,
  ) => {
    Alert.alert(
      "Delete experience",
      `Delete ${item.title} at ${item.organizationName}?`,
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
              await deleteExperience(
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
            Experience
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontFamily:
                "Poppins_400Regular",
            }}
          >
            Add work, freelance or volunteer history
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
          {experiences.length ? (
            <View style={{ gap: 12 }}>
              {experiences.map((item) => (
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
                        name="briefcase-outline"
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
                        {item.title}
                      </Text>

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
                        {item.organizationName}
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
                        {formatMonthYear(
                          item.startDate,
                        )}{" "}
                        –{" "}
                        {item.isCurrent
                          ? "Present"
                          : formatMonthYear(
                              item.endDate,
                            )}
                      </Text>

                      {item.location ? (
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            fontFamily:
                              "Poppins_400Regular",
                            marginTop: 2,
                          }}
                        >
                          {item.location}
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
                name="briefcase-outline"
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
                Add experience
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
                ? "Edit experience"
                : "Add experience"}
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
                <Label>Job title *</Label>

                <Input
                  value={form.title}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      title: value,
                    }))
                  }
                  placeholder="Example: Mobile Repair Technician"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>
                  Organisation name *
                </Label>

                <Input
                  value={
                    form.organizationName
                  }
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      organizationName:
                        value,
                    }))
                  }
                  placeholder="Company, institute or client"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <View>
                <Label>Employment type</Label>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {EMPLOYMENT_TYPES.map(
                    (option) => {
                      const selected =
                        form.employmentType ===
                        option.value;

                      return (
                        <Pressable
                          key={option.value}
                          onPress={() =>
                            setForm(
                              (previous) => ({
                                ...previous,
                                employmentType:
                                  option.value,
                              }),
                            )
                          }
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: selected
                              ? colors.accent
                              : colors.border,
                            backgroundColor:
                              selected
                                ? `${colors.accent}12`
                                : colors.surface,
                          }}
                        >
                          <Text
                            style={{
                              color: selected
                                ? colors.accent
                                : colors.foreground,
                              fontSize: 12,
                              fontFamily:
                                "Poppins_500Medium",
                            }}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              </View>

              <TextField>
                <Label>Location</Label>

                <Input
                  value={form.location}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      location: value,
                    }))
                  }
                  placeholder="Example: Kathmandu, Nepal"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField>
                <Label>Start date</Label>

                <Input
                  value={form.startDate}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      startDate: value,
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <TextField
                isDisabled={form.isCurrent}
              >
                <Label>End date</Label>

                <Input
                  value={form.endDate}
                  onChangeText={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      endDate: value,
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                  className="border-field-border bg-field-background"
                />
              </TextField>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
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
                  I currently work here
                </Text>

                <Switch
                  value={form.isCurrent}
                  onValueChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      isCurrent: value,
                      ...(value
                        ? { endDate: "" }
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
                  placeholder="Responsibilities, projects or achievements"
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
                  : "Save experience"}
              </Button.Label>
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}