import { baseApi } from "./baseApi";

/* =========================================================
   SHARED TYPES
   ========================================================= */

export type BusinessCommunityKind =
  | "BUSINESS"
  | "INSTITUTE";

export type CatalogCommunitySummary = {
  id: string;
  name: string;
  communityKind: BusinessCommunityKind;
};

/* =========================================================
   BUSINESS PRODUCT TYPES
   ========================================================= */

export type BusinessProductPicture = {
  id: string;
  productId: string;
  url: string;
  sortOrder: number;
  createdAt: string;
};

export type BusinessProduct = {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  websiteLink: string | null;
  pictures: BusinessProductPicture[];
  createdAt: string;
  updatedAt: string;
};

export type BusinessProductsResponse = {
  community: CatalogCommunitySummary;
  products: BusinessProduct[];
};

export type BusinessProductResponse = {
  product: BusinessProduct;
};

export type SaveBusinessProductResponse = {
  message: string;
  product: BusinessProduct;
};

export type DeleteBusinessProductResponse = {
  message: string;

  deletedProduct: {
    id: string;
    name: string;
  };
};

/* =========================================================
   INSTITUTE COURSE TYPES
   ========================================================= */

export type InstituteCourse = {
  id: string;
  communityId: string;
  name: string;
  duration: string;
  startDate: string;
  contact: string;
  createdAt: string;
  updatedAt: string;
};

export type InstituteCoursesResponse = {
  community: CatalogCommunitySummary;
  courses: InstituteCourse[];
};

export type InstituteCourseResponse = {
  course: InstituteCourse;
};

export type SaveInstituteCourseResponse = {
  message: string;
  course: InstituteCourse;
};

export type DeleteInstituteCourseResponse = {
  message: string;

  deletedCourse: {
    id: string;
    name: string;
  };
};

/* =========================================================
   PAYLOAD TYPES
   ========================================================= */

export type CreateBusinessProductPayload = {
  communityId: string;
  name: string;
  description?: string | null;
  websiteLink?: string | null;
  pictures: string[];
};

export type UpdateBusinessProductPayload = {
  communityId: string;
  productId: string;
  name?: string;
  description?: string | null;
  websiteLink?: string | null;
  pictures?: string[];
};

export type CreateInstituteCoursePayload = {
  communityId: string;
  name: string;
  duration: string;
  startDate: string;
  contact: string;
};

export type UpdateInstituteCoursePayload = {
  communityId: string;
  courseId: string;
  name?: string;
  duration?: string;
  startDate?: string;
  contact?: string;
};

/* =========================================================
   TAG HELPERS
   ========================================================= */

function getProductCatalogTag(
  communityId: string,
) {
  return {
    type: "Community" as const,
    id: `PRODUCT-CATALOG-${communityId}`,
  };
}

function getProductTag(
  productId: string,
) {
  return {
    type: "Community" as const,
    id: `PRODUCT-${productId}`,
  };
}

function getCourseCatalogTag(
  communityId: string,
) {
  return {
    type: "Community" as const,
    id: `COURSE-CATALOG-${communityId}`,
  };
}

function getCourseTag(
  courseId: string,
) {
  return {
    type: "Community" as const,
    id: `COURSE-${courseId}`,
  };
}

/* =========================================================
   API
   ========================================================= */

export const communityCatalogApi =
  baseApi.injectEndpoints({
    overrideExisting: false,

    endpoints: (builder) => ({
      /* =====================================================
         GET ALL BUSINESS PRODUCTS
         ===================================================== */

      getBusinessProducts: builder.query<
        BusinessProductsResponse,
        string
      >({
        query: (communityId) => ({
          url:
            `/community-catalog/${communityId}/products`,

          method:
            "GET",
        }),

        /*
         * Always return arrays to prevent:
         * undefined.length
         * undefined.map
         */
        transformResponse: (
          response:
            BusinessProductsResponse,
        ): BusinessProductsResponse => ({
          ...response,

          products:
            response?.products ?? [],
        }),

        providesTags: (
          result,
          _error,
          communityId,
        ) => [
          getProductCatalogTag(
            communityId,
          ),

          ...(
            result?.products ?? []
          ).map((product) =>
            getProductTag(
              product.id,
            ),
          ),
        ],
      }),

      /* =====================================================
         GET ONE BUSINESS PRODUCT
         ===================================================== */

      getBusinessProduct: builder.query<
        BusinessProductResponse,
        {
          communityId: string;
          productId: string;
        }
      >({
        query: ({
          communityId,
          productId,
        }) => ({
          url:
            `/community-catalog/${communityId}/products/${productId}`,

          method:
            "GET",
        }),

        transformResponse: (
          response:
            BusinessProductResponse,
        ): BusinessProductResponse => ({
          ...response,

          product: {
            ...response.product,

            pictures:
              response.product
                ?.pictures ?? [],
          },
        }),

        providesTags: (
          _result,
          _error,
          {
            productId,
          },
        ) => [
          getProductTag(
            productId,
          ),
        ],
      }),

      /* =====================================================
         CREATE BUSINESS PRODUCT
         ===================================================== */

      createBusinessProduct:
        builder.mutation<
          SaveBusinessProductResponse,
          CreateBusinessProductPayload
        >({
          query: ({
            communityId,
            ...body
          }) => ({
            url:
              `/community-catalog/${communityId}/products`,

            method:
              "POST",

            body,
          }),

          invalidatesTags: (
            _result,
            _error,
            {
              communityId,
            },
          ) => [
            getProductCatalogTag(
              communityId,
            ),
          ],
        }),

      /* =====================================================
         UPDATE BUSINESS PRODUCT
         ===================================================== */

      updateBusinessProduct:
        builder.mutation<
          SaveBusinessProductResponse,
          UpdateBusinessProductPayload
        >({
          query: ({
            communityId,
            productId,
            ...body
          }) => ({
            url:
              `/community-catalog/${communityId}/products/${productId}`,

            method:
              "PATCH",

            body,
          }),

          invalidatesTags: (
            _result,
            _error,
            {
              communityId,
              productId,
            },
          ) => [
            getProductCatalogTag(
              communityId,
            ),

            getProductTag(
              productId,
            ),
          ],
        }),

      /* =====================================================
         DELETE BUSINESS PRODUCT
         ===================================================== */

      deleteBusinessProduct:
        builder.mutation<
          DeleteBusinessProductResponse,
          {
            communityId: string;
            productId: string;
          }
        >({
          query: ({
            communityId,
            productId,
          }) => ({
            url:
              `/community-catalog/${communityId}/products/${productId}`,

            method:
              "DELETE",
          }),

          invalidatesTags: (
            _result,
            _error,
            {
              communityId,
              productId,
            },
          ) => [
            getProductCatalogTag(
              communityId,
            ),

            getProductTag(
              productId,
            ),
          ],
        }),

      /* =====================================================
         GET ALL INSTITUTE COURSES
         ===================================================== */

      getInstituteCourses: builder.query<
        InstituteCoursesResponse,
        string
      >({
        query: (communityId) => ({
          url:
            `/community-catalog/${communityId}/courses`,

          method:
            "GET",
        }),

        transformResponse: (
          response:
            InstituteCoursesResponse,
        ): InstituteCoursesResponse => ({
          ...response,

          courses:
            response?.courses ?? [],
        }),

        providesTags: (
          result,
          _error,
          communityId,
        ) => [
          getCourseCatalogTag(
            communityId,
          ),

          ...(
            result?.courses ?? []
          ).map((course) =>
            getCourseTag(
              course.id,
            ),
          ),
        ],
      }),

      /* =====================================================
         GET ONE INSTITUTE COURSE
         ===================================================== */

      getInstituteCourse: builder.query<
        InstituteCourseResponse,
        {
          communityId: string;
          courseId: string;
        }
      >({
        query: ({
          communityId,
          courseId,
        }) => ({
          url:
            `/community-catalog/${communityId}/courses/${courseId}`,

          method:
            "GET",
        }),

        providesTags: (
          _result,
          _error,
          {
            courseId,
          },
        ) => [
          getCourseTag(
            courseId,
          ),
        ],
      }),

      /* =====================================================
         CREATE INSTITUTE COURSE
         ===================================================== */

      createInstituteCourse:
        builder.mutation<
          SaveInstituteCourseResponse,
          CreateInstituteCoursePayload
        >({
          query: ({
            communityId,
            ...body
          }) => ({
            url:
              `/community-catalog/${communityId}/courses`,

            method:
              "POST",

            body,
          }),

          invalidatesTags: (
            _result,
            _error,
            {
              communityId,
            },
          ) => [
            getCourseCatalogTag(
              communityId,
            ),
          ],
        }),

      /* =====================================================
         UPDATE INSTITUTE COURSE
         ===================================================== */

      updateInstituteCourse:
        builder.mutation<
          SaveInstituteCourseResponse,
          UpdateInstituteCoursePayload
        >({
          query: ({
            communityId,
            courseId,
            ...body
          }) => ({
            url:
              `/community-catalog/${communityId}/courses/${courseId}`,

            method:
              "PATCH",

            body,
          }),

          invalidatesTags: (
            _result,
            _error,
            {
              communityId,
              courseId,
            },
          ) => [
            getCourseCatalogTag(
              communityId,
            ),

            getCourseTag(
              courseId,
            ),
          ],
        }),

      /* =====================================================
         DELETE INSTITUTE COURSE
         ===================================================== */

      deleteInstituteCourse:
        builder.mutation<
          DeleteInstituteCourseResponse,
          {
            communityId: string;
            courseId: string;
          }
        >({
          query: ({
            communityId,
            courseId,
          }) => ({
            url:
              `/community-catalog/${communityId}/courses/${courseId}`,

            method:
              "DELETE",
          }),

          invalidatesTags: (
            _result,
            _error,
            {
              communityId,
              courseId,
            },
          ) => [
            getCourseCatalogTag(
              communityId,
            ),

            getCourseTag(
              courseId,
            ),
          ],
        }),
    }),
  });

/* =========================================================
   EXPORTED HOOKS
   ========================================================= */

export const {
  useGetBusinessProductsQuery,
  useGetBusinessProductQuery,
  useCreateBusinessProductMutation,
  useUpdateBusinessProductMutation,
  useDeleteBusinessProductMutation,

  useGetInstituteCoursesQuery,
  useGetInstituteCourseQuery,
  useCreateInstituteCourseMutation,
  useUpdateInstituteCourseMutation,
  useDeleteInstituteCourseMutation,
} = communityCatalogApi;