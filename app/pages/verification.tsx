import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { FieldError, Input, Label, TextField } from "heroui-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import VerifiedBadge from "@/components/common/verifiedBadge";

import {
  useGetMyVerificationStatusQuery,
  useSubmitVerificationRequestMutation,
  type VerificationDocumentType,
  type VerificationTrack,
} from "@/store/api/verificationApi";

import { useUploadVerificationDocumentMutation } from "@/store/api/uploadApi";

type PickedDoc = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

const TRACK_LABEL: Record<VerificationTrack, string> = {
  BUSINESS: "Business",
  INDIVIDUAL: "Individual",
  TRAINING: "Training Professional",
};

const DOCUMENT_TYPE_LABEL: Record<VerificationDocumentType, string> = {
  PAN: "PAN Card",
  CITIZENSHIP: "Citizenship Certificate",
  INSTITUTE_CERTIFICATE: "Institute Certificate",
};

function resolveDocumentType(
  track: VerificationTrack,
): VerificationDocumentType {
  switch (track) {
    case "BUSINESS":
      return "PAN";
    case "TRAINING":
      return "INSTITUTE_CERTIFICATE";
    case "INDIVIDUAL":
    default:
      return "CITIZENSHIP";
  }
}

function needsDocumentNumber(track: VerificationTrack) {
  return track === "BUSINESS" || track === "INDIVIDUAL";
}

function needsBackSide(track: VerificationTrack) {
  return track === "INDIVIDUAL";
}

export default function VerificationScreen() {
  const { colors } = useAppTheme();

  const {
    data: status,
    isLoading,
    refetch,
  } = useGetMyVerificationStatusQuery();

  const [uploadDocument] = useUploadVerificationDocumentMutation();
  const [submitRequest, { isLoading: isSubmitting }] =
    useSubmitVerificationRequestMutation();

  const [documentNumber, setDocumentNumber] = useState("");
  const [frontImage, setFrontImage] = useState<PickedDoc | null>(null);
  const [backImage, setBackImage] = useState<PickedDoc | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [serverError, setServerError] = useState("");

  const expectedTrack = status?.expectedTrack ?? "INDIVIDUAL";
  const documentType = resolveDocumentType(expectedTrack);
  const requiresNumber = needsDocumentNumber(expectedTrack);
  const requiresBack = needsBackSide(expectedTrack);

  const latestRequest = status?.latestRequest ?? null;
  const isPendingReview = latestRequest?.status === "PENDING";
  const isRejected = latestRequest?.status === "REJECTED";

  const canSubmit = useMemo(() => {
    if (!frontImage) return false;
    if (requiresBack && !backImage) return false;
    if (requiresNumber && documentNumber.trim().length < 3) return false;
    return true;
  }, [frontImage, backImage, requiresBack, requiresNumber, documentNumber]);

  const pickImage = async (side: "front" | "back", useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) return;

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.85,
        });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const picked: PickedDoc = {
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    };

    if (side === "front") {
      setFrontImage(picked);
    } else {
      setBackImage(picked);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || isUploading || isSubmitting) return;

    setServerError("");
    setIsUploading(true);

    try {
      const uploadedFront = await uploadDocument({
        uri: frontImage!.uri,
        fileName: frontImage!.fileName,
        mimeType: frontImage!.mimeType,
        side: "front",
      }).unwrap();

      let uploadedBackUrl: string | undefined;

      if (requiresBack && backImage) {
        const uploadedBack = await uploadDocument({
          uri: backImage.uri,
          fileName: backImage.fileName,
          mimeType: backImage.mimeType,
          side: "back",
        }).unwrap();

        uploadedBackUrl = uploadedBack.url;
      }

      await submitRequest({
        track: expectedTrack,
        documentType,
        documentNumber: requiresNumber ? documentNumber.trim() : undefined,
        documentFrontUrl: uploadedFront.url,
        documentBackUrl: uploadedBackUrl,
      }).unwrap();

      setFrontImage(null);
      setBackImage(null);
      setDocumentNumber("");

      await refetch();

      Alert.alert(
        "Submitted",
        "Your document has been submitted for review. We'll notify you once it's checked.",
      );
    } catch (error: any) {
      setServerError(
        error?.data?.message ?? "Could not submit verification request.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          height: 58,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            color: colors.foreground,
            fontSize: 19,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Get Verified
        </Text>

        <View style={{ width: 42, height: 42 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {status?.isVerified ? (
          <VerifiedStateCard
            colors={colors}
            track={status.verificationTrack}
            verifiedAt={status.verifiedAt}
          />
        ) : isPendingReview ? (
          <PendingStateCard colors={colors} documentType={documentType} />
        ) : (
          <>
            {isRejected && latestRequest?.rejectionReason ? (
              <RejectedBanner
                colors={colors}
                reason={latestRequest.rejectionReason}
              />
            ) : null}

            <View
              style={{
                marginTop: 8,
                borderRadius: 24,
                padding: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 16,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {TRACK_LABEL[expectedTrack]} verification
              </Text>

              <Text
                style={{
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 20,
                  fontFamily: "Poppins_400Regular",
                  marginTop: 6,
                }}
              >
                Upload a clear photo of your {DOCUMENT_TYPE_LABEL[documentType]}
                {requiresBack ? " (both front and back)" : ""} to get a
                verified badge on your profile.
              </Text>
            </View>

            {requiresNumber ? (
              <View style={{ marginTop: 18 }}>
                <TextField>
                  <Label>
                    {documentType === "PAN" ? "PAN Number" : "Citizenship Number"}
                  </Label>
                  <Input
                    value={documentNumber}
                    onChangeText={setDocumentNumber}
                    placeholder={
                      documentType === "PAN"
                        ? "Example: 123456789"
                        : "Example: 12-34-56-78901"
                    }
                    className="border-field-border bg-field-background"
                  />
                  <FieldError />
                </TextField>
              </View>
            ) : null}

            <View style={{ marginTop: 18, gap: 14 }}>
              <DocPickerCard
                colors={colors}
                title={
                  requiresBack
                    ? `${DOCUMENT_TYPE_LABEL[documentType]} - Front`
                    : DOCUMENT_TYPE_LABEL[documentType]
                }
                image={frontImage}
                onPickCamera={() => pickImage("front", true)}
                onPickGallery={() => pickImage("front", false)}
                onRemove={() => setFrontImage(null)}
              />

              {requiresBack ? (
                <DocPickerCard
                  colors={colors}
                  title={`${DOCUMENT_TYPE_LABEL[documentType]} - Back`}
                  image={backImage}
                  onPickCamera={() => pickImage("back", true)}
                  onPickGallery={() => pickImage("back", false)}
                  onRemove={() => setBackImage(null)}
                />
              ) : null}
            </View>

            {serverError ? (
              <Text
                style={{
                  color: colors.danger,
                  fontSize: 13,
                  fontFamily: "Poppins_500Medium",
                  marginTop: 14,
                }}
              >
                {serverError}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || isUploading || isSubmitting}
              style={{
                marginTop: 22,
                height: 52,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accent,
                opacity: !canSubmit || isUploading || isSubmitting ? 0.5 : 1,
              }}
            >
              {isUploading || isSubmitting ? (
                <ActivityIndicator size="small" color={colors.accentForeground} />
              ) : (
                <Text
                  style={{
                    color: colors.accentForeground,
                    fontSize: 15,
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  Submit for review
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function VerifiedStateCard({
  colors,
  track,
  verifiedAt,
}: {
  colors: any;
  track: VerificationTrack | null;
  verifiedAt: string | null;
}) {
  return (
    <View
      style={{
        marginTop: 8,
        borderRadius: 24,
        padding: 20,
        alignItems: "center",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <VerifiedBadge track={track} size={22} />
        <Text
          style={{
            color: colors.foreground,
            fontSize: 17,
            fontFamily: "Poppins_700Bold",
          }}
        >
          You're verified
        </Text>
      </View>

      <Text
        style={{
          color: colors.muted,
          fontSize: 13,
          textAlign: "center",
          fontFamily: "Poppins_400Regular",
        }}
      >
        {track ? `${TRACK_LABEL[track]} verification` : "Account verified"}
        {verifiedAt
          ? ` · since ${new Date(verifiedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}`
          : ""}
      </Text>
    </View>
  );
}

function PendingStateCard({
  colors,
  documentType,
}: {
  colors: any;
  documentType: VerificationDocumentType;
}) {
  return (
    <View
      style={{
        marginTop: 8,
        borderRadius: 24,
        padding: 20,
        alignItems: "center",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
      }}
    >
      <Ionicons name="time-outline" size={28} color={colors.accent} />

      <Text
        style={{
          color: colors.foreground,
          fontSize: 16,
          fontFamily: "Poppins_700Bold",
        }}
      >
        Under review
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: 13,
          textAlign: "center",
          lineHeight: 20,
          fontFamily: "Poppins_400Regular",
        }}
      >
        Your {DOCUMENT_TYPE_LABEL[documentType]} has been submitted and is
        waiting for review. This usually takes 1-2 business days.
      </Text>
    </View>
  );
}

function RejectedBanner({ colors, reason }: { colors: any; reason: string }) {
  return (
    <View
      style={{
        marginTop: 8,
        borderRadius: 20,
        padding: 14,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.danger,
        flexDirection: "row",
        gap: 10,
      }}
    >
      <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.danger,
            fontSize: 13,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Previous submission was rejected
        </Text>

        <Text
          style={{
            color: colors.foreground,
            fontSize: 12,
            lineHeight: 18,
            fontFamily: "Poppins_400Regular",
            marginTop: 3,
          }}
        >
          {reason}
        </Text>
      </View>
    </View>
  );
}

function DocPickerCard({
  colors,
  title,
  image,
  onPickCamera,
  onPickGallery,
  onRemove,
}: {
  colors: any;
  title: string;
  image: PickedDoc | null;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onRemove: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: 20,
        padding: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.foreground,
          fontSize: 13,
          fontFamily: "Poppins_600SemiBold",
          marginBottom: 10,
        }}
      >
        {title}
      </Text>

      {image ? (
        <View style={{ gap: 10 }}>
          <Image
            source={{ uri: image.uri }}
            style={{ width: "100%", height: 180, borderRadius: 14 }}
            resizeMode="cover"
          />

          <Pressable onPress={onRemove}>
            <Text
              style={{
                color: colors.danger,
                fontSize: 12,
                fontFamily: "Poppins_500Medium",
              }}
            >
              Remove and choose again
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={onPickCamera}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="camera-outline" size={17} color={colors.accent} />
            <Text
              style={{
                color: colors.foreground,
                fontSize: 12,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              Camera
            </Text>
          </Pressable>

          <Pressable
            onPress={onPickGallery}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="images-outline" size={17} color={colors.accent} />
            <Text
              style={{
                color: colors.foreground,
                fontSize: 12,
                fontFamily: "Poppins_600SemiBold",
              }}
            >
              Gallery
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}