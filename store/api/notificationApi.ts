import { baseApi } from "@/store/api/baseApi";

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: {
    communityId?: string;
    postId?: string;
    requestId?: string;
    userId?: string;
    memberUserId?: string;
    [key: string]: unknown;
  } | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListResponse = {
  data: AppNotification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    unreadCount: number;
  };
};

export type NotificationListQuery = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  communityId?: string;
};

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    registerPushToken: builder.mutation<
      { message: string },
      {
        token: string;
        platform?: string;
        deviceId?: string;
      }
    >({
      query: (body) => ({
        url: "/notifications/register-token",
        method: "POST",
        body,
      }),
    }),

    getMyNotifications: builder.query<
      NotificationListResponse,
      NotificationListQuery | void
    >({
      query: (queryArg) => ({
        url: "/notifications",
        method: "GET",
        params: {
          page: queryArg?.page ?? 1,
          limit: queryArg?.limit ?? 20,
          ...(queryArg?.unreadOnly ? { unreadOnly: true } : {}),
          ...(queryArg?.communityId ? { communityId: queryArg.communityId } : {}),
        },
      }),
      providesTags: ["Notifications"],
    }),

    markNotificationAsRead: builder.mutation<
      { message: string },
      { notificationId: string }
    >({
      query: ({ notificationId }) => ({
        url: `/notifications/${notificationId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsAsRead: builder.mutation<
      { message: string },
      { communityId?: string } | void
    >({
      query: (body) => ({
        url: "/notifications/read-all",
        method: "PATCH",
        body: body?.communityId ? { communityId: body.communityId } : undefined,
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});
export function getUnreadNotificationCount(
  response?: NotificationListResponse,
) {
  return response?.meta?.unreadCount ?? 0;
}

export const {
  useRegisterPushTokenMutation,
  useGetMyNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = notificationApi;