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

  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    marginTop: 14,
    fontSize: 22,
    lineHeight: 30,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  errorText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 22,
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
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },

  coverFallback: {
    width: "100%",
    height: 220,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    borderBottomWidth: 1,
    overflow: "hidden",
  },

  coverFallbackContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  coverFallbackIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },

  coverBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 220,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    backgroundColor: "rgba(0,0,0,0.26)",
  },

  backButton: {
    position: "absolute",
    left: 18,
    top: 18,
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.36)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    zIndex: 20,
  },

  avatarFloatingWrap: {
    position: "absolute",
    left: 22,
    bottom: -56,
    zIndex: 30,
  },

  avatarOuter: {
    width: 116,
    height: 116,
    borderRadius: 999,
    padding: 4,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },

  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarFallbackText: {
    fontSize: 34,
    fontFamily: "Poppins_700Bold",
  },

  profileInfoSection: {
    marginHorizontal: 12,
    marginTop: 0,
    paddingTop: 70,
    paddingHorizontal: 12,
    paddingBottom: 18,
  },

  profileInfoTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  profileNameWrap: {
    flex: 1,
  },

  profileName: {
    fontSize: 30,
    lineHeight: 38,
    fontFamily: "Poppins_700Bold",
  },

  profileSubText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_500Medium",
  },

  profileBusinessType: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium",
  },

  businessTypePill: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  businessTypePillText: {
    maxWidth: 220,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Poppins_700Bold",
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
    gap: 7,
  },

  headerStatsGrid: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },

  headerStatCard: {
    flex: 1,
    minHeight: 86,
  
    paddingHorizontal: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  headerStatIcon: {
    // width: 30,
    // height: 30,
    // borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  headerStatValue: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },

  headerStatLabel: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
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
    marginTop: 18,
    borderBottomWidth: 1,
  },

  tabsScrollContent: {
    flexDirection: "row",
    gap: 22,
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
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  communityAvatar: {
    width: 58,
    height: 58,
    borderRadius: 999,
  },

  communityAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 999,
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
    fontFamily: "Poppins_700Bold",
    textTransform: "capitalize",
  },

  communityStatsRow: {
    marginTop: 8,
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
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  smallAvatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
  },

  smallAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  smallInitials: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
  },

  cardArrowWrap: {
    // width: 32,
    // height: 32,
    // borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Poppins_700Bold",
  },

  cardMeta: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },

  aboutWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
  },

  infoRow: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_500Medium",
  },

  infoValue: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_600SemiBold",
  },

  emptyCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
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
    lineHeight: 21,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});