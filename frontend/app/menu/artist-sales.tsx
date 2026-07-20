import { API_URL } from "@/constants/Config";
import { Fonts } from "@/constants/Fonts";
import { Theme } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "../../components/Toast";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const pad = (n: number) => n.toString().padStart(2, "0");
const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => formatDate(new Date());
const firstOfMonthStr = () => { const d = new Date(); d.setDate(1); return formatDate(d); };

// Module-level persistent storage — survives navigation back/forward
let _persistedFromDate = firstOfMonthStr();
let _persistedToDate   = todayStr();

const STATUS_OPTS = ["All", "Pending", "Partially Paid", "Paid"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Paid:            { bg: "#DCFCE7", text: "#16A34A" },
  "Partially Paid": { bg: "#FEF9C3", text: "#CA8A04" },
  Pending:         { bg: "#FEE2E2", text: "#DC2626" },
  "No Bonus":      { bg: "#F5F5F4", text: "#78716C" },
};

interface ArtistRow {
  dishId: string;
  name: string;
  totalSales: number;
  bonusEarned: number;
  bonusPaid: number;
  pendingBonus: number;
  status: string;
}

export default function ArtistSalesScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [loading, setLoading]         = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [fromDate, setFromDate]       = useState(_persistedFromDate);
  const [toDate, setToDate]           = useState(_persistedToDate);

  // Keep module-level vars in sync whenever state changes
  const handleFromDateChange = (v: string) => { _persistedFromDate = v; setFromDate(v); };
  const handleToDateChange   = (v: string) => { _persistedToDate   = v; setToDate(v);   };
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [artists, setArtists]         = useState<ArtistRow[]>([]);
  const [activeRule, setActiveRule]   = useState<any>(null);
  const [cards, setCards]             = useState({ totalArtistSales: 0, totalBonusEarned: 0, totalBonusPaid: 0, pendingBonus: 0 });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_URL}/api/artist-bonus/sales-summary?fromDate=${fromDate}&toDate=${toDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setArtists(res.data.artists || []);
        setCards(res.data.cards || {});
        setActiveRule(res.data.activeRule);
      }
    } catch (err: any) {
      showToast({ type: "error", message: "Load Failed", subtitle: err.message });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, token]);

  // Only fetch automatically on mount; date changes are applied by clicking the search/apply button
  useEffect(() => { fetchData(); }, []);

  const handleCalculate = () => {
    if (!activeRule) {
      if (Platform.OS === "web") {
        alert("No Active Rule: Please create an active bonus rule in Bonus Master before calculating.");
      } else {
        Alert.alert("No Active Rule", "Please create an active bonus rule in Bonus Master before calculating.");
      }
      return;
    }
    setShowConfirmModal(true);
  };

  const runCalculation = async () => {
    try {
      setCalculating(true);
      setShowConfirmModal(false);
      const res = await axios.post(
        `${API_URL}/api/artist-bonus/calculate`,
        { fromDate, toDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        const created = res.data.results.filter((r: any) => r.action === "created").length;
        const skipped = res.data.results.filter((r: any) => r.action === "skipped_exists").length;
        showToast({
          type: "success",
          message: "Calculation Complete",
          subtitle: `${created} new transactions created, ${skipped} skipped (already exist).`,
        });
        fetchData();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      showToast({ type: "error", message: "Calculation Failed", subtitle: msg });
    } finally {
      setCalculating(false);
    }
  };

  // Filter
  const filtered = artists.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgMain} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/menu/artist-management");
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Artist Sales</Text>
          <Text style={styles.headerSub}>{filtered.length} artists</Text>
        </View>
        <TouchableOpacity
          style={[styles.calcBtn, calculating && { opacity: 0.6 }]}
          onPress={handleCalculate}
          disabled={calculating}
        >
          {calculating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="calculator" size={18} color="#fff" />
          }
          <Text style={styles.calcBtnText}>{calculating ? "Calculating..." : "Calculate"}</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        {/* Date inputs */}
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <TextInput
              style={styles.dateInput}
              value={fromDate}
              onChangeText={handleFromDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Theme.textMuted}
            />
          </View>
          <Ionicons name="arrow-forward" size={14} color={Theme.textMuted} />
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <TextInput
              style={styles.dateInput}
              value={toDate}
              onChangeText={handleToDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Theme.textMuted}
            />
          </View>
          <TouchableOpacity style={styles.searchApplyBtn} onPress={fetchData}>
            <Ionicons name="search" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search + Status */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={Theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search artist..."
              placeholderTextColor={Theme.textMuted}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
            {STATUS_OPTS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.statusTab, statusFilter === opt && styles.statusTabActive]}
                onPress={() => setStatusFilter(opt)}
              >
                <Text style={[styles.statusTabText, statusFilter === opt && styles.statusTabTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Summary Strip */}
      <View style={styles.summaryStrip}>
        {[
          { label: "Sales", value: `$${cards.totalArtistSales.toFixed(2)}`, color: "#3B82F6" },
          { label: "Earned", value: `$${cards.totalBonusEarned.toFixed(2)}`, color: Theme.primary },
          { label: "Paid", value: `$${cards.totalBonusPaid.toFixed(2)}`, color: "#16A34A" },
          { label: "Pending", value: `$${cards.pendingBonus.toFixed(2)}`, color: "#DC2626" },
        ].map(s => (
          <View key={s.label} style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {loading
        ? <ActivityIndicator size="large" color={Theme.primary} style={{ marginTop: 40 }} />
        : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thCell, { flex: 2 }]}>Artist</Text>
              <Text style={[styles.thCell, { flex: 1.4, textAlign: "right" }]}>Sales</Text>
              {isTablet && <Text style={[styles.thCell, { flex: 1.2, textAlign: "right" }]}>Earned</Text>}
              {isTablet && <Text style={[styles.thCell, { flex: 1.2, textAlign: "right" }]}>Paid</Text>}
              <Text style={[styles.thCell, { flex: 1.2, textAlign: "right" }]}>Pending</Text>
              <Text style={[styles.thCell, { flex: 1.3, textAlign: "center" }]}>Status</Text>
            </View>

            {filtered.length === 0 && (
              <View style={styles.emptyRow}>
                <Ionicons name="musical-notes-outline" size={40} color={Theme.textMuted} />
                <Text style={styles.emptyText}>No artists match the current filter</Text>
              </View>
            )}

            {filtered.map((artist, idx) => {
              const sc = STATUS_COLORS[artist.status] || STATUS_COLORS["No Bonus"];
              return (
                <TouchableOpacity
                  key={artist.dishId}
                  style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                  onPress={() => router.push(`/menu/artist-detail?dishId=${artist.dishId}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rowNameCell, { flex: 2 }]}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{(artist.name || "?")[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                  </View>
                  <Text style={[styles.tdCell, { flex: 1.4, textAlign: "right" }]}>
                    ${artist.totalSales.toFixed(2)}
                  </Text>
                  {isTablet && (
                    <Text style={[styles.tdCell, { flex: 1.2, textAlign: "right", color: Theme.primary }]}>
                      ${artist.bonusEarned.toFixed(2)}
                    </Text>
                  )}
                  {isTablet && (
                    <Text style={[styles.tdCell, { flex: 1.2, textAlign: "right", color: "#16A34A" }]}>
                      ${artist.bonusPaid.toFixed(2)}
                    </Text>
                  )}
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: "right", color: "#DC2626" }]}>
                    ${artist.pendingBonus.toFixed(2)}
                  </Text>
                  <View style={[{ flex: 1.3 }, styles.badgeWrap]}>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.text }]} numberOfLines={1}>{artist.status}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 40 }} />
          </ScrollView>
        )
      }
      {/* Custom Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="calculator-outline" size={22} color={Theme.primary} />
              <Text style={styles.modalTitle}>Calculate Bonuses</Text>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                This will calculate and finalize bonuses for all artists for the selected period:
              </Text>
              
              <View style={styles.modalDateRange}>
                <Text style={styles.modalDateText}>{fromDate}</Text>
                <Ionicons name="arrow-forward" size={14} color={Theme.textSecondary} />
                <Text style={styles.modalDateText}>{toDate}</Text>
              </View>

              <View style={styles.modalWarningBox}>
                <Ionicons name="information-circle" size={16} color="#B45309" />
                <Text style={styles.modalWarningText}>
                  Existing transactions for this period are locked and will be skipped.
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmBtn} 
                onPress={runCalculation}
              >
                <Text style={styles.modalConfirmBtnText}>Calculate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.bgMain },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: Theme.bgCard,
    borderBottomWidth: 1, borderBottomColor: Theme.border, gap: 10,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontFamily: Fonts.black, fontSize: 17, color: Theme.textPrimary },
  headerSub: { fontFamily: Fonts.medium, fontSize: 12, color: Theme.textSecondary, marginTop: 1 },
  calcBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Theme.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  calcBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#fff" },

  filterBar: {
    backgroundColor: Theme.bgCard, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Theme.border, gap: 10,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateField: { flex: 1 },
  dateLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginBottom: 4, textTransform: "uppercase" },
  dateInput: {
    backgroundColor: Theme.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary,
    borderWidth: 1, borderColor: Theme.border,
  },
  searchApplyBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Theme.primary, justifyContent: "center", alignItems: "center",
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Theme.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: Theme.border,
  },
  searchInput: { flex: 1, fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary },
  statusTabs: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  statusTab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Theme.bgMuted, borderWidth: 1, borderColor: Theme.border,
  },
  statusTabActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  statusTabText: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textSecondary },
  statusTabTextActive: { color: "#fff" },

  summaryStrip: {
    flexDirection: "row", backgroundColor: Theme.bgCard,
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Theme.border,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontFamily: Fonts.black, fontSize: 14 },
  summaryLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginTop: 2, textTransform: "uppercase" },

  tableHeader: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Theme.bgMuted, borderBottomWidth: 1, borderBottomColor: Theme.border,
  },
  thCell: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14,
    alignItems: "center", borderBottomWidth: 1, borderBottomColor: Theme.border,
  },
  tableRowAlt: { backgroundColor: "#FAFAF9" },
  rowNameCell: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontFamily: Fonts.black, fontSize: 13, color: Theme.primary },
  artistName: { fontFamily: Fonts.semiBold, fontSize: 13, color: Theme.textPrimary, flex: 1 },
  tdCell: { fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary },
  badgeWrap: { alignItems: "center" },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontFamily: Fonts.bold, fontSize: 10 },
  emptyRow: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: Fonts.medium, fontSize: 14, color: Theme.textSecondary },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalCard: {
    backgroundColor: Theme.bgCard, borderRadius: 16, width: "100%", maxWidth: 420,
    padding: 24, gap: 16,
    ...Platform.select({ web: { boxShadow: "0 10px 25px rgba(0,0,0,0.15)" } }) as any,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { fontFamily: Fonts.black, fontSize: 18, color: Theme.textPrimary },
  modalBody: { gap: 12 },
  modalMessage: { fontFamily: Fonts.medium, fontSize: 13, color: Theme.textSecondary, lineHeight: 18 },
  modalDateRange: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Theme.bgMuted, padding: 10, borderRadius: 10, alignSelf: "flex-start",
  },
  modalDateText: { fontFamily: Fonts.bold, fontSize: 13, color: Theme.textPrimary },
  modalWarningBox: {
    flexDirection: "row", gap: 8, padding: 10, borderRadius: 10,
    backgroundColor: "#FEF9C3", alignItems: "center",
  },
  modalWarningText: { fontFamily: Fonts.medium, fontSize: 12, color: "#713F12", flex: 1 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  modalCancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: Theme.border, backgroundColor: Theme.bgMuted,
  },
  modalCancelBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: Theme.textSecondary },
  modalConfirmBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Theme.primary,
  },
  modalConfirmBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#fff" },
});
