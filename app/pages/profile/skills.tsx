import React, {
  useMemo,
  useState,
} from "react";
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
  type SkillOption,
  type UserSkillItem,
  useCreateUserSkillMutation,
  useDeleteUserSkillMutation,
  useGetAvailableSkillsQuery,
  useGetMySkillsQuery,
  useUpdateUserSkillMutation,
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

export default function SkillsScreen() {
  const { colors, isDark } = useAppTheme();

  const {
    data: mySkills = [],
    isLoading,
  } = useGetMySkillsQuery();

  const [search, setSearch] = useState("");

  const {
    data: availableSkills = [],
    isLoading: skillsLoading,
    isError: skillCatalogueError,
  } = useGetAvailableSkillsQuery(search);

  const [createUserSkill, createState] =
    useCreateUserSkillMutation();

  const [updateUserSkill, updateState] =
    useUpdateUserSkillMutation();

  const [deleteUserSkill] =
    useDeleteUserSkillMutation();

  const [selectedSkill, setSelectedSkill] =
    useState<SkillOption | null>(null);

  const [editingSkill, setEditingSkill] =
    useState<UserSkillItem | null>(null);

  const [yearsExperience, setYearsExperience] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const existingSkillIds = useMemo(
    () =>
      new Set(
        mySkills.map(
          (item) => item.skill.id,
        ),
      ),
    [mySkills],
  );

  const visibleAvailableSkills = useMemo(
    () =>
      availableSkills.filter(
        (skill) =>
          !existingSkillIds.has(skill.id),
      ),
    [availableSkills, existingSkillIds],
  );

  const openAddModal = (skill: SkillOption) => {
    setErrorMessage("");
    setSelectedSkill(skill);
    setEditingSkill(null);
    setYearsExperience("");
  };

  const openEditModal = (
    item: UserSkillItem,
  ) => {
    setErrorMessage("");
    setEditingSkill(item);
    setSelectedSkill(null);
    setYearsExperience(
      item.yearsExperience?.toString() ?? "",
    );
  };

  const closeModal = () => {
    if (
      createState.isLoading ||
      updateState.isLoading
    ) {
      return;
    }

    setSelectedSkill(null);
    setEditingSkill(null);
    setYearsExperience("");
    setErrorMessage("");
  };

  const handleSave = async () => {
    setErrorMessage("");

    const years = yearsExperience.trim()
      ? Number(yearsExperience)
      : null;

    if (
      years !== null &&
      (!Number.isInteger(years) ||
        years < 0 ||
        years > 80)
    ) {
      setErrorMessage(
        "Years of experience must be a whole number between 0 and 80.",
      );
      return;
    }

    try {
      if (editingSkill) {
        await updateUserSkill({
          userSkillId: editingSkill.id,
          body: {
            yearsExperience: years,
          },
        }).unwrap();
      } else if (selectedSkill) {
        await createUserSkill({
          skillId: selectedSkill.id,
          yearsExperience: years,
        }).unwrap();
      }

      closeModal();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error),
      );
    }
  };

  const handleDelete = (
    item: UserSkillItem,
  ) => {
    Alert.alert(
      "Remove skill",
      `Remove ${item.skill.name} from your profile?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserSkill(
                item.id,
              ).unwrap();
            } catch (error) {
              Alert.alert(
                "Unable to remove",
                getApiErrorMessage(error),
              );
            }
          },
        },
      ],
    );
  };

  const modalVisible =
    Boolean(selectedSkill) ||
    Boolean(editingSkill);

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
            Skills
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontFamily:
                "Poppins_400Regular",
            }}
          >
            Add the work you can perform
          </Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
      >
        <Text
          style={{
            color: colors.foreground,
            fontSize: 15,
            fontFamily: "Poppins_700Bold",
            marginTop: 8,
            marginBottom: 12,
          }}
        >
          Your skills
        </Text>

        {isLoading ? (
          <ActivityIndicator
            color={colors.accent}
          />
        ) : mySkills.length ? (
          <View style={{ gap: 10 }}>
            {mySkills.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor:
                      `${colors.accent}12`,
                  }}
                >
                  <Ionicons
                    name="construct-outline"
                    size={20}
                    color={colors.accent}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 14,
                      fontFamily:
                        "Poppins_600SemiBold",
                    }}
                  >
                    {item.skill.name}
                  </Text>

                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      fontFamily:
                        "Poppins_400Regular",
                      marginTop: 2,
                    }}
                  >
                    {item.yearsExperience ==
                    null
                      ? "Experience not specified"
                      : `${item.yearsExperience} ${
                          item.yearsExperience ===
                          1
                            ? "year"
                            : "years"
                        } of experience`}
                  </Text>
                </View>

                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    openEditModal(item)
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
            ))}
          </View>
        ) : (
          <View
            style={{
              padding: 20,
              borderRadius: 18,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.border,
              alignItems: "center",
            }}
          >
            <Ionicons
              name="construct-outline"
              size={34}
              color={colors.muted}
            />

            <Text
              style={{
                color: colors.muted,
                fontSize: 13,
                fontFamily:
                  "Poppins_500Medium",
                marginTop: 8,
              }}
            >
              No skills added yet
            </Text>
          </View>
        )}

        <Text
          style={{
            color: colors.foreground,
            fontSize: 15,
            fontFamily: "Poppins_700Bold",
            marginTop: 26,
            marginBottom: 12,
          }}
        >
          Add a skill
        </Text>

        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search skills"
          className="border-field-border bg-field-background"
        />

        {skillsLoading ? (
          <View style={{ paddingVertical: 26 }}>
            <ActivityIndicator
              color={colors.accent}
            />
          </View>
        ) : skillCatalogueError ? (
          <View
            style={{
              padding: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              marginTop: 14,
            }}
          >
            <Text
              style={{
                color: colors.danger,
                fontSize: 13,
                lineHeight: 20,
                fontFamily:
                  "Poppins_500Medium",
              }}
            >
              The frontend needs a backend GET /skills endpoint to search the central Skill table.
            </Text>
          </View>
        ) : (
          <View
            style={{
              gap: 9,
              marginTop: 14,
            }}
          >
            {visibleAvailableSkills.map(
              (skill) => (
                <Pressable
                  key={skill.id}
                  onPress={() =>
                    openAddModal(skill)
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 13,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: colors.foreground,
                      fontSize: 13,
                      fontFamily:
                        "Poppins_500Medium",
                    }}
                  >
                    {skill.name}
                  </Text>

                  <Ionicons
                    name="add-circle-outline"
                    size={21}
                    color={colors.accent}
                  />
                </Pressable>
              ),
            )}

            {!visibleAvailableSkills.length &&
            !skillCatalogueError ? (
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 12,
                  fontFamily:
                    "Poppins_400Regular",
                  textAlign: "center",
                  paddingVertical: 20,
                }}
              >
                No more matching skills
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable
          onPress={closeModal}
          style={{
            flex: 1,
            backgroundColor:
              "rgba(0,0,0,0.5)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            onPress={(event) =>
              event.stopPropagation()
            }
            style={{
              borderRadius: 24,
              padding: 20,
              backgroundColor:
                colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 17,
                fontFamily:
                  "Poppins_700Bold",
              }}
            >
              {editingSkill
                ? "Edit skill"
                : "Add skill"}
            </Text>

            <Text
              style={{
                color: colors.muted,
                fontSize: 13,
                fontFamily:
                  "Poppins_500Medium",
                marginTop: 5,
              }}
            >
              {editingSkill?.skill.name ??
                selectedSkill?.name}
            </Text>

            <TextField
              style={{ marginTop: 18 }}
            >
              <Label>
                Years of experience
              </Label>

              <Input
                value={yearsExperience}
                onChangeText={
                  setYearsExperience
                }
                placeholder="Example: 3"
                keyboardType="number-pad"
                className="border-field-border bg-field-background"
              />
            </TextField>

            {errorMessage ? (
              <Text
                style={{
                  color: colors.danger,
                  fontSize: 12,
                  lineHeight: 18,
                  fontFamily:
                    "Poppins_500Medium",
                  marginTop: 12,
                }}
              >
                {errorMessage}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Button
                variant="outline"
                onPress={closeModal}
                className="flex-1 rounded-full"
              >
                <Button.Label>
                  Cancel
                </Button.Label>
              </Button>

              <Button
                onPress={handleSave}
                isDisabled={
                  createState.isLoading ||
                  updateState.isLoading
                }
                className="flex-1 bg-accent rounded-full"
              >
                <Button.Label className="text-accent-foreground">
                  {createState.isLoading ||
                  updateState.isLoading
                    ? "Saving..."
                    : "Save"}
                </Button.Label>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}