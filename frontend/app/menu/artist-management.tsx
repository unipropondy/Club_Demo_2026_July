import { API_URL } from "@/constants/Config";
import { Fonts } from "@/constants/Fonts";
import { Theme } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "../../components/Toast";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { artistDateState } from "@/stores/artistDateStore";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Date helpers ───────────────────────────────────────────────────────────
const pad = (n: number) => n.toString().padStart(2, "0");
const formatLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => {
  const d = new Date();
  return formatLocal(d);
};
const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return formatLocal(d);
};

interface Card {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
}

interface ArtistRow {
  dishId: string;
  name: string;
  totalSales: number;
  bonusEarned: number;
  bonusPaid: number;
  pendingBonus: number;
  status: "Paid" | "Partially Paid" | "Pending";
  thresholdAmount: number;
  thresholdReached: boolean;
  progressPct: number;
  remainingToThreshold: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Paid:           { bg: "#F0FDF4", text: "#16A34A" },
  "Partially Paid": { bg: "#FFFBEB", text: "#D97706" },
  Pending:        { bg: "#FEF2F2", text: "#DC2626" },
  Accruing:       { bg: "#E0F2FE", text: "#0284C7" },
};

export default function ArtistManagementScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [isDayActive, setIsDayActive]   = useState(false);
  const [activeDay, setActiveDay]       = useState<string | null>(null);

  const [cards, setCards] = useState({
    totalArtistSales: 0,
    totalBonusEarned: 0,
    totalBonusPaid:   0,
    pendingBonus:     0,
  });
  const [artists, setArtists]     = useState<ArtistRow[]>([]);
  const [activeRule, setActiveRule] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // No date params — defaults to active business day on the backend
      const res = await axios.get(
        `${API_URL}/api/artist-bonus/sales-summary`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setCards(res.data.cards);
        setArtists(res.data.artists || []);
        setActiveRule(res.data.activeRule);
        setIsDayActive(res.data.isDayActive ?? false);
        setActiveDay(res.data.activeDay ?? null);
      }
    } catch (err: any) {
      console.error("[ArtistMgmt] fetchData error:", err.message);
      showToast({ type: "error", message: "Load Failed", subtitle: "Could not load artist summary." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Refresh when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const cardData: Card[] = [
    {
      label: "Total Artist Sales",
      value: `$${cards.totalArtistSales.toFixed(2)}`,
      icon: "musical-notes",
      color: "#3B82F6",
      bg:    "#EFF6FF",
    },
    {
      label: "Total Bonus Earned",
      value: `$${cards.totalBonusEarned.toFixed(2)}`,
      icon: "trophy",
      color: "#F97316",
      bg:    "#FFF7ED",
    },
    {
      label: "Total Bonus Paid",
      value: `$${cards.totalBonusPaid.toFixed(2)}`,
      icon: "checkmark-circle",
      color: "#16A34A",
      bg:    "#F0FDF4",
    },
    {
      label: "Pending Bonus",
      value: `$${cards.pendingBonus.toFixed(2)}`,
      icon: "time",
      color: "#DC2626",
      bg:    "#FEF2F2",
    },
  ];

  const navTiles = [
    {
      title: "Artist Sales",
      subtitle: "View sales & bonus grid",
      icon: "bar-chart",
      color: "#3B82F6",
      bg:    "#EFF6FF",
      route: "/menu/artist-sales",
    },
    {
      title: "Bonus Payments",
      subtitle: "Process pending payments",
      icon: "cash",
      color: "#16A34A",
      bg:    "#F0FDF4",
      route: "/menu/artist-bonus-payments",
    },
    {
      title: "Bonus Master",
      subtitle: "Configure bonus rules",
      icon: "settings",
      color: "#F97316",
      bg:    "#FFF7ED",
      route: "/menu/artist-bonus-master",
    },
    {
      title: "Reports",
      subtitle: "Sales & payment ledger",
      icon: "document-text",
      color: "#8B5CF6",
      bg:    "#F5F3FF",
      route: "/menu/artist-reports",
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgMain} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Artist Management</Text>
          <Text style={styles.headerSub}>
            {activeRule
              ? `Active Rule: Every $${activeRule.ThresholdAmount} → $${activeRule.BonusAmount} bonus`
              : "No active bonus rule configured"}
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={Theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Theme.primary]} tintColor={Theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Day Status Banner */}
        <View style={[
          styles.dayBanner,
          { backgroundColor: isDayActive ? "#F0FDF4" : "#FEF2F2", borderColor: isDayActive ? "#16A34A" : "#FCA5A5" }
        ]}>
          <View style={[styles.dayDot, { backgroundColor: isDayActive ? "#16A34A" : "#DC2626" }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dayBannerTitle, { color: isDayActive ? "#15803D" : "#B91C1C" }]}>
              {isDayActive ? `Active Business Day` : "No Active Day"}
            </Text>
            <Text style={[styles.dayBannerSub, { color: isDayActive ? "#16A34A" : "#DC2626" }]}>
              {isDayActive
                ? `Bonuses accumulating for ${activeDay} · Finalized at Day End`
                : "Start a Day to begin tracking artist bonuses"}
            </Text>
          </View>
          {isDayActive && (
            <View style={styles.dayLiveBadge}>
              <Text style={styles.dayLiveText}>LIVE</Text>
            </View>
          )}
        </View>

        {loading && !refreshing && (
          <ActivityIndicator size="large" color={Theme.primary} style={{ marginTop: 32 }} />
        )}

        {/* KPI Cards */}
        <View style={[styles.cardsGrid, isTablet && { gridTemplateColumns: "repeat(4, 1fr)" }]}>
          {cardData.map((card) => (
            <View
              key={card.label}
              style={[styles.card, { backgroundColor: card.bg }, isTablet && { flex: 1 }]}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: card.color + "22" }]}>
                <Ionicons name={card.icon as any} size={24} color={card.color} />
              </View>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Navigation Tiles */}
        <Text style={styles.sectionTitle}>Management</Text>
        <View style={styles.tilesGrid}>
          {navTiles.map((tile) => (
            <TouchableOpacity
              key={tile.route}
              style={[styles.tile, isTablet && { flex: 1, maxWidth: "48%" }]}
              onPress={() => router.push(tile.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.tileIconWrap, { backgroundColor: tile.bg }]}>
                <Ionicons name={tile.icon as any} size={28} color={tile.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tileTitle}>{tile.title}</Text>
                <Text style={styles.tileSub}>{tile.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Artists Preview */}
        {artists.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Artist Overview</Text>
            <View style={styles.artistCard}>
              {isTablet ? (
                // ── Tablet / Web: flex layout fills the full width ──
              <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thCell, { flex: 2 }]}>Artist</Text>
                    <Text style={[styles.thCell, { flex: 1.5, textAlign: "right" }]}>Sales</Text>
                    <Text style={[styles.thCell, { flex: 1.2, textAlign: "center" }]}>Progress</Text>
                    <Text style={[styles.thCell, { flex: 1.2, textAlign: "center" }]}>Status</Text>
                  </View>
                  {artists.slice(0, 8).map((artist, idx) => {
                    const sc = STATUS_COLORS[artist.status] || STATUS_COLORS.Pending;
                    return (
                      <TouchableOpacity
                        key={artist.dishId}
                        style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                        onPress={() => router.push(`/menu/artist-detail?dishId=${artist.dishId}` as any)}
                        activeOpacity={0.7}
                      >
                        <View style={[{ flex: 2 }, styles.rowCell]}>
                          <View style={[styles.avatarCircle, artist.thresholdReached && { backgroundColor: "#16A34A" }]}>
                            <Text style={styles.avatarText}>{(artist.name || "?")[0].toUpperCase()}</Text>
                          </View>
                          <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                        </View>
                        <Text style={[styles.tdCell, { flex: 1.5, textAlign: "right" }]}>${artist.totalSales.toFixed(2)}</Text>
                        {/* Progress toward threshold */}
                        <View style={[{ flex: 1.2, paddingHorizontal: 4, justifyContent: "center" }]}>
                          {artist.thresholdAmount > 0 ? (
                            <>
                              <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${artist.progressPct}%` as any, backgroundColor: artist.thresholdReached ? "#16A34A" : Theme.primary }]} />
                              </View>
                              <Text style={styles.progressLabel}>
                                {artist.thresholdReached ? "✓ Bonus!" : `$${artist.remainingToThreshold.toFixed(0)} left`}
                              </Text>
                            </>
                          ) : <Text style={styles.tdCell}>—</Text>}
                        </View>
                        <View style={[{ flex: 1.2 }, styles.badgeWrap]}>
                          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                            <Text style={[styles.badgeText, { color: sc.text }]} numberOfLines={1}>{artist.status}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {artists.length > 8 && (
                    <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push("/menu/artist-sales" as any)}>
                      <Text style={styles.viewAllText}>View All {artists.length} Artists →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                // ── Mobile: fixed-width columns + horizontal scroll ──
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: 540 }}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.thCell, { width: 150 }]}>Artist</Text>
                      <Text style={[styles.thCell, { width: 110, textAlign: "right" }]}>Sales</Text>
                      <Text style={[styles.thCell, { width: 140, textAlign: "center" }]}>Progress</Text>
                      <Text style={[styles.thCell, { width: 120, textAlign: "center" }]}>Status</Text>
                    </View>
                    {artists.slice(0, 8).map((artist, idx) => {
                      const sc = STATUS_COLORS[artist.status] || STATUS_COLORS.Pending;
                      return (
                        <TouchableOpacity
                          key={artist.dishId}
                          style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                          onPress={() => router.push(`/menu/artist-detail?dishId=${artist.dishId}` as any)}
                          activeOpacity={0.7}
                        >
                          <View style={[{ width: 150 }, styles.rowCell]}>
                            <View style={[styles.avatarCircle, artist.thresholdReached && { backgroundColor: "#16A34A" }]}>
                              <Text style={styles.avatarText}>{(artist.name || "?")[0].toUpperCase()}</Text>
                            </View>
                            <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                          </View>
                          <Text style={[styles.tdCell, { width: 110, textAlign: "right" }]}>${artist.totalSales.toFixed(2)}</Text>
                          {/* Progress toward threshold */}
                          <View style={{ width: 140, paddingHorizontal: 6, justifyContent: "center" }}>
                            {artist.thresholdAmount > 0 ? (
                              <>
                                <View style={styles.progressTrack}>
                                  <View style={[styles.progressFill, { width: `${artist.progressPct}%` as any, backgroundColor: artist.thresholdReached ? "#16A34A" : Theme.primary }]} />
                                </View>
                                <Text style={styles.progressLabel}>
                                  {artist.thresholdReached ? "✓ Bonus!" : `$${artist.remainingToThreshold.toFixed(0)} left`}
                                </Text>
                              </>
                            ) : <Text style={styles.tdCell}>—</Text>}
                          </View>
                          <View style={[{ width: 120 }, styles.badgeWrap]}>
                            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                              <Text style={[styles.badgeText, { color: sc.text }]} numberOfLines={1}>{artist.status}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {artists.length > 8 && (
                      <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push("/menu/artist-sales" as any)}>
                        <Text style={styles.viewAllText}>View All {artists.length} Artists →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.bgMain,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Theme.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
    gap: 12,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.bgMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: Fonts.black,
    fontSize: 17,
    color: Theme.textPrimary,
  },
  headerSub: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Theme.textSecondary,
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  dayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  dayBannerTitle: {
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  dayBannerSub: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginTop: 1,
  },
  dayLiveBadge: {
    backgroundColor: "#16A34A",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexShrink: 0,
  },
  dayLiveText: {
    fontFamily: Fonts.black,
    fontSize: 10,
    color: "#fff",
    letterSpacing: 1,
  },
  filterLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Theme.textSecondary,
  },
  filterValue: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Theme.primary,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardValue: {
    fontFamily: Fonts.black,
    fontSize: 22,
    color: Theme.textPrimary,
    marginBottom: 4,
  },
  cardLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Theme.textSecondary,
  },
  sectionTitle: {
    fontFamily: Fonts.black,
    fontSize: 14,
    color: Theme.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    width: "100%",
    backgroundColor: Theme.bgCard,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  tileIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tileTitle: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Theme.textPrimary,
  },
  tileSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  artistCard: {
    backgroundColor: Theme.bgCard,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Theme.border,
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Theme.bgMuted,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  thCell: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Theme.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  tableRowAlt: {
    backgroundColor: "#FAFAF9",
  },
  rowCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: Fonts.black,
    fontSize: 13,
    color: Theme.primary,
  },
  artistName: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Theme.textPrimary,
    flex: 1,
  },
  tdCell: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Theme.textPrimary,
  },
  badgeWrap: {
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  viewAllBtn: {
    padding: 14,
    alignItems: "center",
  },
  viewAllText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Theme.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 2,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Theme.textSecondary,
    textAlign: "center",
  },
});
