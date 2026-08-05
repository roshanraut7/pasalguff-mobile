import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import CatalogFormModal, {
  type CourseFormPayload,
  type ProductFormPayload,
} from "@/components/community-catalog/CatalogFormModal";

import CommunityCatalogContent from "@/components/community-catalog/CommunityCatalogContent";
import { useAppTheme } from "@/hooks/useAppTheme";

import {
  type BusinessCommunityKind,
  type BusinessProduct,
  type InstituteCourse,
  useCreateBusinessProductMutation,
  useCreateInstituteCourseMutation,
  useDeleteBusinessProductMutation,
  useDeleteInstituteCourseMutation,
  useGetBusinessProductsQuery,
  useGetInstituteCoursesQuery,
  useUpdateBusinessProductMutation,
  useUpdateInstituteCourseMutation,
} from "@/store/api/communityCatalogApi";

function getParamValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getErrorMessage(error: unknown): string {
  const possibleError = error as {
    data?: {
      message?: string | string[];
    };
    error?: string;
    message?: string;
  };

  const apiMessage = possibleError?.data?.message;

  if (Array.isArray(apiMessage)) {
    return apiMessage.join("\n");
  }

  return (
    apiMessage ||
    possibleError?.error ||
    possibleError?.message ||
    "Something went wrong. Please try again."
  );
}

export default function CommunityCatalogScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const params = useLocalSearchParams<{
    communityId?: string | string[];
    communityKind?: string | string[];
    communityName?: string | string[];
  }>();

  const communityId = getParamValue(params.communityId);
  const communityName = getParamValue(params.communityName);

  const communityKind = getParamValue(
    params.communityKind,
  ) as BusinessCommunityKind;

  const isBusiness = communityKind === "BUSINESS";
  const isInstitute = communityKind === "INSTITUTE";

  const productQuery = useGetBusinessProductsQuery(communityId, {
    skip: !communityId || !isBusiness,
    refetchOnMountOrArgChange: true,
  });

  const courseQuery = useGetInstituteCoursesQuery(communityId, {
    skip: !communityId || !isInstitute,
    refetchOnMountOrArgChange: true,
  });

  const [createProduct, { isLoading: isCreatingProduct }] =
    useCreateBusinessProductMutation();

  const [updateProduct, { isLoading: isUpdatingProduct }] =
    useUpdateBusinessProductMutation();

  const [deleteProduct, { isLoading: isDeletingProduct }] =
    useDeleteBusinessProductMutation();

  const [createCourse, { isLoading: isCreatingCourse }] =
    useCreateInstituteCourseMutation();

  const [updateCourse, { isLoading: isUpdatingCourse }] =
    useUpdateInstituteCourseMutation();

  const [deleteCourse, { isLoading: isDeletingCourse }] =
    useDeleteInstituteCourseMutation();

  const [isFormOpen, setIsFormOpen] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<BusinessProduct | null>(null);

  const [editingCourse, setEditingCourse] =
    useState<InstituteCourse | null>(null);

  const products = productQuery.data?.products ?? [];
  const courses = courseQuery.data?.courses ?? [];

  const isInitialLoading = isBusiness
    ? productQuery.isLoading
    : isInstitute
      ? courseQuery.isLoading
      : false;

  const isRefreshing = isBusiness
    ? productQuery.isFetching && !productQuery.isLoading
    : isInstitute
      ? courseQuery.isFetching && !courseQuery.isLoading
      : false;

  const pageError = isBusiness
    ? productQuery.error
    : isInstitute
      ? courseQuery.error
      : undefined;

  const isSubmitting =
    isCreatingProduct ||
    isUpdatingProduct ||
    isCreatingCourse ||
    isUpdatingCourse;

  const isDeleting = isDeletingProduct || isDeletingCourse;

  const pageTitle = isInstitute
    ? "Course Catalogue"
    : "Product Catalogue";

  function resetFormState() {
    setIsFormOpen(false);
    setEditingProduct(null);
    setEditingCourse(null);
  }

  function openCreateForm() {
    setEditingProduct(null);
    setEditingCourse(null);
    setIsFormOpen(true);
  }

  function openEditProduct(product: BusinessProduct) {
    setEditingCourse(null);
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  function openEditCourse(course: InstituteCourse) {
    setEditingProduct(null);
    setEditingCourse(course);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSubmitting) {
      return;
    }

    resetFormState();
  }

  async function handleSaveProduct(payload: ProductFormPayload) {
    try {
      if (editingProduct) {
        await updateProduct({
          communityId,
          productId: editingProduct.id,
          ...payload,
        }).unwrap();

        Alert.alert(
          "Product updated",
          "The product was updated successfully.",
        );
      } else {
        await createProduct({
          communityId,
          ...payload,
        }).unwrap();

        Alert.alert(
          "Product added",
          "The product was added successfully.",
        );
      }

      // Do not call closeForm() here because its current render can still
      // see isSubmitting=true. Reset the state directly after success.
      resetFormState();
    } catch (error) {
      Alert.alert(
        editingProduct ? "Unable to update product" : "Unable to add product",
        getErrorMessage(error),
      );

      // The sheet stays open so the user can correct and retry.
    }
  }

  async function handleSaveCourse(payload: CourseFormPayload) {
    try {
      if (editingCourse) {
        await updateCourse({
          communityId,
          courseId: editingCourse.id,
          ...payload,
        }).unwrap();

        Alert.alert(
          "Course updated",
          "The course was updated successfully.",
        );
      } else {
        await createCourse({
          communityId,
          ...payload,
        }).unwrap();

        Alert.alert(
          "Course added",
          "The course was added successfully.",
        );
      }

      resetFormState();
    } catch (error) {
      Alert.alert(
        editingCourse ? "Unable to update course" : "Unable to add course",
        getErrorMessage(error),
      );
    }
  }

  function confirmDeleteProduct(product: BusinessProduct) {
    Alert.alert(
      "Delete product?",
      `Are you sure you want to delete "${product.name}"?`,
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
              await deleteProduct({
                communityId,
                productId: product.id,
              }).unwrap();

              Alert.alert(
                "Product deleted",
                "The product was deleted successfully.",
              );
            } catch (error) {
              Alert.alert(
                "Unable to delete product",
                getErrorMessage(error),
              );
            }
          },
        },
      ],
    );
  }

  function confirmDeleteCourse(course: InstituteCourse) {
    Alert.alert(
      "Delete course?",
      `Are you sure you want to delete "${course.name}"?`,
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
              await deleteCourse({
                communityId,
                courseId: course.id,
              }).unwrap();

              Alert.alert(
                "Course deleted",
                "The course was deleted successfully.",
              );
            } catch (error) {
              Alert.alert(
                "Unable to delete course",
                getErrorMessage(error),
              );
            }
          },
        },
      ],
    );
  }

  async function handleRefresh() {
    if (isBusiness) {
      await productQuery.refetch();
      return;
    }

    if (isInstitute) {
      await courseQuery.refetch();
    }
  }

  if (!communityId || (!isBusiness && !isInstitute)) {
    return (
      <SafeAreaView
        style={[
          styles.centerWrap,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Ionicons
          name="warning-outline"
          size={36}
          color={colors.warning}
        />

        <Text
          style={[
            styles.centerTitle,
            {
              color: colors.foreground,
            },
          ]}
        >
          Catalogue information missing
        </Text>

        <Text
          style={[
            styles.centerSubtitle,
            {
              color: colors.muted,
            },
          ]}
        >
          Open this page from the community dashboard.
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.accent,
            },
          ]}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[
            styles.headerIconButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.foreground}
          />
        </Pressable>

        <View style={styles.headerTextWrap}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.foreground,
              },
            ]}
            numberOfLines={1}
          >
            {pageTitle}
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                color: colors.muted,
              },
            ]}
            numberOfLines={1}
          >
            {communityName || "Community"}
          </Text>
        </View>

        <Pressable
          onPress={openCreateForm}
          hitSlop={8}
          style={[
            styles.headerAddButton,
            {
              backgroundColor: colors.accent,
            },
          ]}
        >
          <Ionicons name="add" size={23} color="#ffffff" />
        </Pressable>
      </View>

      {isInitialLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />

          <Text
            style={[
              styles.loadingText,
              {
                color: colors.muted,
              },
            ]}
          >
            Loading catalogue...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          <CommunityCatalogContent
            communityKind={communityKind}
            products={products}
            courses={courses}
            hasError={Boolean(pageError)}
            isDeleting={isDeleting}
            onAdd={openCreateForm}
            onEditProduct={openEditProduct}
            onDeleteProduct={confirmDeleteProduct}
            onEditCourse={openEditCourse}
            onDeleteCourse={confirmDeleteCourse}
          />
        </ScrollView>
      )}

      <CatalogFormModal
        visible={isFormOpen}
        communityKind={communityKind}
        product={editingProduct}
        course={editingCourse}
        isSubmitting={isSubmitting}
        onClose={closeForm}
        onSubmitProduct={handleSaveProduct}
        onSubmitCourse={handleSaveCourse}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  header: {
    minHeight: 66,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  headerSubtitle: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  headerAddButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 14,
    paddingBottom: 120,
    gap: 14,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  centerWrap: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  centerTitle: {
    marginTop: 12,
    fontSize: 18,
    textAlign: "center",
    fontFamily: "Poppins_700Bold",
  },

  centerSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },

  backButton: {
    marginTop: 16,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },

  backButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
});