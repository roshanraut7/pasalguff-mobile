import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 130,
  },

  page: {
    paddingBottom: 0,
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  errorText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },

  coverSection: {
    position: "relative",
    width: "100%",
  },

  coverImage: {
    width: "100%",
    height: 220,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  coverFallback: {
    width: "100%",
    height: 220,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: 1,
  },

  backButton: {
    position: "absolute",
    left: 20,
    top: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  avatarFloatingWrap: {
    position: "absolute",
    left: 24,
    bottom: -56,
  },

  avatarOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 4,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 54,
  },

  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 54,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallbackText: {
    fontSize: 34,
    fontFamily: "Poppins_700Bold",
  },

  profileInfoSection: {
    paddingTop: 68,
    paddingHorizontal: 32,
    paddingBottom: 20,
  },

  profileName: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: "Poppins_700Bold",
  },

  profileSubText: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium",
  },

  profileBusinessType: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium",
  },

  profileActionRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  profileActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  profileBadgeRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  profileBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
  },

  tabsRoot: {
    borderBottomWidth: 1,
  },

  tabsScrollContent: {
    flexDirection: "row",
    gap: 28,
    paddingLeft: 20,
    paddingRight: 28,
  },

  loadingWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },

  communityCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  communityAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },

  communityAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  communityInitials: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  communityInfo: {
    flex: 1,
  },

  communityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  smallPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  smallPillText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "Poppins_600SemiBold",
  },

  communityStatsRow: {
    marginTop: 7,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  miniStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  miniStatText: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Poppins_500Medium",
  },

  userCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  smallAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },

  smallAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  smallInitials: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  cardTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Poppins_700Bold",
  },

  cardMeta: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins_400Regular",
  },

  aboutWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },

  infoRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  infoValue: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_600SemiBold",
  },

  emptyCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});