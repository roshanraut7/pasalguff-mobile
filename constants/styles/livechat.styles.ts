import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
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

  header: {
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
  },

  headerRightGap: {
    width: 34,
    height: 34,
  },

  liveStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  liveStatusText: {
    fontSize: 11,
    fontFamily: "Poppins_800ExtraBold",
  },

  headerMetaText: {
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

  topicCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  topicPress: {
    flex: 1,
  },

  topicTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  topicIconBox: {
    width: 32,
    height: 32,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  topicTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Poppins_700Bold",
  },

  topicDescription: {
    marginTop: 7,
    marginLeft: 40,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  endButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  endButtonText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  tabBar: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 4,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
  },

  tabButton: {
    flex: 1,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  tabText: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },

  joinToast: {
    position: "absolute",
    top: 154,
    left: 22,
    right: 22,
    zIndex: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
  },

  joinToastText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },

  requestPanel: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
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

  requestPanelSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  requestCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },

  requestUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  requestTextWrap: {
    flex: 1,
  },

  requestName: {
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
    gap: 8,
  },

  acceptButton: {
    flex: 1,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  rejectButton: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  rejectButtonText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },

  requestErrorBox: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  requestErrorText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  noticeBar: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  messagesList: {
    flex: 1,
    marginTop: 4,
  },

  messagesContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },

  messageCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  messageTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  messageMain: {
    flex: 1,
  },

  messageHeaderRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  messageAuthorName: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
  },

  messageTime: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
  },

  messageMenuButton: {
    marginLeft: "auto",
    width: 28,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  messageBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  avatarText: {
    fontFamily: "Poppins_700Bold",
  },

  membersList: {
    flex: 1,
    marginTop: 4,
  },

  membersContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },

  memberListHeader: {
    paddingHorizontal: 2,
    paddingBottom: 2,
  },

  memberListTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: "Poppins_700Bold",
  },

  memberListSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  memberRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  memberInfo: {
    flex: 1,
  },

  memberName: {
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  memberSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  memberMenuButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
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

  composerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 18,
  },

  actionModal: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
  },

  modalTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },

  modalTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold",
  },

  modalSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_400Regular",
  },

  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  modalActionButton: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  modalActionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
  },
});

