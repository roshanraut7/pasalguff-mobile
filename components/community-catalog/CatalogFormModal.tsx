import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useUploadCatalogImagesMutation,
} from "@/store/api/uploadApi";

import type {
  BusinessCommunityKind,
  BusinessProduct,
  InstituteCourse,
} from "@/store/api/communityCatalogApi";

export type ProductFormPayload = {
  name: string;
  description: string | null;
  websiteLink: string | null;
  pictures: string[];
};

export type CourseFormPayload = {
  name: string;
  duration: string;
  startDate: string;
  contact: string;
};

type Props = {
  visible: boolean;
  communityKind: BusinessCommunityKind;
  product: BusinessProduct | null;
  course: InstituteCourse | null;
  isSubmitting: boolean;
  onClose: () => void;

  onSubmitProduct: (
    payload: ProductFormPayload,
  ) => Promise<void>;

  onSubmitCourse: (
    payload: CourseFormPayload,
  ) => Promise<void>;
};

type ThemeColors =
  ReturnType<typeof useAppTheme>["colors"];

const MAX_PRODUCT_PICTURES = 10;

function getErrorMessage(error: unknown): string {
  const possibleError =
    error as {
      data?: {
        message?:
          | string
          | string[];
      };

      error?: string;
      message?: string;
    };

  const apiMessage =
    possibleError?.data?.message;

  if (
    Array.isArray(
      apiMessage,
    )
  ) {
    return apiMessage.join(
      "\n",
    );
  }

  return (
    apiMessage ||
    possibleError?.error ||
    possibleError?.message ||
    "Something went wrong. Please try again."
  );
}

function buildFallbackImageName(
  index: number,
) {
  return `catalog-${Date.now()}-${index}.jpg`;
}

export default function CatalogFormModal({
  visible,
  communityKind,
  product,
  course,
  isSubmitting,
  onClose,
  onSubmitProduct,
  onSubmitCourse,
}: Props) {
  const { colors } =
    useAppTheme();

  const insets =
    useSafeAreaInsets();

  const sheetRef =
    useRef<BottomSheetModal>(
      null,
    );

  const snapPoints =
    useMemo(
      () => ["92%"],
      [],
    );

  const isBusiness =
    communityKind ===
    "BUSINESS";

  const isEditing =
    Boolean(
      product ||
      course,
    );

  /*
   * Keep input text in refs.
   *
   * This prevents the whole bottom sheet, image list and footer
   * from rerendering for every typed letter. It fixes Android
   * cursor jumping, reversed letters and words moving unexpectedly.
   */
  const productNameRef =
    useRef("");

  const productDescriptionRef =
    useRef("");

  const productWebsiteRef =
    useRef("");

  const courseNameRef =
    useRef("");

  const courseDurationRef =
    useRef("");

  const courseStartDateRef =
    useRef("");

  const courseContactRef =
    useRef("");

  /*
   * This changes only when opening a new create/edit session.
   * The inputs remount once with the correct default values,
   * but they do not remount while the user is typing.
   */
  const [
    formSessionKey,
    setFormSessionKey,
  ] = useState(0);

  const [
    existingPictures,
    setExistingPictures,
  ] =
    useState<string[]>(
      [],
    );

  const [
    selectedImages,
    setSelectedImages,
  ] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);

  const [
    uploadCatalogImages,
    {
      isLoading:
        isUploadingImages,
    },
  ] =
    useUploadCatalogImagesMutation();

  const isBusy =
    isSubmitting ||
    isUploadingImages;

  const pictureCount =
    existingPictures.length +
    selectedImages.length;

  const remainingPictureSlots =
    Math.max(
      MAX_PRODUCT_PICTURES -
        pictureCount,
      0,
    );

  const formTitle =
    isEditing
      ? isBusiness
        ? "Edit Product"
        : "Edit Course"
      : isBusiness
        ? "Add New Product"
        : "Add New Course";

  const submitLabel =
    isEditing
      ? "Save Changes"
      : isBusiness
        ? "Add Product"
        : "Add Course";

  /*
   * Populate the refs and image state whenever a form opens.
   */
  useEffect(() => {
    if (!visible) {
      return;
    }

    productNameRef.current =
      product?.name ?? "";

    productDescriptionRef.current =
      product?.description ?? "";

    productWebsiteRef.current =
      product?.websiteLink ?? "";

    courseNameRef.current =
      course?.name ?? "";

    courseDurationRef.current =
      course?.duration ?? "";

    courseStartDateRef.current =
      course?.startDate?.slice(
        0,
        10,
      ) ?? "";

    courseContactRef.current =
      course?.contact ?? "";

    setExistingPictures(
      (
        product?.pictures ??
        []
      )
        .map(
          (picture) =>
            picture.url,
        )
        .filter(Boolean),
    );

    setSelectedImages([]);

    setFormSessionKey(
      (current) =>
        current + 1,
    );
  }, [
    visible,
    product,
    course,
  ]);

  useEffect(() => {
    if (visible) {
      const frameId =
        requestAnimationFrame(
          () => {
            sheetRef.current
              ?.present();
          },
        );

      return () =>
        cancelAnimationFrame(
          frameId,
        );
    }

    sheetRef.current
      ?.dismiss();

    return undefined;
  }, [visible]);

  const handleDismiss =
    useCallback(() => {
      Keyboard.dismiss();

      if (visible) {
        onClose();
      }
    }, [
      visible,
      onClose,
    ]);

  const closeSheet =
    useCallback(() => {
      if (isBusy) {
        return;
      }

      Keyboard.dismiss();

      sheetRef.current
        ?.dismiss();
    }, [isBusy]);

  const renderBackdrop =
    useCallback(
      (
        props:
          BottomSheetBackdropProps,
      ) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.48}
          pressBehavior={
            isBusy
              ? "none"
              : "close"
          }
        />
      ),
      [isBusy],
    );

  async function pickProductImages() {
    if (
      remainingPictureSlots <=
      0
    ) {
      Alert.alert(
        "Maximum reached",
        `You can add a maximum of ${MAX_PRODUCT_PICTURES} pictures.`,
      );

      return;
    }

    const permission =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Photo permission required",
        "Please allow photo access to select catalogue pictures.",
      );

      return;
    }

    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes: [
            "images",
          ],

          allowsMultipleSelection:
            true,

          selectionLimit:
            remainingPictureSlots,

          allowsEditing:
            false,

          quality:
            0.9,

          exif:
            false,
        });

    if (result.canceled) {
      return;
    }

    setSelectedImages(
      (current) => {
        const knownUris =
          new Set(
            current.map(
              (image) =>
                image.uri,
            ),
          );

        const newImages =
          result.assets
            .filter(
              (image) =>
                !knownUris.has(
                  image.uri,
                ),
            )
            .slice(
              0,
              remainingPictureSlots,
            );

        return [
          ...current,
          ...newImages,
        ];
      },
    );
  }

  function removeExistingPicture(
    pictureUrl: string,
  ) {
    if (isBusy) {
      return;
    }

    setExistingPictures(
      (current) =>
        current.filter(
          (url) =>
            url !== pictureUrl,
        ),
    );
  }

  function removeSelectedImage(
    imageUri: string,
  ) {
    if (isBusy) {
      return;
    }

    setSelectedImages(
      (current) =>
        current.filter(
          (image) =>
            image.uri !==
            imageUri,
        ),
    );
  }

  async function submitProduct() {
    const name =
      productNameRef
        .current
        .trim();

    if (!name) {
      Alert.alert(
        "Product name required",
        "Please enter the product name.",
      );

      return;
    }

    if (
      pictureCount ===
      0
    ) {
      Alert.alert(
        "Product picture required",
        "Please select at least one product picture.",
      );

      return;
    }

    let allPictureUrls = [
      ...existingPictures,
    ];

    if (
      selectedImages.length >
      0
    ) {
      try {
        const uploadResult =
          await uploadCatalogImages({
            files:
              selectedImages.map(
                (
                  image,
                  index,
                ) => ({
                  uri:
                    image.uri,

                  fileName:
                    image.fileName ??
                    buildFallbackImageName(
                      index,
                    ),

                  mimeType:
                    image.mimeType ??
                    "image/jpeg",
                }),
              ),
          }).unwrap();

        const uploadedPictures =
          uploadResult.pictures ??
          uploadResult.items?.map(
            (item) =>
              item.url,
          ) ??
          [];

        if (
          uploadedPictures.length ===
          0
        ) {
          Alert.alert(
            "Image upload failed",
            "The server did not return any uploaded picture paths.",
          );

          return;
        }

        allPictureUrls = [
          ...allPictureUrls,
          ...uploadedPictures,
        ];

        /*
         * Preserve uploaded URLs so a failed product request can
         * be retried without uploading the same files again.
         */
        setExistingPictures(
          allPictureUrls,
        );

        setSelectedImages([]);
      } catch (error) {
        Alert.alert(
          "Image upload failed",
          getErrorMessage(
            error,
          ),
        );

        return;
      }
    }

    await onSubmitProduct({
      name,

      description:
        productDescriptionRef
          .current
          .trim() ||
        null,

      websiteLink:
        productWebsiteRef
          .current
          .trim() ||
        null,

      pictures:
        allPictureUrls,
    });
  }

  async function submitCourse() {
    const name =
      courseNameRef
        .current
        .trim();

    const duration =
      courseDurationRef
        .current
        .trim();

    const startDate =
      courseStartDateRef
        .current
        .trim();

    const contact =
      courseContactRef
        .current
        .trim();

    if (
      !name ||
      !duration ||
      !startDate ||
      !contact
    ) {
      Alert.alert(
        "Missing information",
        "Course name, duration, start date and contact are required.",
      );

      return;
    }

    const parsedDate =
      new Date(startDate);

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      Alert.alert(
        "Invalid date",
        "Use the format YYYY-MM-DD.",
      );

      return;
    }

    await onSubmitCourse({
      name,
      duration,
      startDate,
      contact,
    });
  }

  /*
   * The footer always calls the newest submit function through
   * this ref, so it does not need form values in its dependencies.
   */
  const submitActionRef =
    useRef<() => void>(
      () => {},
    );

  submitActionRef.current =
    () => {
      if (isBusiness) {
        void submitProduct();
      } else {
        void submitCourse();
      }
    };

  const renderFooter =
    useCallback(
      (
        props:
          BottomSheetFooterProps,
      ) => (
        <BottomSheetFooter
          {...props}
          bottomInset={0}
        >
          <View
            style={[
              styles.footer,
              {
                backgroundColor:
                  colors.surface,

                borderTopColor:
                  colors.border,

                paddingBottom:
                  Math.max(
                    insets.bottom,
                    14,
                  ),
              },
            ]}
          >
            <Pressable
              disabled={
                isBusy
              }
              onPress={
                closeSheet
              }
              style={[
                styles.cancelButton,
                {
                  borderColor:
                    colors.border,

                  opacity:
                    isBusy
                      ? 0.55
                      : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  {
                    color:
                      colors.foreground,
                  },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={
                isBusy
              }
              onPress={() => {
                submitActionRef
                  .current();
              }}
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    colors.accent,

                  opacity:
                    isBusy
                      ? 0.65
                      : 1,
                },
              ]}
            >
              {isBusy ? (
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />
              ) : (
                <Ionicons
                  name={
                    isEditing
                      ? "checkmark"
                      : "add"
                  }
                  size={19}
                  color="#ffffff"
                />
              )}

              <Text
                style={
                  styles.saveButtonText
                }
              >
                {isUploadingImages
                  ? "Uploading..."
                  : isSubmitting
                    ? "Saving..."
                    : submitLabel}
              </Text>
            </Pressable>
          </View>
        </BottomSheetFooter>
      ),
      [
        colors.surface,
        colors.border,
        colors.foreground,
        colors.accent,
        insets.bottom,
        isBusy,
        isEditing,
        isUploadingImages,
        isSubmitting,
        submitLabel,
        closeSheet,
      ],
    );

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={
        false
      }
      enablePanDownToClose={
        !isBusy
      }
      topInset={
        insets.top
      }
      bottomInset={
        Math.max(
          insets.bottom,
          8,
        )
      }
      keyboardBehavior={
        Platform.OS ===
        "android"
          ? "fillParent"
          : "interactive"
      }
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={
        renderBackdrop
      }
      footerComponent={
        renderFooter
      }
      onDismiss={
        handleDismiss
      }
      backgroundStyle={[
        styles.sheetBackground,
        {
          backgroundColor:
            colors.surface,
        },
      ]}
      handleIndicatorStyle={{
        backgroundColor:
          colors.muted,
      }}
      style={
        styles.sheetShadow
      }
    >
      <View style={styles.header}>
        <View style={styles.flexOne}>
          <Text
            style={[
              styles.title,
              {
                color:
                  colors.foreground,
              },
            ]}
          >
            {formTitle}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            {isBusiness
              ? "Add product information and select pictures from your phone."
              : "Add course information below."}
          </Text>
        </View>

        <Pressable
          disabled={
            isBusy
          }
          onPress={
            closeSheet
          }
          hitSlop={12}
          style={[
            styles.closeButton,
            {
              backgroundColor:
                colors.surfaceSecondary,
            },
          ]}
        >
          <Ionicons
            name="close"
            size={21}
            color={
              colors.foreground
            }
          />
        </Pressable>
      </View>

      <BottomSheetScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.formContent
        }
      >
        {isBusiness ? (
          <>
            <StableFormField
              key={`product-name-${formSessionKey}`}
              label="Product name"
              placeholder="Example: Samsung Galaxy S25"
              defaultValue={
                productNameRef.current
              }
              onValueChange={(
                value,
              ) => {
                productNameRef.current =
                  value;
              }}
              colors={colors}
            />

            <StableFormField
              key={`product-description-${formSessionKey}`}
              label="Description"
              optional
              multiline
              placeholder="Write product information..."
              defaultValue={
                productDescriptionRef
                  .current
              }
              onValueChange={(
                value,
              ) => {
                productDescriptionRef.current =
                  value;
              }}
              colors={colors}
            />

            <StableFormField
              key={`product-website-${formSessionKey}`}
              label="Website link"
              optional
              placeholder="https://example.com/product"
              defaultValue={
                productWebsiteRef.current
              }
              onValueChange={(
                value,
              ) => {
                productWebsiteRef.current =
                  value;
              }}
              keyboardType="url"
              autoCapitalize="none"
              colors={colors}
            />

            <View
              style={
                styles.pictureSection
              }
            >
              <View
                style={
                  styles.pictureHeader
                }
              >
                <View>
                  <Text
                    style={[
                      styles.fieldLabel,
                      {
                        color:
                          colors.foreground,
                      },
                    ]}
                  >
                    Product pictures
                  </Text>

                  <Text
                    style={[
                      styles.pictureCounter,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    {pictureCount}/
                    {MAX_PRODUCT_PICTURES} selected
                  </Text>
                </View>

                <Pressable
                  disabled={
                    isBusy ||
                    remainingPictureSlots ===
                      0
                  }
                  onPress={() =>
                    void pickProductImages()
                  }
                  style={[
                    styles.pickButton,
                    {
                      backgroundColor:
                        colors.accent,

                      opacity:
                        isBusy ||
                        remainingPictureSlots ===
                          0
                          ? 0.55
                          : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="images-outline"
                    size={17}
                    color="#ffffff"
                  />

                  <Text
                    style={
                      styles.pickButtonText
                    }
                  >
                    Select
                  </Text>
                </Pressable>
              </View>

              {pictureCount ===
              0 ? (
                <Pressable
                  disabled={
                    isBusy
                  }
                  onPress={() =>
                    void pickProductImages()
                  }
                  style={[
                    styles.emptyPictureBox,
                    {
                      backgroundColor:
                        colors.surfaceSecondary,

                      borderColor:
                        colors.border,

                      opacity:
                        isBusy
                          ? 0.6
                          : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={30}
                    color={
                      colors.accent
                    }
                  />

                  <Text
                    style={[
                      styles.emptyPictureTitle,
                      {
                        color:
                          colors.foreground,
                      },
                    ]}
                  >
                    Select product pictures
                  </Text>

                  <Text
                    style={[
                      styles.emptyPictureText,
                      {
                        color:
                          colors.muted,
                      },
                    ]}
                  >
                    JPG, PNG or WEBP. Maximum 10 pictures.
                  </Text>
                </Pressable>
              ) : (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={
                    false
                  }
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={
                    styles.previewList
                  }
                >
                  {existingPictures.map(
                    (
                      pictureUrl,
                      index,
                    ) => {
                      const absoluteUrl =
                        toAbsoluteFileUrl(
                          pictureUrl,
                        );

                      if (
                        !absoluteUrl
                      ) {
                        return null;
                      }

                      return (
                        <PicturePreview
                          key={
                            pictureUrl
                          }
                          uri={
                            absoluteUrl
                          }
                          label={
                            index ===
                            0
                              ? "Cover"
                              : undefined
                          }
                          disabled={
                            isBusy
                          }
                          onRemove={() =>
                            removeExistingPicture(
                              pictureUrl,
                            )
                          }
                          colors={
                            colors
                          }
                        />
                      );
                    },
                  )}

                  {selectedImages.map(
                    (
                      image,
                      index,
                    ) => (
                      <PicturePreview
                        key={
                          image.uri
                        }
                        uri={
                          image.uri
                        }
                        label={
                          existingPictures.length ===
                            0 &&
                          index ===
                            0
                            ? "Cover"
                            : "New"
                        }
                        disabled={
                          isBusy
                        }
                        onRemove={() =>
                          removeSelectedImage(
                            image.uri,
                          )
                        }
                        colors={
                          colors
                        }
                      />
                    ),
                  )}

                  {remainingPictureSlots >
                  0 ? (
                    <Pressable
                      disabled={
                        isBusy
                      }
                      onPress={() =>
                        void pickProductImages()
                      }
                      style={[
                        styles.addMorePicture,
                        {
                          backgroundColor:
                            colors.surfaceSecondary,

                          borderColor:
                            colors.border,

                          opacity:
                            isBusy
                              ? 0.55
                              : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={26}
                        color={
                          colors.accent
                        }
                      />

                      <Text
                        style={[
                          styles.addMoreText,
                          {
                            color:
                              colors.accent,
                          },
                        ]}
                      >
                        Add more
                      </Text>
                    </Pressable>
                  ) : null}
                </ScrollView>
              )}
            </View>
          </>
        ) : (
          <>
            <StableFormField
              key={`course-name-${formSessionKey}`}
              label="Course name"
              placeholder="Example: Full Stack Development"
              defaultValue={
                courseNameRef.current
              }
              onValueChange={(
                value,
              ) => {
                courseNameRef.current =
                  value;
              }}
              colors={colors}
            />

            <StableFormField
              key={`course-duration-${formSessionKey}`}
              label="Duration"
              placeholder="Example: 3 months"
              defaultValue={
                courseDurationRef.current
              }
              onValueChange={(
                value,
              ) => {
                courseDurationRef.current =
                  value;
              }}
              colors={colors}
            />

            <StableFormField
              key={`course-start-${formSessionKey}`}
              label="Starting date"
              placeholder="YYYY-MM-DD"
              defaultValue={
                courseStartDateRef.current
              }
              onValueChange={(
                value,
              ) => {
                courseStartDateRef.current =
                  value;
              }}
              keyboardType="numbers-and-punctuation"
              colors={colors}
            />

            <StableFormField
              key={`course-contact-${formSessionKey}`}
              label="Contact"
              placeholder="Phone, email or enquiry information"
              defaultValue={
                courseContactRef.current
              }
              onValueChange={(
                value,
              ) => {
                courseContactRef.current =
                  value;
              }}
              multiline
              colors={colors}
            />
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

type StableFormFieldProps = {
  label: string;
  optional?: boolean;
  placeholder: string;
  defaultValue: string;
  multiline?: boolean;

  autoCapitalize?:
    | "none"
    | "sentences"
    | "words"
    | "characters";

  keyboardType?:
    React.ComponentProps<
      typeof BottomSheetTextInput
    >["keyboardType"];

  onValueChange:
    (
      value: string,
    ) => void;

  colors:
    ThemeColors;
};

const StableFormField =
  memo(
    function StableFormField({
      label,
      optional,
      placeholder,
      defaultValue,
      multiline,
      autoCapitalize = "sentences",
      keyboardType = "default",
      onValueChange,
      colors,
    }: StableFormFieldProps) {
      return (
        <View
          style={
            styles.fieldWrap
          }
        >
          <View
            style={
              styles.fieldLabelRow
            }
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  color:
                    colors.foreground,
                },
              ]}
            >
              {label}
            </Text>

            {optional ? (
              <Text
                style={[
                  styles.optionalText,
                  {
                    color:
                      colors.muted,
                  },
                ]}
              >
                Optional
              </Text>
            ) : null}
          </View>

          <BottomSheetTextInput
            defaultValue={
              defaultValue
            }
            onChangeText={
              onValueChange
            }
            placeholder={
              placeholder
            }
            placeholderTextColor={
              colors.muted
            }
            multiline={
              multiline
            }
            autoCapitalize={
              autoCapitalize
            }
            autoCorrect={
              false
            }
            spellCheck={
              false
            }
            keyboardType={
              keyboardType
            }
            textAlignVertical={
              multiline
                ? "top"
                : "center"
            }
            returnKeyType={
              multiline
                ? "default"
                : "next"
            }
            selectionColor={
              colors.accent
            }
            style={[
              styles.input,
              multiline &&
                styles.multilineInput,
              {
                color:
                  colors.foreground,

                backgroundColor:
                  colors.surfaceSecondary,

                borderColor:
                  colors.border,
              },
            ]}
          />
        </View>
      );
    },
  );

type PicturePreviewProps = {
  uri: string;
  label?: string;
  disabled: boolean;
  onRemove: () => void;
  colors: ThemeColors;
};

const PicturePreview =
  memo(
    function PicturePreview({
      uri,
      label,
      disabled,
      onRemove,
      colors,
    }: PicturePreviewProps) {
      const [
        hasError,
        setHasError,
      ] = useState(false);

      if (hasError) {
        return (
          <View
            style={[
              styles.previewCard,
              styles.previewFallback,
              {
                backgroundColor:
                  colors.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={25}
              color={
                colors.muted
              }
            />

            <Pressable
              disabled={
                disabled
              }
              onPress={
                onRemove
              }
              hitSlop={8}
              style={[
                styles.removePictureButton,
                {
                  backgroundColor:
                    colors.danger,

                  opacity:
                    disabled
                      ? 0.55
                      : 1,
                },
              ]}
            >
              <Ionicons
                name="close"
                size={15}
                color="#ffffff"
              />
            </Pressable>
          </View>
        );
      }

      return (
        <View
          style={
            styles.previewCard
          }
        >
          <Image
            source={{
              uri,
            }}
            style={
              styles.previewImage
            }
            resizeMode="cover"
            fadeDuration={0}
            onError={(
              event,
            ) => {
              console.log(
                "CATALOG PREVIEW IMAGE ERROR",
                {
                  uri,

                  error:
                    event.nativeEvent
                      .error,
                },
              );

              setHasError(
                true,
              );
            }}
          />

          {label ? (
            <View
              style={
                styles.previewLabel
              }
            >
              <Text
                style={
                  styles.previewLabelText
                }
              >
                {label}
              </Text>
            </View>
          ) : null}

          <Pressable
            disabled={
              disabled
            }
            onPress={
              onRemove
            }
            hitSlop={8}
            style={[
              styles.removePictureButton,
              {
                backgroundColor:
                  colors.danger,

                opacity:
                  disabled
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <Ionicons
              name="close"
              size={15}
              color="#ffffff"
            />
          </Pressable>
        </View>
      );
    },
  );

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },

  sheetBackground: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  sheetShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 18,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  title: {
    fontSize: 19,
    fontFamily:
      "Poppins_700Bold",
  },

  subtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 17,
    fontFamily:
      "Poppins_400Regular",
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  formContent: {
    paddingHorizontal: 18,
    paddingBottom: 180,
    gap: 16,
  },

  fieldWrap: {
    gap: 7,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  fieldLabel: {
    fontSize: 12,
    fontFamily:
      "Poppins_600SemiBold",
  },

  optionalText: {
    fontSize: 10,
    fontFamily:
      "Poppins_400Regular",
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily:
      "Poppins_400Regular",
  },

  multilineInput: {
    minHeight: 112,
    paddingTop: 12,
    paddingBottom: 12,
  },

  pictureSection: {
    gap: 11,
  },

  pictureHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
  },

  pictureCounter: {
    marginTop: 2,
    fontSize: 10,
    fontFamily:
      "Poppins_400Regular",
  },

  pickButton: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  pickButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily:
      "Poppins_600SemiBold",
  },

  emptyPictureBox: {
    minHeight: 150,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyPictureTitle: {
    marginTop: 8,
    fontSize: 13,
    fontFamily:
      "Poppins_600SemiBold",
  },

  emptyPictureText: {
    marginTop: 3,
    fontSize: 10,
    textAlign: "center",
    fontFamily:
      "Poppins_400Regular",
  },

  previewList: {
    gap: 10,
    paddingRight: 12,
  },

  previewCard: {
    width: 112,
    height: 112,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E5E7EB",
  },

  previewFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  previewLabel: {
    position: "absolute",
    left: 7,
    bottom: 7,
    backgroundColor:
      "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  previewLabelText: {
    color: "#ffffff",
    fontSize: 8,
    fontFamily:
      "Poppins_600SemiBold",
  },

  removePictureButton: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  addMorePicture: {
    width: 112,
    height: 112,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  addMoreText: {
    marginTop: 4,
    fontSize: 10,
    fontFamily:
      "Poppins_600SemiBold",
  },

  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 15,
    paddingTop: 12,
    flexDirection: "row",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    minHeight: 49,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 12,
    fontFamily:
      "Poppins_600SemiBold",
  },

  saveButton: {
    flex: 1.7,
    minHeight: 49,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily:
      "Poppins_600SemiBold",
  },
});