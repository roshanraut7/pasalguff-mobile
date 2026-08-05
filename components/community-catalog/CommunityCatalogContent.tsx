import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import type {
  BusinessCommunityKind,
  BusinessProduct,
  BusinessProductPicture,
  InstituteCourse,
} from "@/store/api/communityCatalogApi";

type Props = {
  communityKind: BusinessCommunityKind;

  products?: BusinessProduct[];
  courses?: InstituteCourse[];

  hasError: boolean;
  isDeleting: boolean;

  onAdd: () => void;
  onEditProduct: (product: BusinessProduct) => void;
  onDeleteProduct: (product: BusinessProduct) => void;
  onEditCourse: (course: InstituteCourse) => void;
  onDeleteCourse: (course: InstituteCourse) => void;
};

type ThemeColors =
  ReturnType<typeof useAppTheme>["colors"];

type ResolvedProductPicture = {
  id: string;
  url: string;
  sortOrder: number;
};

function formatCourseDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeWebsiteLink(websiteLink: string) {
  const trimmed = websiteLink.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function resolveProductPictures(
  productId: string,
  pictures: BusinessProductPicture[] | undefined,
): ResolvedProductPicture[] {
  return (pictures ?? [])
    .map((picture, index) => {
      const absoluteUrl =
        toAbsoluteFileUrl(picture.url);

      if (!absoluteUrl) {
        return null;
      }

      return {
        id:
          picture.id ||
          `${productId}-${picture.sortOrder ?? index}-${picture.url}`,

        url:
          absoluteUrl,

        sortOrder:
          picture.sortOrder ?? index,
      };
    })
    .filter(
      (
        picture,
      ): picture is ResolvedProductPicture =>
        picture !== null,
    )
    .sort(
      (first, second) =>
        first.sortOrder -
        second.sortOrder,
    );
}

async function openWebsite(websiteLink: string) {
  try {
    const normalizedLink =
      normalizeWebsiteLink(websiteLink);

    const supported =
      await Linking.canOpenURL(normalizedLink);

    if (!supported) {
      Alert.alert(
        "Invalid website",
        "This website link cannot be opened.",
      );

      return;
    }

    await Linking.openURL(normalizedLink);
  } catch {
    Alert.alert(
      "Unable to open website",
      "Please check the website link.",
    );
  }
}

export default function CommunityCatalogContent({
  communityKind,
  products = [],
  courses = [],
  hasError,
  isDeleting,
  onAdd,
  onEditProduct,
  onDeleteProduct,
  onEditCourse,
  onDeleteCourse,
}: Props) {
  const { colors } = useAppTheme();

  const isBusiness =
    communityKind === "BUSINESS";

  const isInstitute =
    communityKind === "INSTITUTE";

  const itemCount =
    isBusiness
      ? products.length
      : courses.length;

  const pageTitle =
    isInstitute
      ? "Course Catalogue"
      : "Product Catalogue";

  const pageSubtitle =
    isInstitute
      ? "Create and manage courses offered by your institute."
      : "Create and manage products offered by your business.";

  const addButtonLabel =
    isInstitute
      ? "Add Course"
      : "Add Product";

  const itemLabel =
    isInstitute
      ? itemCount === 1
        ? "course"
        : "courses"
      : itemCount === 1
        ? "product"
        : "products";

  return (
    <>
      <LinearGradient
        colors={[
          colors.accent,
          colors.muted ?? "#173B36",
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={styles.heroCard}
      >
        <View style={styles.heroIcon}>
          <Ionicons
            name={
              isInstitute
                ? "school-outline"
                : "storefront-outline"
            }
            size={28}
            color="#ffffff"
          />
        </View>

        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>
            {pageTitle}
          </Text>

          <Text style={styles.heroSubtitle}>
            {pageSubtitle}
          </Text>

          <View style={styles.heroCountChip}>
            <Text style={styles.heroCountText}>
              {itemCount} {itemLabel}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <Pressable
        onPress={onAdd}
        hitSlop={4}
        android_ripple={{
          color:
            "rgba(17,117,67,0.10)",
        }}
        style={({ pressed }) => [
          styles.addCard,
          {
            backgroundColor:
              colors.surface,

            borderColor:
              colors.accent,

            opacity:
              pressed
                ? 0.86
                : 1,
          },
        ]}
      >
        <View
          style={[
            styles.addCardIcon,
            {
              backgroundColor:
                colors.surfaceSecondary,
            },
          ]}
        >
          <Ionicons
            name="add"
            size={24}
            color={colors.accent}
          />
        </View>

        <View style={styles.addCardTextWrap}>
          <Text
            style={[
              styles.addCardTitle,
              {
                color:
                  colors.foreground,
              },
            ]}
          >
            {addButtonLabel}
          </Text>

          <Text
            style={[
              styles.addCardSubtitle,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            {isInstitute
              ? "Add course information, start date and contact details."
              : "Add product pictures, description and website link."}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.accent}
        />
      </Pressable>

      {hasError ? (
        <View
          style={[
            styles.errorCard,
            {
              backgroundColor:
                colors.surface,

              borderColor:
                colors.border,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={23}
            color={colors.danger}
          />

          <View style={styles.flexOne}>
            <Text
              style={[
                styles.errorTitle,
                {
                  color:
                    colors.danger,
                },
              ]}
            >
              Unable to load catalogue
            </Text>

            <Text
              style={[
                styles.errorSubtitle,
                {
                  color:
                    colors.muted,
                },
              ]}
            >
              Pull down to try again.
            </Text>
          </View>
        </View>
      ) : null}

      {!hasError &&
      itemCount === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor:
                colors.surface,

              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIcon,
              {
                backgroundColor:
                  colors.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name={
                isInstitute
                  ? "library-outline"
                  : "cube-outline"
              }
              size={32}
              color={colors.accent}
            />
          </View>

          <Text
            style={[
              styles.emptyTitle,
              {
                color:
                  colors.foreground,
              },
            ]}
          >
            {isInstitute
              ? "No courses added"
              : "No products added"}
          </Text>

          <Text
            style={[
              styles.emptySubtitle,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            {isInstitute
              ? "Add your first course so community members can view its duration, start date and contact information."
              : "Add your first product with pictures, description and website link."}
          </Text>

          <Pressable
            onPress={onAdd}
            hitSlop={6}
            style={({ pressed }) => [
              styles.emptyButton,
              {
                backgroundColor:
                  colors.accent,

                opacity:
                  pressed
                    ? 0.84
                    : 1,
              },
            ]}
          >
            <Ionicons
              name="add"
              size={18}
              color="#ffffff"
            />

            <Text
              style={
                styles.emptyButtonText
              }
            >
              {addButtonLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isBusiness
        ? products.map(
            (product) => {
              const productPictures =
                resolveProductPictures(
                  product.id,
                  product.pictures,
                );

              return (
                <View
                  key={product.id}
                  style={[
                    styles.productCard,
                    {
                      backgroundColor:
                        colors.surface,

                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <ProductImageCarousel
                    productId={
                      product.id
                    }
                    pictures={
                      productPictures
                    }
                    colors={colors}
                  />

                  <View
                    style={
                      styles.cardContent
                    }
                  >
                    <Text
                      style={[
                        styles.cardTitle,
                        {
                          color:
                            colors.foreground,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {product.name}
                    </Text>

                    <Text
                      style={[
                        styles.cardDescription,
                        {
                          color:
                            colors.muted,
                        },
                      ]}
                      numberOfLines={3}
                    >
                      {product.description ||
                        "No description added."}
                    </Text>

                    {product.websiteLink ? (
                      <Pressable
                        onPress={() =>
                          void openWebsite(
                            product.websiteLink!,
                          )
                        }
                        style={[
                          styles.websiteButton,
                          {
                            backgroundColor:
                              colors.surfaceSecondary,
                          },
                        ]}
                      >
                        <Ionicons
                          name="globe-outline"
                          size={16}
                          color={
                            colors.accent
                          }
                        />

                        <Text
                          style={[
                            styles.websiteText,
                            {
                              color:
                                colors.accent,
                            },
                          ]}
                        >
                          Visit website
                        </Text>

                        <Ionicons
                          name="open-outline"
                          size={15}
                          color={
                            colors.accent
                          }
                        />
                      </Pressable>
                    ) : null}

                    <CardActions
                      isDeleting={
                        isDeleting
                      }
                      colors={colors}
                      onEdit={() =>
                        onEditProduct(
                          product,
                        )
                      }
                      onDelete={() =>
                        onDeleteProduct(
                          product,
                        )
                      }
                    />
                  </View>
                </View>
              );
            },
          )
        : null}

      {isInstitute
        ? courses.map(
            (course) => (
              <View
                key={course.id}
                style={[
                  styles.courseCard,
                  {
                    backgroundColor:
                      colors.surface,

                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    colors.accent,
                    colors.muted ??
                      "#173B36",
                  ]}
                  start={{
                    x: 0,
                    y: 0,
                  }}
                  end={{
                    x: 1,
                    y: 1,
                  }}
                  style={
                    styles.courseIconPanel
                  }
                >
                  <Ionicons
                    name="school-outline"
                    size={30}
                    color="#ffffff"
                  />
                </LinearGradient>

                <View
                  style={
                    styles.courseContent
                  }
                >
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color:
                          colors.foreground,
                      },
                    ]}
                  >
                    {course.name}
                  </Text>

                  <CourseDetail
                    icon="time-outline"
                    label="Duration"
                    value={
                      course.duration
                    }
                    colors={colors}
                  />

                  <CourseDetail
                    icon="calendar-outline"
                    label="Starting date"
                    value={formatCourseDate(
                      course.startDate,
                    )}
                    colors={colors}
                  />

                  <CourseDetail
                    icon="call-outline"
                    label="Contact"
                    value={
                      course.contact
                    }
                    colors={colors}
                  />

                  <CardActions
                    isDeleting={
                      isDeleting
                    }
                    colors={colors}
                    onEdit={() =>
                      onEditCourse(
                        course,
                      )
                    }
                    onDelete={() =>
                      onDeleteCourse(
                        course,
                      )
                    }
                  />
                </View>
              </View>
            ),
          )
        : null}
    </>
  );
}

type ProductImageCarouselProps = {
  productId: string;
  pictures: ResolvedProductPicture[];
  colors: ThemeColors;
};

const ProductImageCarousel = memo(
  function ProductImageCarousel({
    productId,
    pictures,
    colors,
  }: ProductImageCarouselProps) {
    const [
      containerWidth,
      setContainerWidth,
    ] = useState(0);

    const [
      activeIndex,
      setActiveIndex,
    ] = useState(0);

    const [
      viewerVisible,
      setViewerVisible,
    ] = useState(false);

    const [
      viewerStartIndex,
      setViewerStartIndex,
    ] = useState(0);

    useEffect(() => {
      setActiveIndex(0);
    }, [pictures.length]);

    const slideWidth =
      Math.max(
        containerWidth,
        1,
      );

    const handleScrollEnd =
      useCallback(
        (
          event:
            NativeSyntheticEvent<
              NativeScrollEvent
            >,
        ) => {
          if (
            containerWidth <=
            0
          ) {
            return;
          }

          const nextIndex =
            Math.round(
              event.nativeEvent
                .contentOffset.x /
                containerWidth,
            );

          setActiveIndex(
            Math.min(
              Math.max(
                nextIndex,
                0,
              ),
              Math.max(
                pictures.length -
                  1,
                0,
              ),
            ),
          );
        },
        [
          containerWidth,
          pictures.length,
        ],
      );

    const openViewer =
      useCallback(
        (index: number) => {
          setViewerStartIndex(
            index,
          );

          setViewerVisible(
            true,
          );
        },
        [],
      );

    if (
      pictures.length ===
      0
    ) {
      return (
        <View
          style={[
            styles.productImagePlaceholder,
            {
              backgroundColor:
                colors.surfaceSecondary,
            },
          ]}
        >
          <Ionicons
            name="image-outline"
            size={36}
            color={colors.muted}
          />

          <Text
            style={[
              styles.imageStatusText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            No product image
          </Text>
        </View>
      );
    }

    return (
      <>
        <View
          style={
            styles.carouselContainer
          }
          onLayout={(
            event,
          ) => {
            const nextWidth =
              Math.round(
                event.nativeEvent
                  .layout.width,
              );

            if (
              nextWidth >
                0 &&
              nextWidth !==
                containerWidth
            ) {
              setContainerWidth(
                nextWidth,
              );
            }
          }}
        >
          {containerWidth >
          0 ? (
            <FlatList
              data={pictures}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={
                false
              }
              bounces={false}
              decelerationRate="fast"
              keyExtractor={(
                picture,
              ) =>
                picture.id
              }
              getItemLayout={(
                _data,
                index,
              ) => ({
                length:
                  slideWidth,

                offset:
                  slideWidth *
                  index,

                index,
              })}
              initialNumToRender={
                1
              }
              maxToRenderPerBatch={
                2
              }
              windowSize={3}
              onMomentumScrollEnd={
                handleScrollEnd
              }
              renderItem={({
                item,
                index,
              }) => (
                <Pressable
                  onPress={() =>
                    openViewer(
                      index,
                    )
                  }
                  style={{
                    width:
                      slideWidth,

                    height:
                      220,
                  }}
                >
                  <CarouselImage
                    uri={
                      item.url
                    }
                    productId={
                      productId
                    }
                    index={
                      index
                    }
                    colors={
                      colors
                    }
                    resizeMode="cover"
                  />
                </Pressable>
              )}
            />
          ) : null}

          <View
            style={
              styles.carouselCounter
            }
          >
            <Ionicons
              name="images-outline"
              size={13}
              color="#ffffff"
            />

            <Text
              style={
                styles.carouselCounterText
              }
            >
              {activeIndex +
                1}
              /
              {
                pictures.length
              }
            </Text>
          </View>

          {pictures.length >
          1 ? (
            <View
              style={
                styles.carouselDots
              }
            >
              {pictures.map(
                (
                  picture,
                  index,
                ) => (
                  <View
                    key={
                      picture.id
                    }
                    style={[
                      styles.carouselDot,
                      index ===
                        activeIndex &&
                        styles.carouselDotActive,
                    ]}
                  />
                ),
              )}
            </View>
          ) : null}

          <View
            pointerEvents="none"
            style={
              styles.carouselTapHint
            }
          >
            <Ionicons
              name="expand-outline"
              size={14}
              color="#ffffff"
            />

            <Text
              style={
                styles.carouselTapHintText
              }
            >
              Tap to view
            </Text>
          </View>
        </View>

        <ProductImageViewer
          visible={
            viewerVisible
          }
          pictures={
            pictures
          }
          initialIndex={
            viewerStartIndex
          }
          productId={
            productId
          }
          onClose={() =>
            setViewerVisible(
              false,
            )
          }
        />
      </>
    );
  },
);

type CarouselImageProps = {
  uri: string;
  productId: string;
  index: number;
  colors: ThemeColors;
  resizeMode:
    | "cover"
    | "contain";
};

const CarouselImage = memo(
  function CarouselImage({
    uri,
    productId,
    index,
    colors,
    resizeMode,
  }: CarouselImageProps) {
    const [
      isLoading,
      setIsLoading,
    ] = useState(true);

    const [
      hasError,
      setHasError,
    ] = useState(false);

    useEffect(() => {
      setIsLoading(true);
      setHasError(false);
    }, [uri]);

    if (hasError) {
      return (
        <View
          style={[
            styles.carouselImageFallback,
            {
              backgroundColor:
                colors.surfaceSecondary,
            },
          ]}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={38}
            color={colors.muted}
          />

          <Text
            style={[
              styles.imageStatusText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            Image unavailable
          </Text>
        </View>
      );
    }

    return (
      <View
        style={
          styles.carouselImageSlide
        }
      >
        <Image
          source={{
            uri,
          }}
          style={
            styles.carouselImage
          }
          resizeMode={
            resizeMode
          }
          resizeMethod="resize"
          fadeDuration={0}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoad={() => {
            setIsLoading(false);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onError={(event) => {
            console.log(
              "CATALOG CAROUSEL IMAGE ERROR",
              {
                productId,
                imageIndex:
                  index,
                uri,
                error:
                  event.nativeEvent
                    .error,
              },
            );

            setIsLoading(false);
            setHasError(true);
          }}
        />

        {isLoading ? (
          <View
            style={
              styles.imageLoadingOverlay
            }
          >
            <ActivityIndicator
              size="small"
              color={colors.accent}
            />
          </View>
        ) : null}
      </View>
    );
  },
);

type ProductImageViewerProps = {
  visible: boolean;
  pictures: ResolvedProductPicture[];
  initialIndex: number;
  productId: string;
  onClose: () => void;
};

function ProductImageViewer({
  visible,
  pictures,
  initialIndex,
  productId,
  onClose,
}: ProductImageViewerProps) {
  const {
    width,
    height,
  } =
    useWindowDimensions();

  const listRef =
    useRef<
      FlatList<ResolvedProductPicture>
    >(null);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(
    initialIndex,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const safeIndex =
      Math.min(
        Math.max(
          initialIndex,
          0,
        ),
        Math.max(
          pictures.length -
            1,
          0,
        ),
      );

    setActiveIndex(
      safeIndex,
    );

    const timer =
      setTimeout(() => {
        listRef.current
          ?.scrollToIndex({
            index:
              safeIndex,

            animated:
              false,
          });
      }, 50);

    return () =>
      clearTimeout(timer);
  }, [
    visible,
    initialIndex,
    pictures.length,
  ]);

  const handleScrollEnd =
    useCallback(
      (
        event:
          NativeSyntheticEvent<
            NativeScrollEvent
          >,
      ) => {
        if (width <= 0) {
          return;
        }

        const nextIndex =
          Math.round(
            event.nativeEvent
              .contentOffset.x /
              width,
          );

        setActiveIndex(
          Math.min(
            Math.max(
              nextIndex,
              0,
            ),
            Math.max(
              pictures.length -
                1,
              0,
            ),
          ),
        );
      },
      [
        width,
        pictures.length,
      ],
    );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={
        onClose
      }
    >
      <SafeAreaView
        style={
          styles.viewerRoot
        }
      >
        <View
          style={
            styles.viewerHeader
          }
        >
          <Pressable
            onPress={
              onClose
            }
            hitSlop={12}
            style={
              styles.viewerCloseButton
            }
          >
            <Ionicons
              name="close"
              size={25}
              color="#ffffff"
            />
          </Pressable>

          <Text
            style={
              styles.viewerCounterText
            }
          >
            {activeIndex +
              1}
            /
            {
              pictures.length
            }
          </Text>

          <View
            style={
              styles.viewerHeaderSpacer
            }
          />
        </View>

        <FlatList
          ref={listRef}
          data={pictures}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={
            false
          }
          keyExtractor={(
            picture,
          ) =>
            picture.id
          }
          initialScrollIndex={
            Math.min(
              Math.max(
                initialIndex,
                0,
              ),
              Math.max(
                pictures.length -
                  1,
                0,
              ),
            )
          }
          getItemLayout={(
            _data,
            index,
          ) => ({
            length:
              width,

            offset:
              width *
              index,

            index,
          })}
          onMomentumScrollEnd={
            handleScrollEnd
          }
          onScrollToIndexFailed={(
            info,
          ) => {
            setTimeout(
              () => {
                listRef.current
                  ?.scrollToOffset({
                    offset:
                      info.index *
                      width,

                    animated:
                      false,
                  });
              },
              50,
            );
          }}
          renderItem={({
            item,
            index,
          }) => (
            <View
              style={{
                width,
                height:
                  Math.max(
                    height -
                      110,
                    300,
                  ),
              }}
            >
              <CarouselImage
                uri={
                  item.url
                }
                productId={
                  productId
                }
                index={
                  index
                }
                colors={
                  viewerColors
                }
                resizeMode="contain"
              />
            </View>
          )}
        />

        {pictures.length >
        1 ? (
          <View
            style={
              styles.viewerDots
            }
          >
            {pictures.map(
              (
                picture,
                index,
              ) => (
                <View
                  key={
                    picture.id
                  }
                  style={[
                    styles.viewerDot,
                    index ===
                      activeIndex &&
                      styles.viewerDotActive,
                  ]}
                />
              ),
            )}
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const viewerColors =
  {
    surfaceSecondary:
      "#151515",

    muted:
      "#A8A8A8",

    accent:
      "#FFFFFF",
  } as ThemeColors;

type CardActionsProps = {
  colors: ThemeColors;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function CardActions({
  colors,
  isDeleting,
  onEdit,
  onDelete,
}: CardActionsProps) {
  return (
    <View
      style={
        styles.actionRow
      }
    >
      <Pressable
        onPress={onEdit}
        style={[
          styles.editButton,
          {
            backgroundColor:
              colors.surfaceSecondary,

            borderColor:
              colors.border,
          },
        ]}
      >
        <Ionicons
          name="create-outline"
          size={17}
          color={
            colors.foreground
          }
        />

        <Text
          style={[
            styles.editButtonText,
            {
              color:
                colors.foreground,
            },
          ]}
        >
          Edit
        </Text>
      </Pressable>

      <Pressable
        disabled={
          isDeleting
        }
        onPress={
          onDelete
        }
        style={[
          styles.deleteButton,
          {
            borderColor:
              colors.danger,

            opacity:
              isDeleting
                ? 0.55
                : 1,
          },
        ]}
      >
        <Ionicons
          name="trash-outline"
          size={17}
          color={
            colors.danger
          }
        />

        <Text
          style={[
            styles.deleteButtonText,
            {
              color:
                colors.danger,
            },
          ]}
        >
          Delete
        </Text>
      </Pressable>
    </View>
  );
}

type CourseDetailProps = {
  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];

  label: string;
  value: string;
  colors: ThemeColors;
};

function CourseDetail({
  icon,
  label,
  value,
  colors,
}: CourseDetailProps) {
  return (
    <View
      style={
        styles.courseDetailRow
      }
    >
      <View
        style={[
          styles.courseDetailIcon,
          {
            backgroundColor:
              colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            colors.accent
          }
        />
      </View>

      <View
        style={
          styles.flexOne
        }
      >
        <Text
          style={[
            styles.detailLabel,
            {
              color:
                colors.muted,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.detailValue,
            {
              color:
                colors.foreground,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    flexOne: {
      flex: 1,
    },

    heroCard: {
      borderRadius: 26,
      padding: 18,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
      overflow: "hidden",
    },

    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor:
        "rgba(255,255,255,0.17)",
      alignItems: "center",
      justifyContent: "center",
    },

    heroTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    heroTitle: {
      color: "#ffffff",
      fontSize: 20,
      fontFamily:
        "Poppins_700Bold",
    },

    heroSubtitle: {
      marginTop: 3,
      color:
        "rgba(255,255,255,0.84)",
      fontSize: 12,
      lineHeight: 18,
      fontFamily:
        "Poppins_400Regular",
    },

    heroCountChip: {
      marginTop: 10,
      alignSelf:
        "flex-start",
      backgroundColor:
        "rgba(255,255,255,0.17)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },

    heroCountText: {
      color: "#ffffff",
      fontSize: 11,
      fontFamily:
        "Poppins_600SemiBold",
    },

    addCard: {
      minHeight: 112,
      borderWidth: 1,
      borderRadius: 20,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      overflow: "hidden",
    },

    addCardIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },

    addCardTextWrap: {
      flex: 1,
    },

    addCardTitle: {
      fontSize: 15,
      fontFamily:
        "Poppins_700Bold",
    },

    addCardSubtitle: {
      marginTop: 2,
      fontSize: 11,
      lineHeight: 17,
      fontFamily:
        "Poppins_400Regular",
    },

    errorCard: {
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      flexDirection: "row",
      gap: 10,
    },

    errorTitle: {
      fontSize: 13,
      fontFamily:
        "Poppins_700Bold",
    },

    errorSubtitle: {
      marginTop: 2,
      fontSize: 11,
      fontFamily:
        "Poppins_400Regular",
    },

    emptyCard: {
      minHeight: 310,
      borderWidth: 1,
      borderRadius: 24,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyTitle: {
      marginTop: 15,
      fontSize: 17,
      fontFamily:
        "Poppins_700Bold",
    },

    emptySubtitle: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 19,
      textAlign: "center",
      fontFamily:
        "Poppins_400Regular",
    },

    emptyButton: {
      marginTop: 17,
      minHeight: 46,
      borderRadius: 14,
      paddingHorizontal: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    emptyButtonText: {
      color: "#ffffff",
      fontSize: 12,
      fontFamily:
        "Poppins_600SemiBold",
    },

    productCard: {
      borderWidth: 1,
      borderRadius: 23,
      overflow: "hidden",
    },

    productImagePlaceholder: {
      width: "100%",
      height: 220,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    imageStatusText: {
      fontSize: 11,
      fontFamily:
        "Poppins_500Medium",
    },

    carouselContainer: {
      width: "100%",
      height: 220,
      position: "relative",
      overflow: "hidden",
      backgroundColor:
        "#E5E7EB",
    },

    carouselImageSlide: {
      width: "100%",
      height: "100%",
      position: "relative",
      overflow: "hidden",
    },

    carouselImage: {
      width: "100%",
      height: "100%",
    },

    carouselImageFallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    imageLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(255,255,255,0.30)",
    },

    carouselCounter: {
      position: "absolute",
      top: 12,
      right: 12,
      minHeight: 28,
      borderRadius: 999,
      paddingHorizontal: 9,
      backgroundColor:
        "rgba(0,0,0,0.65)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    carouselCounterText: {
      color: "#ffffff",
      fontSize: 11,
      fontFamily:
        "Poppins_600SemiBold",
    },

    carouselDots: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    carouselDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        "rgba(255,255,255,0.55)",
    },

    carouselDotActive: {
      width: 18,
      backgroundColor:
        "#ffffff",
    },

    carouselTapHint: {
      position: "absolute",
      left: 12,
      bottom: 10,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 5,
      backgroundColor:
        "rgba(0,0,0,0.58)",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    carouselTapHintText: {
      color: "#ffffff",
      fontSize: 9,
      fontFamily:
        "Poppins_500Medium",
    },

    viewerRoot: {
      flex: 1,
      backgroundColor:
        "#000000",
    },

    viewerHeader: {
      minHeight: 58,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    viewerCloseButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },

    viewerCounterText: {
      color: "#ffffff",
      fontSize: 13,
      fontFamily:
        "Poppins_600SemiBold",
    },

    viewerHeaderSpacer: {
      width: 42,
      height: 42,
    },

    viewerDots: {
      minHeight: 44,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },

    viewerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        "rgba(255,255,255,0.40)",
    },

    viewerDotActive: {
      width: 20,
      backgroundColor:
        "#ffffff",
    },

    cardContent: {
      padding: 15,
    },

    cardTitle: {
      fontSize: 17,
      lineHeight: 23,
      fontFamily:
        "Poppins_700Bold",
    },

    cardDescription: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 19,
      fontFamily:
        "Poppins_400Regular",
    },

    websiteButton: {
      marginTop: 12,
      height: 42,
      borderRadius: 13,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    websiteText: {
      flex: 1,
      fontSize: 12,
      fontFamily:
        "Poppins_600SemiBold",
    },

    actionRow: {
      marginTop: 14,
      flexDirection: "row",
      gap: 10,
    },

    editButton: {
      flex: 1,
      height: 43,
      borderWidth: 1,
      borderRadius: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    editButtonText: {
      fontSize: 12,
      fontFamily:
        "Poppins_600SemiBold",
    },

    deleteButton: {
      flex: 1,
      height: 43,
      borderWidth: 1,
      borderRadius: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    deleteButtonText: {
      fontSize: 12,
      fontFamily:
        "Poppins_600SemiBold",
    },

    courseCard: {
      borderWidth: 1,
      borderRadius: 23,
      overflow: "hidden",
    },

    courseIconPanel: {
      height: 95,
      alignItems: "center",
      justifyContent: "center",
    },

    courseContent: {
      padding: 15,
    },

    courseDetailRow: {
      marginTop: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    courseDetailIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },

    detailLabel: {
      fontSize: 10,
      fontFamily:
        "Poppins_400Regular",
    },

    detailValue: {
      marginTop: 1,
      fontSize: 12,
      lineHeight: 18,
      fontFamily:
        "Poppins_600SemiBold",
    },
  });