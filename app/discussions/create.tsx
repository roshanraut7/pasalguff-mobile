import React, {
  useEffect,
  useMemo,
  useState,
   useRef, 
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { useAppTheme } from "@/hooks/useAppTheme";
import { AppRichTextEditor, useCreateEditor } from "@/components/editor/editor";
import {
  useCreateCommunityDiscussionMutation,
} from "@/store/api/communityDiscussionApi";
import { useGetMyCommunitiesQuery } from "@/store/api/communityApi";
import {
  useScheduleLiveDiscussionMutation,
  useStartLiveDiscussionMutation,
} from "@/store/api/communityDiscussionLiveApi";
import {CommunityPickerSheet  } from "@/components/post/Postpickermodals";
import { BottomSheetModal } from "@gorhom/bottom-sheet";


type CommunityWithPurpose = {
  id: string;
  name: string;
  visibility?: string;
  purpose?: string;
};

type LiveMode = "NONE" | "SCHEDULE" | "START_NOW";

function getParamValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "message" in error.data
  ) {
    const message = error.data.message;

    if (Array.isArray(message)) {
      return message.join("\n");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return "Please try again.";
}

function getDefaultScheduledDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function getDefaultEndDate(startDate?: Date | null) {
  const baseDate = startDate ?? getDefaultScheduledDate();
  const endDate = new Date(baseDate);
  endDate.setHours(endDate.getHours() + 1);
  endDate.setSeconds(0);
  endDate.setMilliseconds(0);
  return endDate;
}

function formatScheduleDate(value: Date | null) {
  if (!value) return "Select date and time";

  return value.toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CreateDiscussionScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    communityId?: string | string[];
    communityName?: string | string[];
  }>();

  const paramCommunityId = getParamValue(params.communityId);
  const paramCommunityName = getParamValue(params.communityName);

  const editor = useCreateEditor();

  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("<p></p>");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [liveMode, setLiveMode] = useState<LiveMode>("NONE");

  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [scheduledEndAt, setScheduledEndAt] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [communitySearch, setCommunitySearch] = useState("");
 const communitySheetRef = useRef<BottomSheetModal>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState(
    paramCommunityId ?? "",
  );

  const { data: communitiesResponse, isLoading: isLoadingCommunities } =
    useGetMyCommunitiesQuery({ page: 1, limit: 50 });

  const allJoinedCommunities =
    (communitiesResponse?.data ?? []) as CommunityWithPurpose[];

  const officialCommunity = useMemo(
    () =>
      allJoinedCommunities.find(
        (community) => community.purpose === "DISTRICT_OFFICIAL",
      ),
    [allJoinedCommunities],
  );

  const communities = useMemo(
    () =>
      allJoinedCommunities.filter(
        (community) => community.purpose !== "DISTRICT_OFFICIAL",
      ),
    [allJoinedCommunities],
  );

  useEffect(() => {
    if (paramCommunityId) {
      setSelectedCommunityId(paramCommunityId);
    }
  }, [paramCommunityId]);

  useEffect(() => {
    if (isLoadingCommunities) return;

    if (selectedCommunityId) {
      const selectedCommunityStillExists = communities.some(
        (community) => community.id === selectedCommunityId,
      );

      const isOfficialSelected = officialCommunity?.id === selectedCommunityId;

      if (selectedCommunityStillExists || isOfficialSelected) {
        return;
      }
    }

    if (communities.length > 0) {
      setSelectedCommunityId(communities[0].id);
      return;
    }

    if (officialCommunity) {
      setSelectedCommunityId(officialCommunity.id);
      return;
    }

    setSelectedCommunityId("");
  }, [
    communities,
    officialCommunity,
    isLoadingCommunities,
    selectedCommunityId,
  ]);

  const selectedCommunity = useMemo(
    () =>
      communities.find((community) => community.id === selectedCommunityId) ??
      officialCommunity,
    [communities, officialCommunity, selectedCommunityId],
  );

  const filteredCommunities = useMemo(() => {
    const q = communitySearch.trim().toLowerCase();

    if (!q) return communities;

    return communities.filter((community) =>
      community.name.toLowerCase().includes(q),
    );
  }, [communities, communitySearch]);

  const targetCommunityId = selectedCommunity?.id ?? "";
  const targetCommunityName =
    selectedCommunity?.name ?? paramCommunityName ?? "";

  const [createDiscussion, { isLoading: isCreatingDiscussion }] =
    useCreateCommunityDiscussionMutation();

  const [scheduleLiveDiscussion, { isLoading: isSchedulingLive }] =
    useScheduleLiveDiscussionMutation();

  const [startLiveDiscussion, { isLoading: isStartingLive }] =
    useStartLiveDiscussionMutation();

  const plainText = stripHtml(html);

  const isBusy =
    isSubmitting ||
    isCreatingDiscussion ||
    isSchedulingLive ||
    isStartingLive;

  const isScheduleValid =
    liveMode !== "SCHEDULE" ||
    Boolean(
      scheduledAt &&
        scheduledEndAt &&
        scheduledAt > new Date() &&
        scheduledEndAt > scheduledAt,
    );

  const canStart =
    title.trim().length > 0 &&
    plainText.length > 0 &&
    Boolean(targetCommunityId) &&
    isScheduleValid &&
    !isBusy;

  const closeAllPickers = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
  };

  const activateScheduleMode = () => {
    setLiveMode("SCHEDULE");

    if (!scheduledAt) {
      const start = getDefaultScheduledDate();
      const end = getDefaultEndDate(start);

      setScheduledAt(start);
      setScheduledEndAt(end);
    }

    if (scheduledAt && !scheduledEndAt) {
      setScheduledEndAt(getDefaultEndDate(scheduledAt));
    }
  };

  const activateNormalMode = () => {
    setLiveMode("NONE");
    closeAllPickers();
  };

  const activateStartNowMode = () => {
    setLiveMode("START_NOW");
    closeAllPickers();
  };

  const openDatePicker = () => {
    if (!scheduledAt) {
      const start = getDefaultScheduledDate();
      setScheduledAt(start);
      setScheduledEndAt(getDefaultEndDate(start));
    }

    setShowTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    if (!scheduledAt) {
      const start = getDefaultScheduledDate();
      setScheduledAt(start);
      setScheduledEndAt(getDefaultEndDate(start));
    }

    setShowDatePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
    setShowTimePicker(true);
  };

  const openEndDatePicker = () => {
    if (!scheduledEndAt) {
      setScheduledEndAt(getDefaultEndDate(scheduledAt));
    }

    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowEndTimePicker(false);
    setShowEndDatePicker(true);
  };

  const openEndTimePicker = () => {
    if (!scheduledEndAt) {
      setScheduledEndAt(getDefaultEndDate(scheduledAt));
    }

    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(true);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) return;

    const baseDate = scheduledAt ?? getDefaultScheduledDate();

    const nextDate = new Date(baseDate);
    nextDate.setFullYear(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
    );

    setScheduledAt(nextDate);

    if (!scheduledEndAt || scheduledEndAt <= nextDate) {
      setScheduledEndAt(getDefaultEndDate(nextDate));
    }

    if (Platform.OS === "android") {
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (event.type === "dismissed" || !selectedTime) return;

    const baseDate = scheduledAt ?? getDefaultScheduledDate();

    const nextDate = new Date(baseDate);
    nextDate.setHours(selectedTime.getHours());
    nextDate.setMinutes(selectedTime.getMinutes());
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);

    setScheduledAt(nextDate);

    if (!scheduledEndAt || scheduledEndAt <= nextDate) {
      setScheduledEndAt(getDefaultEndDate(nextDate));
    }
  };

  const handleEndDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowEndDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) return;

    const baseDate =
      scheduledEndAt ?? getDefaultEndDate(scheduledAt);

    const nextDate = new Date(baseDate);
    nextDate.setFullYear(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
    );

    setScheduledEndAt(nextDate);

    if (Platform.OS === "android") {
      setShowEndTimePicker(true);
    }
  };

  const handleEndTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowEndTimePicker(false);
    }

    if (event.type === "dismissed" || !selectedTime) return;

    const baseDate =
      scheduledEndAt ?? getDefaultEndDate(scheduledAt);

    const nextDate = new Date(baseDate);
    nextDate.setHours(selectedTime.getHours());
    nextDate.setMinutes(selectedTime.getMinutes());
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);

    setScheduledEndAt(nextDate);
  };

  const openCommunityPicker = () => {
    if (isLoadingCommunities) return;

    if (communities.length === 0) {
      if (officialCommunity) {
        Alert.alert(
          "Auto district community",
          "Your official district community is hidden from the selector but will be used automatically.",
        );
        return;
      }

      Alert.alert(
        "Community not found",
        "You are not connected to any community where a discussion can be created.",
      );
      return;
    }
communitySheetRef.current?.present();
  };

  const startDiscussion = async () => {
    const cleanTitle = title.trim();
    const cleanBody = plainText.trim();

    if (!cleanTitle || !cleanBody) {
      Alert.alert(
        "Missing information",
        "Please write a title and description before starting the discussion.",
      );
      return;
    }

    if (!targetCommunityId) {
      Alert.alert(
        "Community missing",
        "Please select a community before starting a discussion.",
      );
      return;
    }

    if (liveMode === "SCHEDULE") {
      if (!scheduledAt || !scheduledEndAt) {
        Alert.alert(
          "Schedule required",
          "Please choose both start time and end time for the live discussion.",
        );
        return;
      }

      if (scheduledAt <= new Date()) {
        Alert.alert(
          "Invalid start time",
          "Scheduled live discussion start time must be in the future.",
        );
        return;
      }

      if (scheduledEndAt <= scheduledAt) {
        Alert.alert(
          "Invalid end time",
          "Live discussion end time must be after the start time.",
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const response = await createDiscussion({
        communityId: targetCommunityId,
        title: cleanTitle,
        body: cleanBody,
      }).unwrap();

      const discussionId = response.data.id;

      if (liveMode === "SCHEDULE" && scheduledAt && scheduledEndAt) {
        await scheduleLiveDiscussion({
          communityId: targetCommunityId,
          discussionId,
          scheduledAt: scheduledAt.toISOString(),
          scheduledEndAt: scheduledEndAt.toISOString(),
        }).unwrap();
      }

      if (liveMode === "START_NOW") {
        await startLiveDiscussion({
          communityId: targetCommunityId,
          discussionId,
        }).unwrap();
      }

      router.replace({
        pathname: "/discussions/[discussionId]/live",
        params: {
          discussionId,
          communityId: response.data.communityId,
          communityName: response.data.community.name,
        },
      });
    } catch (error) {
      Alert.alert("Could not start discussion", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickerValue = scheduledAt ?? getDefaultScheduledDate();
  const endPickerValue = scheduledEndAt ?? getDefaultEndDate(scheduledAt);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.separator,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Start Discussion
            </Text>

            <Text
              numberOfLines={1}
              style={[styles.headerSub, { color: colors.muted }]}
            >
              {targetCommunityName || "Select community"}
            </Text>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 36 },
          ]}
        >
          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Community
            </Text>

            <Pressable
              onPress={openCommunityPicker}
              disabled={isBusy}
              style={[
                styles.communityButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.communityIcon}>
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={colors.accent}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.communityButtonText,
                    {
                      color: targetCommunityName
                        ? colors.foreground
                        : colors.placeholder,
                    },
                  ]}
                >
                  {isLoadingCommunities
                    ? "Loading communities..."
                    : targetCommunityName || "Select community"}
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.communityButtonSub, { color: colors.muted }]}
                >
                  Discussion will be created inside this community
                </Text>
              </View>

              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </Pressable>

            {!isLoadingCommunities &&
            communities.length === 0 &&
            officialCommunity ? (
              <Text style={[styles.helper, { color: colors.muted }]}>
                Official district community is hidden but selected automatically.
              </Text>
            ) : null}

            {!isLoadingCommunities && !targetCommunityId ? (
              <Text style={[styles.helper, { color: colors.danger }]}>
                You need to join a community before starting a discussion.
              </Text>
            ) : null}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Live discussion
            </Text>

            <Text style={[styles.helper, { color: colors.muted }]}>
              Create a normal Q&A discussion, schedule a live session, or go live immediately.
            </Text>

            <View style={styles.liveModeGrid}>
              <Pressable
                onPress={activateNormalMode}
                disabled={isBusy}
                style={[
                  styles.liveModeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      liveMode === "NONE" ? colors.accent : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={liveMode === "NONE" ? colors.accent : colors.muted}
                />

                <Text
                  style={[
                    styles.liveModeTitle,
                    { color: colors.foreground },
                  ]}
                >
                  Normal
                </Text>

                <Text style={[styles.liveModeSub, { color: colors.muted }]}>
                  Q&A
                </Text>
              </Pressable>

              <Pressable
                onPress={activateScheduleMode}
                disabled={isBusy}
                style={[
                  styles.liveModeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      liveMode === "SCHEDULE" ? colors.accent : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={liveMode === "SCHEDULE" ? colors.accent : colors.muted}
                />

                <Text
                  style={[
                    styles.liveModeTitle,
                    { color: colors.foreground },
                  ]}
                >
                  Schedule
                </Text>

                <Text style={[styles.liveModeSub, { color: colors.muted }]}>
                  Later
                </Text>
              </Pressable>

              <Pressable
                onPress={activateStartNowMode}
                disabled={isBusy}
                style={[
                  styles.liveModeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      liveMode === "START_NOW" ? colors.danger : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="radio"
                  size={20}
                  color={liveMode === "START_NOW" ? colors.danger : colors.muted}
                />

                <Text
                  style={[
                    styles.liveModeTitle,
                    { color: colors.foreground },
                  ]}
                >
                  Start live
                </Text>

                <Text style={[styles.liveModeSub, { color: colors.muted }]}>
                  Now
                </Text>
              </Pressable>
            </View>

            {liveMode === "SCHEDULE" ? (
              <>
                <View
                  style={[
                    styles.scheduleBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor:
                        scheduledAt && scheduledAt <= new Date()
                          ? colors.danger
                          : colors.border,
                    },
                  ]}
                >
                  <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleIcon}>
                      <Ionicons
                        name="calendar"
                        size={18}
                        color={colors.accent}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.scheduleTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Live start time
                      </Text>

                      <Text
                        style={[
                          styles.scheduleValue,
                          {
                            color: scheduledAt
                              ? colors.foreground
                              : colors.placeholder,
                          },
                        ]}
                      >
                        {formatScheduleDate(scheduledAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scheduleButtonRow}>
                    <Pressable
                      onPress={openDatePicker}
                      disabled={isBusy}
                      style={[
                        styles.scheduleButton,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={colors.accent}
                      />

                      <Text
                        style={[
                          styles.scheduleButtonText,
                          { color: colors.foreground },
                        ]}
                      >
                        Pick start date
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={openTimePicker}
                      disabled={isBusy}
                      style={[
                        styles.scheduleButton,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={colors.accent}
                      />

                      <Text
                        style={[
                          styles.scheduleButtonText,
                          { color: colors.foreground },
                        ]}
                      >
                        Pick start time
                      </Text>
                    </Pressable>
                  </View>

                  {scheduledAt && scheduledAt <= new Date() ? (
                    <Text style={[styles.helper, { color: colors.danger }]}>
                      Please select a future start date and time.
                    </Text>
                  ) : null}

                  {showDatePicker ? (
                    <View style={styles.pickerWrap}>
                      <DateTimePicker
                        value={pickerValue}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        minimumDate={new Date()}
                        onChange={handleDateChange}
                      />

                      {Platform.OS === "ios" ? (
                        <Pressable
                          onPress={() => setShowDatePicker(false)}
                          style={[
                            styles.donePickerButton,
                            { backgroundColor: colors.accent },
                          ]}
                        >
                          <Text
                            style={[
                              styles.donePickerButtonText,
                              { color: colors.accentForeground },
                            ]}
                          >
                            Done
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {showTimePicker ? (
                    <View style={styles.pickerWrap}>
                      <DateTimePicker
                        value={pickerValue}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleTimeChange}
                      />

                      {Platform.OS === "ios" ? (
                        <Pressable
                          onPress={() => setShowTimePicker(false)}
                          style={[
                            styles.donePickerButton,
                            { backgroundColor: colors.accent },
                          ]}
                        >
                          <Text
                            style={[
                              styles.donePickerButtonText,
                              { color: colors.accentForeground },
                            ]}
                          >
                            Done
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.scheduleBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor:
                        scheduledEndAt &&
                        scheduledAt &&
                        scheduledEndAt <= scheduledAt
                          ? colors.danger
                          : colors.border,
                    },
                  ]}
                >
                  <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleIcon}>
                      <Ionicons
                        name="timer-outline"
                        size={18}
                        color={colors.danger}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.scheduleTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Live end time
                      </Text>

                      <Text
                        style={[
                          styles.scheduleValue,
                          {
                            color: scheduledEndAt
                              ? colors.foreground
                              : colors.placeholder,
                          },
                        ]}
                      >
                        {formatScheduleDate(scheduledEndAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scheduleButtonRow}>
                    <Pressable
                      onPress={openEndDatePicker}
                      disabled={isBusy}
                      style={[
                        styles.scheduleButton,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={colors.danger}
                      />

                      <Text
                        style={[
                          styles.scheduleButtonText,
                          { color: colors.foreground },
                        ]}
                      >
                        Pick end date
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={openEndTimePicker}
                      disabled={isBusy}
                      style={[
                        styles.scheduleButton,
                        {
                          backgroundColor: colors.surfaceSecondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={colors.danger}
                      />

                      <Text
                        style={[
                          styles.scheduleButtonText,
                          { color: colors.foreground },
                        ]}
                      >
                        Pick end time
                      </Text>
                    </Pressable>
                  </View>

                  {scheduledEndAt &&
                  scheduledAt &&
                  scheduledEndAt <= scheduledAt ? (
                    <Text style={[styles.helper, { color: colors.danger }]}>
                      End time must be after start time.
                    </Text>
                  ) : null}

                  {showEndDatePicker ? (
                    <View style={styles.pickerWrap}>
                      <DateTimePicker
                        value={endPickerValue}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        minimumDate={scheduledAt ?? new Date()}
                        onChange={handleEndDateChange}
                      />

                      {Platform.OS === "ios" ? (
                        <Pressable
                          onPress={() => setShowEndDatePicker(false)}
                          style={[
                            styles.donePickerButton,
                            { backgroundColor: colors.accent },
                          ]}
                        >
                          <Text
                            style={[
                              styles.donePickerButtonText,
                              { color: colors.accentForeground },
                            ]}
                          >
                            Done
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {showEndTimePicker ? (
                    <View style={styles.pickerWrap}>
                      <DateTimePicker
                        value={endPickerValue}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleEndTimeChange}
                      />

                      {Platform.OS === "ios" ? (
                        <Pressable
                          onPress={() => setShowEndTimePicker(false)}
                          style={[
                            styles.donePickerButton,
                            { backgroundColor: colors.accent },
                          ]}
                        >
                          <Text
                            style={[
                              styles.donePickerButtonText,
                              { color: colors.accentForeground },
                            ]}
                          >
                            Done
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Title
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Write title"
              placeholderTextColor={colors.placeholder}
              editable={!isBusy}
              style={[
                styles.titleInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Description
            </Text>

            <Text style={[styles.helper, { color: colors.muted }]}>
              Explain your problem clearly so members can give the best answer.
            </Text>

            <View
              style={[
                styles.descriptionEditorBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppRichTextEditor
                editor={editor}
                onChangeHtml={setHtml}
                label=""
                helperText=""
                editorHeight={260}
                showToolbar={true}
                plain
              />
            </View>
          </View>

          <Pressable
            onPress={startDiscussion}
            disabled={!canStart}
            style={[
              styles.submitButton,
              {
                backgroundColor: canStart ? colors.accent : colors.muted,
              },
            ]}
          >
            <Ionicons
              name={
                liveMode === "START_NOW"
                  ? "radio"
                  : liveMode === "SCHEDULE"
                    ? "calendar-outline"
                    : "chatbubbles-outline"
              }
              size={20}
              color={colors.accentForeground}
            />

            <Text
              style={[
                styles.submitText,
                {
                  color: colors.accentForeground,
                },
              ]}
            >
              {isBusy
                ? "Starting..."
                : liveMode === "SCHEDULE"
                  ? "Create & Schedule Live"
                  : liveMode === "START_NOW"
                    ? "Create & Start Live"
                    : "Start Discussion"}
            </Text>
          </Pressable>

          <Text style={[styles.communityId, { color: colors.muted }]}>
            Community ID: {targetCommunityId || "missing"}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

     <CommunityPickerSheet
  ref={communitySheetRef}
  communities={filteredCommunities}
  selectedId={selectedCommunityId}
  searchValue={communitySearch}
  onSelect={(id) => {
    setSelectedCommunityId(id);
    communitySheetRef.current?.dismiss();
  }}
  onSearchChange={setCommunitySearch}
  onClose={() => {
    setCommunitySearch("");
  }}
/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  header: {
    minHeight: 62,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrap: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
  },

  headerSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  fieldBlock: {
    marginTop: 18,
  },

  label: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },

  helper: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  communityButton: {
    marginTop: 8,
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  communityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  communityButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  communityButtonSub: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  liveModeGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },

  liveModeCard: {
    flex: 1,
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  liveModeTitle: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },

  liveModeSub: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  scheduleBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },

  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  scheduleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  scheduleTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  scheduleValue: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  scheduleButtonRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },

  scheduleButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  scheduleButtonText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  pickerWrap: {
    marginTop: 12,
    alignItems: "center",
  },

  donePickerButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },

  donePickerButtonText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  titleInput: {
    marginTop: 8,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },

  descriptionEditorBox: {
    marginTop: 10,
    minHeight: 260,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },

  submitButton: {
    marginTop: 24,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  submitText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },

  communityId: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
});