
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  compactHeader: {
    minHeight: 74,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitleWrap: {
    flex: 1,
  },

  liveHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },

  blinkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  liveHeaderStatus: {
    fontSize: 11,
    fontFamily: "Poppins_800ExtraBold",
  },

  liveHeaderMeta: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },

  headerTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold",
  },

  headerSubtitle: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  topicStrip: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  topicMain: {
    flex: 1,
  },

  topicTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  topicTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Poppins_700Bold",
  },

  topicDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  topicMetaRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },

  topicMetaText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },

  topicLiveText: {
    fontSize: 11,
    fontFamily: "Poppins_800ExtraBold",
  },

  endButtonSmall: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  endButtonSmallText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  requestPanel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },

  requestPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  requestPanelTitle: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  requestCountText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },

  requestItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  requestUserLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  requestAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  requestInfo: {
    flex: 1,
  },

  requestUserName: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },

  requestMessage: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Poppins_400Regular",
  },

  requestActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  approveButton: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  rejectButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  requestActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  rejectButtonText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  noticeBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  messagesList: {
    flex: 1,
  },

  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  messageRow: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
  },

  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  messageAvatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  messageAvatarText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
  },

  messageBubble: {
    maxWidth: "78%",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  messageAuthor: {
    marginBottom: 3,
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  messageFooter: {
    marginTop: 5,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  messageTime: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
  },

  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingTop: 8,
  },

  composerBox: {
    minHeight: 48,
    maxHeight: 116,
    borderWidth: 1,
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },

  messageInput: {
    flex: 1,
    maxHeight: 86,
    paddingVertical: 6,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlignVertical: "top",
  },

  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  viewerRequestBox: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  viewerRequestTextWrap: {
    flex: 1,
  },

  viewerRequestTitle: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  viewerRequestText: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  requestButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  requestButtonText: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },

  centerBlock: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  centerTitle: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  centerText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  emptyBlock: {
    flex: 1,
    minHeight: 260,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },

  retryButtonText: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },
});

