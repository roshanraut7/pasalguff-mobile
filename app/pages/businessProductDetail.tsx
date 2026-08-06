import React, {
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useSession } from "@/api/better-auth-client";
import { useAppTheme } from "@/hooks/useAppTheme";
import { toAbsoluteFileUrl } from "@/lib/file-url";

import {
  useCreateDirectChatMutation,
} from "@/store/api/chatApi";

import {
  type BusinessProductPicture,
  useGetBusinessProductsQuery,
} from "@/store/api/communityCatalogApi";

import {
  useGetPublicProfileQuery,
} from "@/store/api/profileApi";

type ResolvedProductPicture = {
    id: string;
    url: string;
    sortOrder: number;
};
function getParamValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
        return value[0] ?? "";
    }
    return value ?? "";
}
function resolveProductPictures(productId: string, pictures: BusinessProductPicture[] | undefined): ResolvedProductPicture[] {
    return (pictures ?? [])
        .map((picture, index) => {
        const absoluteUrl = toAbsoluteFileUrl(picture.url);
        if (!absoluteUrl) {
            return null;
        }
        return {
            id: picture.id ||
                `${productId}-${index}`,
            url: absoluteUrl,
            sortOrder: picture.sortOrder ??
                index,
        };
    })
        .filter((picture): picture is ResolvedProductPicture => picture !== null)
        .sort((first, second) => first.sortOrder -
        second.sortOrder);
}
function normalizeWebsiteLink(websiteLink: string) {
    const trimmed = websiteLink.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return `https://${trimmed}`;
}
async function openUrl(url: string, errorTitle: string) {
    try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
            Alert.alert(errorTitle, "This action is not available on this device.");
            return;
        }
        await Linking.openURL(url);
    }
    catch {
        Alert.alert(errorTitle, "Please try again.");
    }
}
async function openWebsite(websiteLink: string) {
    await openUrl(normalizeWebsiteLink(websiteLink), "Unable to open website");
}
async function openPhone(phone: string) {
    const normalizedPhone = phone.replace(/[^\d+]/g, "");
    await openUrl(`tel:${normalizedPhone}`, "Unable to make call");
}
async function openEmail(
  email: string,
  productName?: string,
) {
  const cleanEmail =
    email
      .trim()
      .replace(
        /^mailto:/i,
        "",
      );

  const emailIsValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      cleanEmail,
    );

  if (!emailIsValid) {
    Alert.alert(
      "Invalid email",
      "This business has not provided a valid public email address.",
    );

    return;
  }

  const subject =
    productName
      ? `Product enquiry: ${productName}`
      : "Product enquiry";

  const body =
    productName
      ? `Hello, I am interested in ${productName}.`
      : "Hello, I am interested in one of your products.";

  const nativeEmailUrl =
    `mailto:${cleanEmail}` +
    `?subject=${encodeURIComponent(
      subject,
    )}` +
    `&body=${encodeURIComponent(
      body,
    )}`;

  try {
    /**
     * Try the installed mail application first.
     *
     * Do not call canOpenURL() first because Android may return
     * false unless the mail scheme is declared in manifest queries.
     */
    await Linking.openURL(
      nativeEmailUrl,
    );

    return;
  } catch {
    /**
     * An emulator or device may not have a default mail application.
     * Fall back to Gmail compose in the browser so the action still works.
     */
    const gmailComposeUrl =
      "https://mail.google.com/mail/?" +
      "view=cm&fs=1" +
      `&to=${encodeURIComponent(
        cleanEmail,
      )}` +
      `&su=${encodeURIComponent(
        subject,
      )}` +
      `&body=${encodeURIComponent(
        body,
      )}`;

    try {
      await Linking.openURL(
        gmailComposeUrl,
      );
    } catch {
      Alert.alert(
        "Unable to open email",
        `Send your enquiry manually to ${cleanEmail}.`,
      );
    }
  }
}


type ProductImageCarouselProps = {
  pictures: ResolvedProductPicture[];
};

function ProductImageCarousel({
  pictures,
}: ProductImageCarouselProps) {
  const {
    colors,
  } = useAppTheme();

  const {
    width: windowWidth,
  } = useWindowDimensions();

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  /**
   * The parent page has 16px horizontal padding on both sides.
   * Use the remaining width so each swipe lands on exactly one image.
   */
  const carouselWidth =
    Math.max(
      windowWidth - 32,
      280,
    );

  const carouselHeight =
    Math.min(
      440,
      Math.max(
        320,
        carouselWidth * 1.04,
      ),
    );

  if (
    pictures.length === 0
  ) {
    return (
      <View
        style={[
          galleryStyles.emptyImage,
          {
            backgroundColor:
              colors.surfaceSecondary,

            borderColor:
              colors.border,

            height:
              carouselHeight,
          },
        ]}
      >
        <Ionicons
          name="images-outline"
          size={42}
          color={colors.muted}
        />

        <Text
          style={[
            galleryStyles.emptyText,
            {
              color:
                colors.muted,
            },
          ]}
        >
          No product images
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View
        style={[
          galleryStyles.carouselFrame,
          {
            width:
              carouselWidth,

            height:
              carouselHeight,

            backgroundColor:
              colors.surfaceSecondary,
          },
        ]}
      >
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={
            false
          }
          scrollEventThrottle={16}
          onMomentumScrollEnd={(
            event,
          ) => {
            const nextIndex =
              Math.round(
                event.nativeEvent
                  .contentOffset.x /
                  carouselWidth,
              );

            setActiveIndex(
              Math.max(
                0,
                Math.min(
                  nextIndex,
                  pictures.length - 1,
                ),
              ),
            );
          }}
        >
          {pictures.map(
            (
              picture,
              index,
            ) => (
              <View
                key={picture.id}
                style={{
                  width:
                    carouselWidth,

                  height:
                    carouselHeight,
                }}
              >
                <Image
                  source={{
                    uri:
                      picture.url,
                  }}
                  style={
                    galleryStyles.carouselImage
                  }
                  resizeMode="cover"
                  accessibilityLabel={`Product image ${index + 1} of ${pictures.length}`}
                  onError={(
                    event,
                  ) => {
                    console.log(
                      "Product image failed:",
                      picture.url,
                      event.nativeEvent
                        .error,
                    );
                  }}
                />
              </View>
            ),
          )}
        </ScrollView>

        <View
          style={
            galleryStyles.photoCountBadge
          }
        >
          <Ionicons
            name="images-outline"
            size={14}
            color="#ffffff"
          />

          <Text
            style={
              galleryStyles.photoCountText
            }
          >
            {activeIndex + 1}
            {" / "}
            {pictures.length}
          </Text>
        </View>
      </View>

      {pictures.length > 1 ? (
        <View
          style={
            galleryStyles.dotsRow
          }
        >
          {pictures.map(
            (
              picture,
              index,
            ) => {
              const isActive =
                index ===
                activeIndex;

              return (
                <View
                  key={
                    `dot-${picture.id}`
                  }
                  style={[
                    galleryStyles.dot,
                    {
                      width:
                        isActive
                          ? 22
                          : 7,

                      backgroundColor:
                        isActive
                          ? colors.accent
                          : colors.border,
                    },
                  ]}
                />
              );
            },
          )}
        </View>
      ) : null}

      {pictures.length > 1 ? (
        <View
          style={
            galleryStyles.swipeHint
          }
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={15}
            color={colors.muted}
          />

          <Text
            style={[
              galleryStyles.swipeHintText,
              {
                color:
                  colors.muted,
              },
            ]}
          >
            Swipe to view all product photos
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const galleryStyles =
  StyleSheet.create({
    carouselFrame: {
      overflow:
        "hidden",

      borderRadius:
        28,

      position:
        "relative",
    },

    carouselImage: {
      width:
        "100%",

      height:
        "100%",
    },

    photoCountBadge: {
      position:
        "absolute",

      right:
        14,

      bottom:
        14,

      minHeight:
        32,

      paddingHorizontal:
        11,

      borderRadius:
        16,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        6,

      backgroundColor:
        "rgba(0,0,0,0.66)",
    },

    photoCountText: {
      color:
        "#ffffff",

      fontSize:
        11,

      fontFamily:
        "Poppins_600SemiBold",
    },

    dotsRow: {
      marginTop:
        12,

      minHeight:
        10,

      flexDirection:
        "row",

      flexWrap:
        "wrap",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap:
        6,
    },

    dot: {
      height:
        7,

      borderRadius:
        999,
    },

    swipeHint: {
      marginTop:
        8,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap:
        5,
    },

    swipeHintText: {
      fontSize:
        10,

      fontFamily:
        "Poppins_400Regular",
    },

    emptyImage: {
      width:
        "100%",

      borderWidth:
        1,

      borderRadius:
        28,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyText: {
      marginTop:
        10,

      fontSize:
        12,

      fontFamily:
        "Poppins_400Regular",
    },
  });


type BusinessContactCardProps = {
    businessName: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    productName: string;
    isVerified: boolean;
    canMessage: boolean;
    isOwnBusiness: boolean;
    isCreatingChat: boolean;
    onMessage: () => void;
};
type ContactActionProps = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    loading?: boolean;
};
function ContactAction({ icon, label, onPress, loading = false, }: ContactActionProps) {
    const { colors, } = useAppTheme();
    return (<Pressable onPress={onPress} disabled={loading} style={({ pressed, }) => [
            contactStyles.actionButton,
            {
                backgroundColor: colors
                    .surfaceSecondary,
                borderColor: colors.border,
                opacity: pressed
                    ? 0.68
                    : 1,
            },
        ]}>
      <View style={[
            contactStyles.actionIcon,
            {
                backgroundColor: colors.surface,
            },
        ]}>
        {loading ? (<ActivityIndicator size="small" color={colors.accent}/>) : (<Ionicons name={icon} size={19} color={colors.accent}/>)}
      </View>

      <Text numberOfLines={1} style={[
            contactStyles.actionText,
            {
                color: colors.foreground,
            },
        ]}>
        {label}
      </Text>
    </Pressable>);
}
function BusinessContactCard({ businessName, address, phone, email, website, productName, isVerified, canMessage, isOwnBusiness, isCreatingChat, onMessage, }: BusinessContactCardProps) {
    const { colors, } = useAppTheme();
    const hasDirectContact = Boolean(phone ||
        email ||
        website);
    return (<View style={[
            contactStyles.card,
            {
                backgroundColor: colors.surface,
                borderColor: colors.border,
            },
        ]}>
      <View style={contactStyles.headingRow}>
        <View style={[
            contactStyles.businessIcon,
            {
                backgroundColor: colors
                    .surfaceSecondary,
            },
        ]}>
          <Ionicons name="storefront-outline" size={22} color={colors.accent}/>
        </View>

        <View style={contactStyles.headingText}>
          <View style={contactStyles.nameRow}>
            <Text numberOfLines={2} style={[
            contactStyles.businessName,
            {
                color: colors.foreground,
            },
        ]}>
              {businessName}
            </Text>

            {isVerified ? (<Ionicons name="checkmark-circle" size={17} color={colors.accent}/>) : null}
          </View>

          <Text style={[
            contactStyles.contactLabel,
            {
                color: colors.muted,
            },
        ]}>
            Contact this business about the product
          </Text>
        </View>
      </View>

      {address ? (<View style={[
                contactStyles.addressRow,
                {
                    backgroundColor: colors
                        .surfaceSecondary,
                },
            ]}>
          <Ionicons name="location-outline" size={17} color={colors.accent}/>

          <Text style={[
                contactStyles.addressText,
                {
                    color: colors.muted,
                },
            ]}>
            {address}
          </Text>
        </View>) : null}

      <View style={contactStyles.actions}>
        {canMessage ? (
          <ContactAction
            icon="chatbubble-ellipses-outline"
            label="Message"
            loading={isCreatingChat}
            onPress={onMessage}
          />
        ) : null}

        {phone ? (<ContactAction icon="call-outline" label="Call" onPress={() => {
                void openPhone(phone);
            }}/>) : null}

        {email ? (<ContactAction icon="mail-outline" label="Email" onPress={() => {
                void openEmail(email, productName);
            }}/>) : null}

        {website ? (<ContactAction icon="globe-outline" label="Website" onPress={() => {
                void openWebsite(website);
            }}/>) : null}

      </View>

      {!hasDirectContact &&
            !canMessage ? (<Text style={[
                contactStyles.privacyText,
                {
                    color: colors.muted,
                },
            ]}>
          Direct contact details are hidden by the business profile’s privacy settings.
        </Text>) : null}
    </View>);
}
const contactStyles = StyleSheet.create({
    card: {
        marginTop: 20,
        borderWidth: 1,
        borderRadius: 24,
        padding: 16,
    },
    headingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    businessIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    headingText: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    businessName: {
        flexShrink: 1,
        fontSize: 16,
        lineHeight: 22,
        fontFamily: "Poppins_700Bold",
    },
    contactLabel: {
        marginTop: 2,
        fontSize: 11,
        lineHeight: 17,
        fontFamily: "Poppins_400Regular",
    },
    addressRow: {
        marginTop: 14,
        borderRadius: 16,
        padding: 12,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    addressText: {
        flex: 1,
        fontSize: 11,
        lineHeight: 17,
        fontFamily: "Poppins_400Regular",
    },
    actions: {
        marginTop: 14,
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 9,
    },
    actionButton: {
        minWidth: 98,
        maxWidth: "100%",
        minHeight: 46,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 7,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    actionIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    actionText: {
        flexShrink: 1,
        fontSize: 11,
        fontFamily: "Poppins_600SemiBold",
    },
    privacyText: {
        marginTop: 14,
        fontSize: 10,
        lineHeight: 17,
        fontFamily: "Poppins_400Regular",
    },
});


export default function ProductDetailScreen() {
    const params = useLocalSearchParams<{
        communityId?: string | string[];
        communityName?: string | string[];
        businessOwnerId?: string | string[];
        productId?: string | string[];
    }>();

    const communityId = getParamValue(params.communityId);
    const communityName =
        getParamValue(params.communityName) || "Business";
    const businessOwnerId = getParamValue(params.businessOwnerId);
    const productId = getParamValue(params.productId);

    const router = useRouter();
    const { colors, } = useAppTheme();
    const insets = useSafeAreaInsets();
    const { data: session, } = useSession();
    const { data: productResponse, isLoading: productsLoading, isFetching: productsFetching, error: productsError, refetch: refetchProducts, } = useGetBusinessProductsQuery(communityId, {
        skip: !communityId,
        refetchOnMountOrArgChange: true,
    });
    const { data: businessProfile, isLoading: profileLoading, } = useGetPublicProfileQuery(businessOwnerId, {
        skip: !businessOwnerId,
    });
    const [createDirectChat, { isLoading: isCreatingChat, },] = useCreateDirectChatMutation();
    const product = useMemo(() => (productResponse
        ?.products ??
        []).find((item) => item.id ===
        productId) ??
        null, [
        productId,
        productResponse
            ?.products,
    ]);
    const pictures = useMemo(() => product
        ? resolveProductPictures(product.id, product.pictures)
        : [], [product]);
    const isOwnBusiness = Boolean(session?.user?.id &&
        businessOwnerId &&
        session.user.id ===
            businessOwnerId);
    /**
     * Always show the Message action when the business owner is known.
     *
     * The backend is the final authority. It may:
     * - open an existing direct chat,
     * - create a new accepted chat,
     * - create a pending message request, or
     * - reject the action according to privacy rules.
     *
     * Do not hide the icon only because the public-profile response
     * does not contain permissions.canMessage.
     */
    const canMessage = Boolean(
        businessOwnerId,
    );
    const contact = businessProfile
        ?.about;
    const businessName = contact
        ?.organizationName ||
        businessProfile?.name ||
        communityName;
    const handleMessage = async () => {
        if (isCreatingChat) {
            return;
        }

        if (!businessOwnerId) {
            Alert.alert(
                "Business owner missing",
                "The community owner information is unavailable.",
            );
            return;
        }

        if (isOwnBusiness) {
            Alert.alert(
                "This is your business",
                "You cannot start a direct chat with yourself.",
            );
            return;
        }

        try {
            const chat = await createDirectChat({
                targetUserId: businessOwnerId,
                body: communityId
                    ? {
                        sourceCommunityId: communityId,
                    }
                    : {},
            }).unwrap();

            if (!chat?.id) {
                throw new Error("Chat ID was not returned.");
            }

            /**
             * Open the exact Expo Router dynamic route used by
             * app/messages/[id].tsx. The ConversationScreen reads
             * this value with useLocalSearchParams<{ id: string }>().
             */
            router.push({
                pathname: "/messages/[id]",
                params: {
                    id: chat.id,
                },
            } as never);
        }
        catch (error: any) {
            console.log(
                "Open product chat failed:",
                error,
            );

            Alert.alert(
                "Unable to start chat",
                error?.data?.message ||
                    error?.message ||
                    "Please try again.",
            );
        }
    };
    if (!communityId ||
        !productId) {
        return (<SafeAreaView style={[
                detailStyles.centerPage,
                {
                    backgroundColor: colors.background,
                },
            ]}>
        <Ionicons name="warning-outline" size={38} color={colors.warning}/>

        <Text style={[
                detailStyles.centerTitle,
                {
                    color: colors.foreground,
                },
            ]}>
          Product information missing
        </Text>

        <Text style={[
                detailStyles.centerDescription,
                {
                    color: colors.muted,
                },
            ]}>
          Open this product from the business catalogue.
        </Text>

        <Pressable onPress={() => router.back()} style={[
                detailStyles.goBackButton,
                {
                    backgroundColor: colors.accent,
                },
            ]}>
          <Text style={[
                detailStyles.goBackText,
                {
                    color: colors
                        .accentForeground,
                },
            ]}>
            Go Back
          </Text>
        </Pressable>
      </SafeAreaView>);
    }
    if (productsLoading) {
        return (<SafeAreaView style={[
                detailStyles.centerPage,
                {
                    backgroundColor: colors.background,
                },
            ]}>
        <ActivityIndicator size="large" color={colors.accent}/>

        <Text style={[
                detailStyles.loadingText,
                {
                    color: colors.muted,
                },
            ]}>
          Loading product...
        </Text>
      </SafeAreaView>);
    }
    if (productsError ||
        !product) {
        return (<SafeAreaView style={[
                detailStyles.centerPage,
                {
                    backgroundColor: colors.background,
                },
            ]}>
        <Ionicons name="alert-circle-outline" size={38} color={colors.danger}/>

        <Text style={[
                detailStyles.centerTitle,
                {
                    color: colors.foreground,
                },
            ]}>
          Product not found
        </Text>

        <Text style={[
                detailStyles.centerDescription,
                {
                    color: colors.muted,
                },
            ]}>
          This product may have been removed.
        </Text>

        <Pressable onPress={() => router.back()} style={[
                detailStyles.goBackButton,
                {
                    backgroundColor: colors.accent,
                },
            ]}>
          <Text style={[
                detailStyles.goBackText,
                {
                    color: colors
                        .accentForeground,
                },
            ]}>
            Back to catalogue
          </Text>
        </Pressable>
      </SafeAreaView>);
    }
    return (<SafeAreaView edges={[
            "top",
            "left",
            "right",
        ]} style={[
            detailStyles.root,
            {
                backgroundColor: colors.background,
            },
        ]}>
      <View style={[
            detailStyles.header,
            {
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
            },
        ]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed, }) => [
            detailStyles.headerButton,
            {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed
                    ? 0.65
                    : 1,
            },
        ]}>
          <Ionicons name="chevron-back" size={23} color={colors.foreground}/>
        </Pressable>

        <View style={detailStyles.headerText}>
          <Text numberOfLines={1} style={[
            detailStyles.headerTitle,
            {
                color: colors.foreground,
            },
        ]}>
            Product Details
          </Text>

          <Text numberOfLines={1} style={[
            detailStyles.headerSubtitle,
            {
                color: colors.muted,
            },
        ]}>
            {communityName}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={productsFetching &&
                !productsLoading} onRefresh={refetchProducts} tintColor={colors.accent} colors={[
                colors.accent,
            ]} progressBackgroundColor={colors.surface}/>} contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 24) + 34,
        }}>
        <ProductImageCarousel pictures={pictures}/>

        <View style={detailStyles.titleSection}>
          <View style={detailStyles.businessPill}>
            <Ionicons name="storefront-outline" size={14} color={colors.accent}/>

            <Text numberOfLines={1} style={[
            detailStyles.businessPillText,
            {
                color: colors.accent,
            },
        ]}>
              {communityName}
            </Text>
          </View>

          <Text style={[
            detailStyles.productTitle,
            {
                color: colors.foreground,
            },
        ]}>
            {product.name}
          </Text>

          {product.description ? (<View style={[
                detailStyles.descriptionCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
            ]}>
              <Text style={[
                detailStyles.descriptionHeading,
                {
                    color: colors.foreground,
                },
            ]}>
                About this product
              </Text>

              <Text style={[
                detailStyles.description,
                {
                    color: colors.muted,
                },
            ]}>
                {product.description}
              </Text>
            </View>) : null}

          {product.websiteLink ? (<Pressable onPress={() => {
                if (product.websiteLink) {
                    void openWebsite(product.websiteLink);
                }
            }} style={({ pressed, }) => [
                detailStyles.productWebsiteButton,
                {
                    backgroundColor: colors.accent,
                    opacity: pressed
                        ? 0.74
                        : 1,
                },
            ]}>
              <Ionicons name="globe-outline" size={19} color={colors
                .accentForeground}/>

              <Text style={[
                detailStyles.productWebsiteText,
                {
                    color: colors
                        .accentForeground,
                },
            ]}>
                Visit product website
              </Text>

              <Ionicons name="open-outline" size={18} color={colors
                .accentForeground}/>
            </Pressable>) : null}

          {profileLoading ? (<View style={[
                detailStyles.profileLoading,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
            ]}>
              <ActivityIndicator size="small" color={colors.accent}/>

              <Text style={[
                detailStyles.profileLoadingText,
                {
                    color: colors.muted,
                },
            ]}>
                Loading business contact...
              </Text>
            </View>) : (<BusinessContactCard businessName={businessName} address={contact
                ?.organizationAddress} phone={contact
                ?.publicPhone} email={contact
                ?.publicEmail} website={contact
                ?.website} productName={product.name} isVerified={businessProfile
                ?.isVerified ===
                true} canMessage={canMessage} isOwnBusiness={isOwnBusiness} isCreatingChat={isCreatingChat} onMessage={handleMessage}/>)}
        </View>
      </ScrollView>
    </SafeAreaView>);
}
const detailStyles = StyleSheet.create({
    root: {
        flex: 1,
    },
    header: {
        minHeight: 70,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: "Poppins_700Bold",
    },
    headerSubtitle: {
        marginTop: 2,
        fontSize: 11,
        fontFamily: "Poppins_400Regular",
    },
    titleSection: {
        marginTop: 22,
    },
    businessPill: {
        alignSelf: "flex-start",
        maxWidth: "100%",
        minHeight: 32,
        paddingHorizontal: 11,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(33, 150, 83, 0.10)",
    },
    businessPillText: {
        flexShrink: 1,
        fontSize: 11,
        fontFamily: "Poppins_600SemiBold",
    },
    productTitle: {
        marginTop: 12,
        fontSize: 28,
        lineHeight: 37,
        fontFamily: "Poppins_700Bold",
    },
    descriptionCard: {
        marginTop: 18,
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
    },
    descriptionHeading: {
        fontSize: 15,
        fontFamily: "Poppins_700Bold",
    },
    description: {
        marginTop: 7,
        fontSize: 13,
        lineHeight: 22,
        fontFamily: "Poppins_400Regular",
    },
    productWebsiteButton: {
        minHeight: 52,
        marginTop: 16,
        borderRadius: 17,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
    },
    productWebsiteText: {
        flex: 1,
        textAlign: "center",
        fontSize: 13,
        fontFamily: "Poppins_700Bold",
    },
    profileLoading: {
        minHeight: 88,
        marginTop: 20,
        borderWidth: 1,
        borderRadius: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    profileLoadingText: {
        fontSize: 11,
        fontFamily: "Poppins_400Regular",
    },
    centerPage: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    centerTitle: {
        marginTop: 12,
        textAlign: "center",
        fontSize: 19,
        fontFamily: "Poppins_700Bold",
    },
    centerDescription: {
        marginTop: 6,
        textAlign: "center",
        fontSize: 12,
        lineHeight: 19,
        fontFamily: "Poppins_400Regular",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 12,
        fontFamily: "Poppins_400Regular",
    },
    goBackButton: {
        marginTop: 18,
        borderRadius: 14,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    goBackText: {
        fontSize: 13,
        fontFamily: "Poppins_600SemiBold",
    },
});