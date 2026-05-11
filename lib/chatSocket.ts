// src/lib/chatSocket.ts

import { io, type Socket } from "socket.io-client";

const SOCKET_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_AUTH_URL ??
  "";

let socket: Socket | null = null;
let activeUserId: string | null = null;

export function getChatSocket(userId: string) {
  if (socket?.connected && activeUserId === userId) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  activeUserId = userId;

  socket = io(`${SOCKET_ORIGIN}/chat`, {
    transports: ["websocket"],
    auth: {
      userId,
    },
  });

  return socket;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  activeUserId = null;
}