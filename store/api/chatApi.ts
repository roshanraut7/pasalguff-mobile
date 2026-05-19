import { baseApi } from "./baseApi";

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE";
export type MessageStatus = "SENT" | "DELIVERED";
export type ChatUser = {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  businessName?: string | null;
  businessType?: string | null;

  // For online / active status
  isOnline?: boolean;
  lastSeenAt?: string | null;
};

export type ChatMember = {
  id: string;
  chatId: string;
  userId: string;
  status: "ACTIVE" | "BLOCKED";
  joinedAt: string;
  blockedAt?: string | null;
  lastReadAt?: string | null;
  user: ChatUser;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  status: MessageStatus;
  content?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  sender?: ChatUser;
};

export type Chat = {
  id: string;
  sourceCommunity?: {
    id: string;
    name: string;
    avatarImage?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  otherUser?: ChatUser | null;
  members: ChatMember[];
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
};

export type GetMessagesResponse = {
  page: number;
  limit: number;
  total: number;
  items: ChatMessage[];
};

export type CreateDirectChatBody = {
  sourceCommunityId?: string;
};

export type SendMessageBody = {
  type?: MessageType;
  content?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

export type UploadChatFileResponse = {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
};

export const chatApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getMyChats: builder.query<Chat[], void>({
      query: () => ({
        url: "/chats",
        method: "GET",
      }),
      providesTags: ["Chat"],
    }),

    getChat: builder.query<Chat, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, chatId) => [
        { type: "Chat", id: chatId },
      ],
    }),

    getChatMessages: builder.query<
      GetMessagesResponse,
      { chatId: string; page?: number; limit?: number }
    >({
      query: ({ chatId, page = 1, limit = 30 }) => ({
        url: `/chats/${chatId}/messages`,
        method: "GET",
        params: { page, limit },
      }),
      providesTags: (_result, _error, arg) => [
        { type: "Message", id: arg.chatId },
      ],
    }),

    createDirectChat: builder.mutation<
      Chat,
      { targetUserId: string; body?: CreateDirectChatBody }
    >({
      query: ({ targetUserId, body }) => ({
        url: `/chats/direct/${targetUserId}`,
        method: "POST",
        body: body ?? {},
      }),
      invalidatesTags: ["Chat"],
    }),

    sendMessage: builder.mutation<
      ChatMessage,
      { chatId: string; body: SendMessageBody }
    >({
      query: ({ chatId, body }) => ({
        url: `/chats/${chatId}/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        "Chat",
        { type: "Message", id: arg.chatId },
      ],
    }),

    markChatRead: builder.mutation<unknown, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, chatId) => [
        { type: "Chat", id: chatId },
      ],
    }),

    uploadChatFile: builder.mutation<UploadChatFileResponse, FormData>({
      query: (formData) => ({
        url: "/uploads/chat",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetMyChatsQuery,
  useGetChatQuery,
  useGetChatMessagesQuery,
  useCreateDirectChatMutation,
  useSendMessageMutation,
  useMarkChatReadMutation,
  useUploadChatFileMutation,
} = chatApi;