import { API_URL } from "@/constants/Config";
import { Fonts } from "@/constants/Fonts";
import { Theme } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "../../components/Toast";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

const pad = (n: number) => n.toString().padStart(2, "0");
const formatLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

interface ArtistRow {
  dishId: string;
  name: string;
  totalSales: number;
  bonusEarned: number;
  bonusPaid: number;
  pendingBonus: number;
  status: string;
  thresholdAmount: number;
  thresholdReached: boolean;
  progressPct: number;
  remainingToThreshold: number;
  lifetimeOutstanding?: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Paid:             { bg: "#F0FDF4", text: "#16A34A" },
  "Partially Paid": { bg: "#FFFBEB", text: "#D97706" },
  Pending:          { bg: "#FEF2F2", text: "#DC2626" },
  Accruing:         { bg: "#E0F2FE", text: "#0284C7" },
};

export default function ArtistManagementScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { token } = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [loading, setLoading]         = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [isDayActive, setIsDayActive] = useState(false);
  const [activeDay, setActiveDay]     = useState<string | null>(null);
  const [cards, setCards] = useState({ totalArtistSales: 0, totalBonusEarned: 0, totalBonusPaid: 0, pendingBonus: 0 });
  const [artists, setArtists]         = useState<ArtistRow[]>([]);
  const [activeRule, setActiveRule]   = useState<any>(null);
  const [pendingArtists, setPendingArtists] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, pendingRes] = await Promise.all([
        axios.get(`${API_URL}/api/artist-bonus/sales-summary`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/artist-bonus/pending`,       { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (summaryRes.data.success) {
        setCards(summaryRes.data.cards);
        setArtists(summaryRes.data.artists || []);
        setActiveRule(summaryRes.data.activeRule);
        setIsDayActive(summaryRes.data.isDayActive ?? false);
        setActiveDay(summaryRes.data.activeDay ?? null);
      }
      if (pendingRes.data.success) {
        setPendingArtists(pendingRes.data.data || []);
      }
    } catch (err: any) {
      showToast({ type: "error", message: "Load Failed", subtitle: "Could not load artist summary." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => fetchData());
    return unsubscribe;
  }, [navigation, fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Group pending by artist name
  const pendingByArtist: Record<string, number> = {};
  pendingArtists.forEach(txn => {
    const name = txn.ArtistName || "Unknown";
    pendingByArtist[name] = (pendingByArtist[name] || 0) + (Number(txn.pendingBonus) || 0);
  });
  const artistsWithPending = Object.keys(pendingByArtist).filter(n => pendingByArtist[n] > 0);
  const totalAllTimePending = Object.values(pendingByArtist).reduce((s, v) => s + v, 0);

  const quickLinks = [
    { title: "Bonus Payments", icon: "cash",          color: "#16A34A", bg: "#F0FDF4", route: "/menu/artist-bonus-payments" },
    { title: "Bonus Master",   icon: "settings",      color: "#F97316", bg: "#FFF7ED", route: "/menu/artist-bonus-master" },
    { title: "Artist Sales",   icon: "bar-chart",     color: "#3B82F6", bg: "#EFF6FF", route: "/menu/artist-sales" },
    { title: "Reports",        icon: "document-text", color: "#8B5CF6", bg: "#F5F3FF", route: "/menu/artist-reports" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgMain} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/category" as any);
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Artist Management</Text>
          <Text style={styles.headerSub}>
            {activeRule
              ? `Rule: Every $${activeRule.ThresholdAmount} → $${activeRule.BonusAmount} bonus`
              : "No active bonus rule"}
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
        {/* ── PENDING BONUS ALERT ── */}
        {artistsWithPending.length > 0 && (
          <TouchableOpacity
            style={styles.pendingAlert}
            onPress={() => router.push("/menu/artist-bonus-payments" as any)}
            activeOpacity={0.8}
          >
            <View style={styles.pendingAlertIcon}>
              <Ionicons name="alert-circle" size={22} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingAlertTitle}>
                {artistsWithPending.length} Artist{artistsWithPending.length > 1 ? "s" : ""} with Unpaid Bonuses
              </Text>
              <Text style={styles.pendingAlertSub}>
                ${totalAllTimePending.toFixed(2)} total outstanding · Tap to settle →
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        )}

        {/* ── DAY STATUS BANNER ── */}
        <View style={[
          styles.dayBanner,
          { backgroundColor: isDayActive ? "#F0FDF4" : "#F8FAFC", borderColor: isDayActive ? "#86EFAC" : Theme.border }
        ]}>
          <View style={[styles.dayDot, { backgroundColor: isDayActive ? "#16A34A" : "#94A3B8" }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dayBannerTitle, { color: isDayActive ? "#15803D" : Theme.textSecondary }]}>
              {isDayActive ? `Business Day Active — ${activeDay}` : "No Active Business Day"}
            </Text>
            <Text style={[styles.dayBannerSub, { color: isDayActive ? "#16A34A" : Theme.textMuted }]}>
              {isDayActive ? "Bonuses accumulate until Day End" : "Bonus payments can still be processed"}
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

        {/* ── KPI SUMMARY ── */}
        <View style={styles.cardsGrid}>
          {[
            { label: "Artist Sales",   value: `$${cards.totalArtistSales.toFixed(2)}`,  icon: "musical-notes",    color: "#3B82F6", bg: "#EFF6FF" },
            { label: "Bonus Earned",   value: `$${cards.totalBonusEarned.toFixed(2)}`,  icon: "trophy",           color: "#F97316", bg: "#FFF7ED" },
            { label: "Bonus Paid",     value: `$${cards.totalBonusPaid.toFixed(2)}`,    icon: "checkmark-circle", color: "#16A34A", bg: "#F0FDF4" },
            { label: "All-time Unpaid",value: `$${totalAllTimePending.toFixed(2)}`,     icon: "time",             color: totalAllTimePending > 0 ? "#DC2626" : "#16A34A", bg: totalAllTimePending > 0 ? "#FEF2F2" : "#F0FDF4" },
          ].map(c => (
            <View key={c.label} style={[styles.card, { backgroundColor: c.bg }, isTablet && { flex: 1 }]}>
              <View style={[styles.cardIconWrap, { backgroundColor: c.color + "22" }]}>
                <Ionicons name={c.icon as any} size={22} color={c.color} />
              </View>
              <Text style={styles.cardValue}>{c.value}</Text>
              <Text style={styles.cardLabel}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* ── QUICK LINKS ── */}
        <View style={styles.quickLinksRow}>
          {quickLinks.map(link => (
            <TouchableOpacity
              key={link.route}
              style={[styles.quickLink, { backgroundColor: link.bg }]}
              onPress={() => router.push(link.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: link.color + "22" }]}>
                <Ionicons name={link.icon as any} size={20} color={link.color} />
              </View>
              <Text style={[styles.quickLinkText, { color: link.color }]}>{link.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── ARTIST LIST ── */}
        {artists.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Artists</Text>
            <View style={styles.artistCard}>
              {/* Table header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 2 }]}>Artist</Text>
                <Text style={[styles.thCell, { flex: 1.2, textAlign: "right" }]}>Sales</Text>
                <Text style={[styles.thCell, { flex: 1.2, textAlign: "right" }]}>Outstanding</Text>
                <Text style={[styles.thCell, { flex: 0.8, textAlign: "center" }]}>Status</Text>
              </View>

              {artists.map((artist, idx) => {
                const sc = STATUS_COLORS[artist.status] || STATUS_COLORS.Pending;
                // Get all-time outstanding for this artist
                const artistLifetimeOwed = pendingByArtist[artist.name] ?? 0;
                const hasDebt = artistLifetimeOwed > 0;

                return (
                  <TouchableOpacity
                    key={artist.dishId}
                    style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                    onPress={() => router.push(`/menu/artist-detail?dishId=${artist.dishId}` as any)}
                    activeOpacity={0.7}
                  >
                    {/* Name */}
                    <View style={[{ flex: 2 }, styles.rowCell]}>
                      <View style={[styles.avatarCircle, hasDebt && { backgroundColor: "#FEE2E2" }]}>
                        <Text style={[styles.avatarText, hasDebt && { color: "#DC2626" }]}>
                          {(artist.name || "?")[0].toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                    </View>

                    {/* Sales */}
                    <Text style={[styles.tdCell, { flex: 1.2, textAlign: "right" }]}>
                      ${artist.totalSales.toFixed(0)}
                    </Text>

                    {/* All-time outstanding */}
                    <Text style={[styles.tdCell, { flex: 1.2, textAlign: "right", fontFamily: Fonts.bold, color: hasDebt ? "#DC2626" : "#16A34A" }]}>
                      {hasDebt ? `$${artistLifetimeOwed.toFixed(0)}` : "—"}
                    </Text>

                    {/* Status badge */}
                    <View style={[{ flex: 0.8 }, styles.badgeWrap]}>
                      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.text }]} numberOfLines={1}>
                          {artist.status === "Accruing" ? "Active" : artist.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => router.push("/menu/artist-sales" as any)}
              >
                <Text style={styles.viewAllText}>View Full Sales Report →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.bgMain },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: Theme.bgCard,
    borderBottomWidth: 1, borderBottomColor: Theme.border, gap: 12,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: Fonts.black, fontSize: 17, color: Theme.textPrimary },
  headerSub: { fontFamily: Fonts.medium, fontSize: 11, color: Theme.textSecondary, marginTop: 1 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40 },

  pendingAlert: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14,
    backgroundColor: "#FEF2F2", borderWidth: 1.5, borderColor: "#FECACA",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(220,38,38,0.1)" } }) as any,
  },
  pendingAlertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center" },
  pendingAlertTitle: { fontFamily: Fonts.bold, fontSize: 14, color: "#B91C1C" },
  pendingAlertSub: { fontFamily: Fonts.medium, fontSize: 12, color: "#DC2626", marginTop: 2 },

  dayBanner: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  dayDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  dayBannerTitle: { fontFamily: Fonts.bold, fontSize: 13 },
  dayBannerSub: { fontFamily: Fonts.medium, fontSize: 11, marginTop: 1 },
  dayLiveBadge: { backgroundColor: "#16A34A", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  dayLiveText: { fontFamily: Fonts.black, fontSize: 10, color: "#fff", letterSpacing: 1 },

  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  card: {
    width: "47%", borderRadius: 14, padding: 14,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  cardIconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  cardValue: { fontFamily: Fonts.black, fontSize: 20, color: Theme.textPrimary, marginBottom: 4 },
  cardLabel: { fontFamily: Fonts.medium, fontSize: 11, color: Theme.textSecondary },

  quickLinksRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  quickLink: {
    flex: 1, borderRadius: 12, padding: 10, alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: "transparent",
  },
  quickLinkIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  quickLinkText: { fontFamily: Fonts.bold, fontSize: 10, textAlign: "center" },

  sectionTitle: {
    fontFamily: Fonts.black, fontSize: 12, color: Theme.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },
  artistCard: {
    backgroundColor: Theme.bgCard, borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: Theme.border, marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Theme.bgMuted, borderBottomWidth: 1, borderBottomColor: Theme.border,
  },
  thCell: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, alignItems: "center", borderBottomWidth: 1, borderBottomColor: Theme.border },
  tableRowAlt: { backgroundColor: "#FAFAF9" },
  rowCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center" },
  avatarText: { fontFamily: Fonts.black, fontSize: 12, color: Theme.primary },
  artistName: { fontFamily: Fonts.semiBold, fontSize: 13, color: Theme.textPrimary, flex: 1 },
  tdCell: { fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary },
  badgeWrap: { alignItems: "center" },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontFamily: Fonts.bold, fontSize: 10 },
  viewAllBtn: { padding: 14, alignItems: "center" },
  viewAllText: { fontFamily: Fonts.bold, fontSize: 13, color: Theme.primary },
});
