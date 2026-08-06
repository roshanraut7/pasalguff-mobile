import React, {
  memo,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  useGetPublicProfileQuery,
} from "@/store/api/profileApi";

import {
  type BusinessProduct,
  type BusinessProductPicture,
  useGetBusinessProductsQuery,
} from "@/store/api/communityCatalogApi";

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
function hashText(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash =
            (hash * 31 +
                value.charCodeAt(index)) >>> 0;
    }
    return hash;
}
function getPinterestImageHeight(seed: string, index = 0) {
    const variants = [
        210,
        226,
        242,
        218,
        250,
    ];
    const hash = hashText(`${seed}-${index}`);
    return variants[hash %
        variants.length];
}
type ProductCardProps = {
    product: BusinessProduct;
    imageHeight: number;
    onPress: () => void;
};
function PinterestProductCard({ product, imageHeight, onPress, }: ProductCardProps) {
    const { colors, } = useAppTheme();
    const pictures = useMemo(() => resolveProductPictures(product.id, product.pictures), [
        product.id,
        product.pictures,
    ]);
    const coverPicture = pictures[0]?.url ??
        null;
    return (<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${product.name}`} style={({ pressed, }) => [
            productCardStyles.card,
            {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed
                    ? 0.78
                    : 1,
            },
        ]}>
      <View style={[
            productCardStyles.imageWrap,
            {
                height: imageHeight,
                backgroundColor: colors
                    .surfaceSecondary,
            },
        ]}>
        {coverPicture ? (<Image source={{
                uri: coverPicture,
            }} style={productCardStyles.image} resizeMode="cover" onError={(event) => {
                console.log("Product image failed:", coverPicture, event.nativeEvent
                    .error);
            }}/>) : (<View style={productCardStyles.fallback}>
            <Ionicons name="cube-outline" size={34} color={colors.muted}/>
          </View>)}

        {pictures.length >
            1 ? (<View style={productCardStyles.pictureCount}>
            <Ionicons name="images-outline" size={12} color="#ffffff"/>

            <Text style={productCardStyles.pictureCountText}>
              {pictures.length}
            </Text>
          </View>) : null}
      </View>

      <View style={productCardStyles.body}>
        <Text numberOfLines={2} style={[
            productCardStyles.name,
            {
                color: colors.foreground,
            },
        ]}>
          {product.name}
        </Text>

        <Text
          numberOfLines={2}
          style={[
            productCardStyles.description,
            {
              color:
                colors.muted,
            },
          ]}
        >
          {product.description?.trim() ||
            "No description provided."}
        </Text>

        <View style={productCardStyles.footer}>
          <Text style={[
            productCardStyles.footerText,
            {
                color: colors.accent,
            },
        ]}>
            View product
          </Text>

          <Ionicons name="arrow-forward" size={14} color={colors.accent}/>
        </View>
      </View>
    </Pressable>);
}
const MemoizedPinterestProductCard = memo(PinterestProductCard);
const productCardStyles = StyleSheet.create({
    card: {
        overflow: "hidden",
        borderWidth: 1,
        borderRadius: 22,
    },
    imageWrap: {
        width: "100%",
        overflow: "hidden",
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    fallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    pictureCount: {
        position: "absolute",
        right: 8,
        bottom: 8,
        minWidth: 34,
        height: 25,
        paddingHorizontal: 7,
        borderRadius: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        backgroundColor: "rgba(0,0,0,0.62)",
    },
    pictureCountText: {
        color: "#ffffff",
        fontSize: 10,
        fontFamily: "Poppins_600SemiBold",
    },
    body: {
        minHeight: 132,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 11,
    },
    name: {
        minHeight: 40,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "Poppins_700Bold",
    },
    description: {
        minHeight: 34,
        marginTop: 5,
        fontSize: 10,
        lineHeight: 16,
        fontFamily: "Poppins_400Regular",
    },
    footer: {
        minHeight: 24,
        marginTop: "auto",
        paddingTop: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    footerText: {
        flex: 1,
        minWidth: 0,
        fontSize: 10,
        fontFamily: "Poppins_600SemiBold",
    },
});


type ColumnItem = {
    product: BusinessProduct;
    imageHeight: number;
};
type ProductGridProps = {
    products: BusinessProduct[];
    onProductPress: (product: BusinessProduct) => void;
};
function PinterestProductGrid({ products, onProductPress, }: ProductGridProps) {
    const { leftItems, rightItems, } = useMemo(() => {
        const left: ColumnItem[] = [];
        const right: ColumnItem[] = [];
        let leftHeight = 0;
        let rightHeight = 0;
        products.forEach((product, index) => {
            const imageHeight = getPinterestImageHeight(product.id, index);
            const estimatedBodyHeight = 144;
            const estimatedHeight = imageHeight +
                estimatedBodyHeight +
                12;
            const item = {
                product,
                imageHeight,
            };
            if (leftHeight <=
                rightHeight) {
                left.push(item);
                leftHeight +=
                    estimatedHeight;
            }
            else {
                right.push(item);
                rightHeight +=
                    estimatedHeight;
            }
        });
        return {
            leftItems: left,
            rightItems: right,
        };
    }, [products]);
    return (<View style={productGridStyles.grid}>
      <View style={productGridStyles.column}>
        {leftItems.map(({ product, imageHeight, }) => (<MemoizedPinterestProductCard key={product.id} product={product} imageHeight={imageHeight} onPress={() => onProductPress(product)}/>))}
      </View>

      <View style={productGridStyles.column}>
        {rightItems.map(({ product, imageHeight, }) => (<MemoizedPinterestProductCard key={product.id} product={product} imageHeight={imageHeight} onPress={() => onProductPress(product)}/>))}
      </View>
    </View>);
}
const productGridStyles = StyleSheet.create({
    grid: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    column: {
        flex: 1,
        minWidth: 0,
        gap: 12,
    },
});


export default function BusinessCatalogScreen() {
    const params = useLocalSearchParams<{
        communityId?: string | string[];
        communityName?: string | string[];
        businessOwnerId?: string | string[];
    }>();

    const communityId = getParamValue(params.communityId);
    const communityName =
        getParamValue(params.communityName) || "Business";
    const businessOwnerId = getParamValue(params.businessOwnerId);

    const router = useRouter();
    const { colors, } = useAppTheme();
    const insets = useSafeAreaInsets();

    const {
      data: session,
    } = useSession();

    const [
      searchValue,
      setSearchValue,
    ] = useState("");

    const isOwnBusiness =
      Boolean(
        session?.user?.id &&
        businessOwnerId &&
        session.user.id ===
          businessOwnerId,
      );

    const {
      data: businessProfile,
      isLoading:
        isBusinessProfileLoading,
    } =
      useGetPublicProfileQuery(
        businessOwnerId,
        {
          skip:
            !businessOwnerId ||
            isOwnBusiness,
        },
      );

    const [
      createDirectChat,
      {
        isLoading:
          isCreatingChat,
      },
    ] =
      useCreateDirectChatMutation();

    const canMessageBusiness =
      Boolean(
        businessProfile
          ?.permissions
          ?.canMessage,
      );
    const { data: productResponse, isLoading, isFetching, error, refetch, } = useGetBusinessProductsQuery(communityId, {
        skip: !communityId,
        refetchOnMountOrArgChange: true,
    });
    const products = productResponse
        ?.products ??
        [];
    const filteredProducts = useMemo(() => {
        const query = searchValue
            .trim()
            .toLowerCase();
        if (!query) {
            return products;
        }
        return products.filter((product) => product.name
            .toLowerCase()
            .includes(query) ||
            (product.description ??
                "")
                .toLowerCase()
                .includes(query));
    }, [
        products,
        searchValue,
    ]);
    const handleRefresh =
      useCallback(
        async () => {
          await refetch();
        },
        [refetch],
      );

    const handleMessageBusiness =
      useCallback(
        async () => {
          if (
            !businessOwnerId ||
            isOwnBusiness ||
            !canMessageBusiness ||
            isCreatingChat
          ) {
            return;
          }

          try {
            const chat =
              await createDirectChat({
                targetUserId:
                  businessOwnerId,

                body:
                  communityId
                    ? {
                        sourceCommunityId:
                          communityId,
                      }
                    : {},
              }).unwrap();

            router.push(
              `/messages/${chat.id}` as never,
            );
          } catch (
            error: any
          ) {
            Alert.alert(
              "Unable to start chat",
              error?.data
                ?.message ||
                "Please try again.",
            );
          }
        },
        [
          businessOwnerId,
          canMessageBusiness,
          communityId,
          createDirectChat,
          isCreatingChat,
          isOwnBusiness,
          router,
        ],
      );
    if (!communityId) {
        return (<SafeAreaView style={[
                catalogStyles.centerPage,
                {
                    backgroundColor: colors.background,
                },
            ]}>
        <Ionicons name="warning-outline" size={38} color={colors.warning}/>

        <Text style={[
                catalogStyles.centerTitle,
                {
                    color: colors.foreground,
                },
            ]}>
          Catalogue information missing
        </Text>

        <Text style={[
                catalogStyles.centerDescription,
                {
                    color: colors.muted,
                },
            ]}>
          Open this page from a business community.
        </Text>

        <Pressable onPress={() => router.back()} style={[
                catalogStyles.goBackButton,
                {
                    backgroundColor: colors.accent,
                },
            ]}>
          <Text style={[
                catalogStyles.goBackText,
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
    return (<SafeAreaView edges={[
            "top",
            "left",
            "right",
        ]} style={[
            catalogStyles.root,
            {
                backgroundColor: colors.background,
            },
        ]}>
      <View style={[
            catalogStyles.header,
            {
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
            },
        ]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed, }) => [
            catalogStyles.headerButton,
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

        <View style={catalogStyles.headerText}>
          <Text numberOfLines={1} style={[
            catalogStyles.headerTitle,
            {
                color: colors.foreground,
            },
        ]}>
            Product Catalogue
          </Text>

          <Text numberOfLines={1} style={[
            catalogStyles.headerSubtitle,
            {
                color: colors.muted,
            },
        ]}>
            {communityName}
          </Text>
        </View>

        <View style={[
            catalogStyles.countBadge,
            {
                backgroundColor: colors
                    .surfaceSecondary,
            },
        ]}>
          <Text style={[
            catalogStyles.countText,
            {
                color: colors.accent,
            },
        ]}>
            {products.length}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 24) + 30,
        }} refreshControl={<RefreshControl refreshing={isFetching &&
                !isLoading} onRefresh={handleRefresh} tintColor={colors.accent} colors={[
                colors.accent,
            ]} progressBackgroundColor={colors.surface}/>}>
        <View style={[
            catalogStyles.searchBar,
            {
                backgroundColor: colors.surface,
                borderColor: colors.border,
            },
        ]}>
          <Ionicons name="search-outline" size={19} color={colors.muted}/>

          <TextInput value={searchValue} onChangeText={setSearchValue} placeholder="Search products" placeholderTextColor={colors.placeholder} returnKeyType="search" autoCapitalize="none" autoCorrect={false} style={[
            catalogStyles.searchInput,
            {
                color: colors.foreground,
            },
        ]}/>

          {searchValue ? (<Pressable onPress={() => setSearchValue("")} hitSlop={8}>
              <Ionicons name="close-circle" size={19} color={colors.muted}/>
            </Pressable>) : null}
        </View>

        <View style={catalogStyles.intro}>
          <Text style={[
            catalogStyles.sectionTitle,
            {
                color: colors.foreground,
            },
        ]}>
            Discover products
          </Text>

          <Text style={[
            catalogStyles.sectionSubtitle,
            {
                color: colors.muted,
            },
        ]}>
            Browse products from {communityName}. Tap a card to see all photos, details and contact options.
          </Text>

          {!isOwnBusiness &&
          businessOwnerId &&
          (
            isBusinessProfileLoading ||
            canMessageBusiness
          ) ? (
            <Pressable
              onPress={
                handleMessageBusiness
              }
              disabled={
                isBusinessProfileLoading ||
                isCreatingChat ||
                !canMessageBusiness
              }
              accessibilityRole="button"
              accessibilityLabel={`Message ${communityName}`}
              style={({
                pressed,
              }) => [
                catalogStyles.messageButton,
                {
                  backgroundColor:
                    colors.surface,

                  borderColor:
                    colors.border,

                  opacity:
                    (
                      pressed ||
                      isBusinessProfileLoading ||
                      isCreatingChat
                    )
                      ? 0.66
                      : 1,
                },
              ]}
            >
              <View
                style={[
                  catalogStyles.messageIcon,
                  {
                    backgroundColor:
                      colors
                        .surfaceSecondary,
                  },
                ]}
              >
                {isBusinessProfileLoading ||
                isCreatingChat ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.accent
                    }
                  />
                ) : (
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={19}
                    color={
                      colors.accent
                    }
                  />
                )}
              </View>

              <View
                style={
                  catalogStyles.messageTextWrap
                }
              >
                <Text
                  style={[
                    catalogStyles.messageTitle,
                    {
                      color:
                        colors.foreground,
                    },
                  ]}
                >
                  Message business
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    catalogStyles.messageSubtitle,
                    {
                      color:
                        colors.muted,
                    },
                  ]}
                >
                  Ask {communityName} about a product
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={
                  colors.accent
                }
              />
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (<View style={catalogStyles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.accent}/>

            <Text style={[
                catalogStyles.loadingText,
                {
                    color: colors.muted,
                },
            ]}>
              Loading products...
            </Text>
          </View>) : error ? (<View style={[
                catalogStyles.stateCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
            ]}>
            <Ionicons name="alert-circle-outline" size={35} color={colors.danger}/>

            <Text style={[
                catalogStyles.stateTitle,
                {
                    color: colors.foreground,
                },
            ]}>
              Unable to load catalogue
            </Text>

            <Text style={[
                catalogStyles.stateDescription,
                {
                    color: colors.muted,
                },
            ]}>
              Pull down to try again.
            </Text>
          </View>) : filteredProducts.length ===
            0 ? (<View style={[
                catalogStyles.stateCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
            ]}>
            <Ionicons name="storefront-outline" size={38} color={colors.accent}/>

            <Text style={[
                catalogStyles.stateTitle,
                {
                    color: colors.foreground,
                },
            ]}>
              {searchValue
                ? "No matching products"
                : "No products yet"}
            </Text>

            <Text style={[
                catalogStyles.stateDescription,
                {
                    color: colors.muted,
                },
            ]}>
              {searchValue
                ? `No products matched "${searchValue}".`
                : "Products added by the business will appear here."}
            </Text>
          </View>) : (<PinterestProductGrid products={filteredProducts} onProductPress={(product) => {
                router.push({
                    pathname: "/pages/businessProductDetail",
                    params: {
                        productId: product.id,
                        communityId,
                        communityName,
                        businessOwnerId,
                    },
                } as never);
            }}/>)}
      </ScrollView>
    </SafeAreaView>);
}
const catalogStyles = StyleSheet.create({
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
    countBadge: {
        minWidth: 38,
        height: 38,
        paddingHorizontal: 9,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
    },
    countText: {
        fontSize: 13,
        fontFamily: "Poppins_700Bold",
    },
    searchBar: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        paddingVertical: 0,
        fontSize: 14,
        fontFamily: "Poppins_400Regular",
    },
    intro: {
        marginTop: 20,
        marginBottom: 16,
    },
    messageButton: {
        minHeight: 62,
        marginTop: 14,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    messageIcon: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    messageTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    messageTitle: {
        fontSize: 13,
        fontFamily: "Poppins_700Bold",
    },
    messageSubtitle: {
        marginTop: 1,
        fontSize: 10,
        fontFamily: "Poppins_400Regular",
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: "Poppins_700Bold",
    },
    sectionSubtitle: {
        marginTop: 4,
        fontSize: 12,
        lineHeight: 19,
        fontFamily: "Poppins_400Regular",
    },
    loadingWrap: {
        minHeight: 300,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    loadingText: {
        fontSize: 12,
        fontFamily: "Poppins_400Regular",
    },
    stateCard: {
        minHeight: 260,
        borderWidth: 1,
        borderRadius: 24,
        padding: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    stateTitle: {
        marginTop: 12,
        textAlign: "center",
        fontSize: 18,
        fontFamily: "Poppins_700Bold",
    },
    stateDescription: {
        marginTop: 6,
        textAlign: "center",
        fontSize: 12,
        lineHeight: 19,
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
        fontSize: 19,
        textAlign: "center",
        fontFamily: "Poppins_700Bold",
    },
    centerDescription: {
        marginTop: 6,
        fontSize: 12,
        lineHeight: 19,
        textAlign: "center",
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