import { StyleSheet } from "react-native";

export const discussionDetailStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  topBar: {
    minHeight: 62,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  topTitleWrap: {
    flex: 1,
  },

  topTitle: {
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
  },

  topSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  roleSwitcher: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 14,
  },

  roleSwitcherTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 10,
  },

  roleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginRight: 8,
  },

  roleChipText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },

  heroPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  pillText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.3,
  },

  title: {
    fontSize: 23,
    lineHeight: 31,
    fontFamily: "Poppins_700Bold",
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },

  authorInfo: {
    flex: 1,
  },

  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: "Poppins_700Bold",
  },

  authorName: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },

  authorMeta: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins_400Regular",
  },

  bodyText: {
    marginTop: 18,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
  },

  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  tagText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },

  metricsRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },

  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  metricText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },

  acceptedSolutionBlock: {
    marginTop: 18,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },

  solutionText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium",
  },

  smallMeta: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },

  actionRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  actionButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  actionButtonText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  moderatorPanel: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  panelHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  composerCard: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
  },

  answerInput: {
    marginTop: 12,
    minHeight: 118,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    textAlignVertical: "top",
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
  },

  submitButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  submitButtonText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },

  answerSectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },

  answerTitleRow: {
    alignSelf: "flex-start",
  },

  answerTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  answerUnderline: {
    marginTop: 6,
    height: 3,
    borderRadius: 999,
    width: 52,
  },

  dateDivider: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },

  dateText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },

  answerRow: {
    flexDirection: "row",
    gap: 11,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  answerContent: {
    flex: 1,
  },

  answerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },

  roleLabel: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },

  commentLabels: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  answerBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
  },

  voteRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  voteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  voteScore: {
    minWidth: 22,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
  },

  commentActionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },

  inlineAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },

  inlineActionText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  replyThread: {
    marginTop: 14,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },

  replyItem: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 14,
  },

  replyContent: {
    flex: 1,
  },

  replyAuthor: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  replyDate: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },

  replyBody: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  replyVoteRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  replyVoteScore: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },

  replyComposer: {
    marginTop: 4,
  },

  replyInput: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },

  replySubmitButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  replySubmitText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  emptyAnswerBlock: {
    paddingVertical: 20,
  },

  emptyAnswerText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },

  reportModal: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 18,
  },

  reportReason: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  reportReasonText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
});