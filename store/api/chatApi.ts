import { baseApi } from "./baseApi";

export type MessageType = "TEXT" | "IMAGE" | "FILE" | "AUDIO";
// If you want VIDEO chat messages, also add VIDEO in Prisma MessageType enum first.
// export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "AUDIO";

export type MessageStatus = "SENT" | "DELIVERED";

export type ChatRequestStatus = "ACCEPTED" | "PENDING" | "DECLINED";

export type ChatUser = {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  businessName?: string | null;
  businessType?: string | null;

  isOnline?: boolean;
  lastSeenAt?: string | null;
};

export type ChatMember = {
  id: string;
  chatId: string;
  userId: string;
  status: "ACTIVE" | "BLOCKED";
   role?: "ADMIN" | "MEMBER"; 
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
export type ChatType = "DIRECT" | "GROUP";
export type Chat = {
  id: string;

  type?: ChatType;          // ← add
  isGroup?: boolean;        // ← add
  name?: string | null;     // ← add
  avatarImage?: string | null, // ← add

  sourceCommunity?: {
    id: string;
    name: string;
    avatarImage?: string | null;
  } | null;

  requestStatus: ChatRequestStatus;
  requestedById?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;

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

/* ──────────────────────────────────────────────────────────────
   Chat Suggestions
────────────────────────────────────────────────────────────── */

export type ChatSuggestionRelationship = {
  isFollowing: boolean;
  followsMe: boolean;
  isMutual: boolean;

  /**
   * true when chat can continue normally.
   * Usually mutual follow OR already accepted chat.
   */
  canMessage: boolean;

  /**
   * true when user can open chat and send message request.
   * Usually one-way follow.
   */
  canSendRequest?: boolean;
};

export type ChatSuggestionItem = {
  user: ChatUser;
  relationship: ChatSuggestionRelationship;

  existingChatId?: string | null;

  chatRequestStatus?: ChatRequestStatus | null;
  requestedById?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
};

export type ChatSuggestionsResponse = {
  data: ChatSuggestionItem[];
};

export const chatApi = baseApi.injectEndpoints({
  overrideExisting: true,

  endpoints: (builder) => ({
    getMyChats: builder.query<Chat[], void>({
      query: () => ({
        url: "/chats",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "Chat" as const, id: "LIST" },
              ...result.map((chat) => ({
                type: "Chat" as const,
                id: chat.id,
              })),
            ]
          : [{ type: "Chat" as const, id: "LIST" }],
    }),

    searchChatSuggestions: builder.query<
      ChatSuggestionsResponse,
      { search?: string; limit?: number }
    >({
      query: ({ search = "", limit = 20 }) => ({
        url: "/chats/suggestions",
        method: "GET",
        params: {
          search,
          limit,
        },
      }),
      providesTags: [{ type: "Chat" as const, id: "SUGGESTIONS" }],
    }),

    getChat: builder.query<Chat, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, chatId) => [
        { type: "Chat" as const, id: chatId },
      ],
    }),

    getChatMessages: builder.query<
      GetMessagesResponse,
      { chatId: string; page?: number; limit?: number }
    >({
      query: ({ chatId, page = 1, limit = 30 }) => ({
        url: `/chats/${chatId}/messages`,
        method: "GET",
        params: {
          page,
          limit,
        },
      }),
      providesTags: (_result, _error, arg) => [
        { type: "Message" as const, id: arg.chatId },
      ],
    }),
    //create group chat
    createGroupChat: builder.mutation<
  Chat,
  { name?: string; avatarImage?: string; memberIds: string[] }
>({
  query: (body) => ({
    url: "/chats/group",
    method: "POST",
    body,
  }),
  invalidatesTags: [{ type: "Chat", id: "LIST" }, { type: "Chat", id: "SUGGESTIONS" }],
}),
//add group member
addGroupMember: builder.mutation<Chat, { chatId: string; userId: string }>({
  query: ({ chatId, userId }) => ({
    url: `/chats/${chatId}/members`,
    method: "PATCH",
    body: { userId },
  }),
  invalidatesTags: (_result, _error, arg) => [
    { type: "Chat", id: "LIST" },
    { type: "Chat", id: arg.chatId },
  ],
}),
//remove group member
removeGroupMember: builder.mutation<Chat, { chatId: string; userId: string }>({
  query: ({ chatId, userId }) => ({
    url: `/chats/${chatId}/members/${userId}`,
    method: "DELETE",
  }),
  invalidatesTags: (_result, _error, arg) => [
    { type: "Chat", id: "LIST" },
    { type: "Chat", id: arg.chatId },
  ],
}),
//leave group 
leaveGroup: builder.mutation<{ success: boolean; chatId: string }, string>({
  query: (chatId) => ({
    url: `/chats/${chatId}/leave`,
    method: "DELETE",
  }),
  invalidatesTags: (_result, _error, chatId) => [
    { type: "Chat", id: "LIST" },
    { type: "Chat", id: chatId },
  ],
}),
//create direct chat
    createDirectChat: builder.mutation<
      Chat,
      { targetUserId: string; body?: CreateDirectChatBody }
    >({
      query: ({ targetUserId, body }) => ({
        url: `/chats/direct/${targetUserId}`,
        method: "POST",
        body: body ?? {},
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Chat", id: "LIST" },
        { type: "Chat", id: "SUGGESTIONS" },
        { type: "Chat", id: arg.targetUserId },
      ],
    }),
    //send message

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
        { type: "Chat", id: "LIST" },
        { type: "Chat", id: arg.chatId },
        { type: "Message", id: arg.chatId },
      ],
    }),
//markchat read
    markChatRead: builder.mutation<unknown, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, chatId) => [
        { type: "Chat", id: "LIST" },
        { type: "Chat", id: chatId },
      ],
    }),
//accept message request
    acceptMessageRequest: builder.mutation<Chat, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, chatId) => [
        { type: "Chat", id: "LIST" },
        { type: "Chat", id: chatId },
        { type: "Chat", id: "SUGGESTIONS" },
        { type: "Message", id: chatId },
      ],
    }),
    //decline message request

    declineMessageRequest: builder.mutation<Chat, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/decline`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, chatId) => [
        { type: "Chat", id: "LIST" },
        { type: "Chat", id: chatId },
        { type: "Chat", id: "SUGGESTIONS" },
        { type: "Message", id: chatId },
      ],
    }),

// blockchat 
        blockChat: builder.mutation<unknown, string>({
      query: (chatId) => ({
        url: `/chats/${chatId}/block`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, chatId) => [
        { type: "Chat", id: "LIST" },
        { type: "Chat", id: chatId },
      ],
    }),
     deleteMessage: builder.mutation<unknown, { chatId: string; messageId: string }>({
  query: ({ messageId }) => ({
    url: `/chats/messages/${messageId}`,
    method: "DELETE",
  }),
  invalidatesTags: (_result, _error, arg) => [
    { type: "Message", id: arg.chatId },
    { type: "Chat", id: "LIST" },
  ],
}),

    
//upload chat file
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
  useSearchChatSuggestionsQuery,
  useLazySearchChatSuggestionsQuery,
  useGetChatQuery,
  useGetChatMessagesQuery,
  useCreateDirectChatMutation,
  useSendMessageMutation,
  useMarkChatReadMutation,
  useAcceptMessageRequestMutation,
  useDeclineMessageRequestMutation,
  useUploadChatFileMutation,
  useCreateGroupChatMutation,
   useAddGroupMemberMutation,     // ← add
  useRemoveGroupMemberMutation,  // ← add
  useLeaveGroupMutation,
  useBlockChatMutation,
  useDeleteMessageMutation,
} = chatApi;