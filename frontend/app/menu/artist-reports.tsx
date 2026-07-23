import { API_URL } from "@/constants/Config";
import { Fonts } from "@/constants/Fonts";
import { Theme } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "../../components/Toast";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
const fmtDate = (raw: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};
const fmtMoney = (v: any) => `$${parseFloat(v || 0).toFixed(2)}`;
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const firstOfMonthStr = () => { const d = new Date(); d.setDate(1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

type ReportTab = "all" | "sales" | "bonus" | "payments" | "outstanding";

export default function ArtistReportsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<ReportTab>("all");
  const [loading, setLoading]     = useState(false);
  const [fromDate, setFromDate]   = useState(firstOfMonthStr());
  const [toDate, setToDate]       = useState(todayStr());
  const [data, setData]           = useState<any[]>([]);
  const [search, setSearch]       = useState("");

  // KPI cards
  const [summaryStats, setSummaryStats] = useState({
    avgBonus: 0,
    largestBonus: 0,
    mostSales: 0,
    mostPending: 0,
    totalSales: 0,
    totalBonus: 0,
    totalPaid: 0,
    totalWaiting: 0,
    artistCount: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch performance reports for statistics
      const statsRes = await axios.get(
        `${API_URL}/api/artist-bonus/reports/performance?fromDate=${fromDate}&toDate=${toDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let endpoint = `/api/artist-bonus/reports/sales?fromDate=${fromDate}&toDate=${toDate}`;
      if (activeTab === "bonus") {
        endpoint = `/api/artist-bonus/reports/bonus-ledger?fromDate=${fromDate}&toDate=${toDate}`;
      } else if (activeTab === "payments") {
        endpoint = `/api/artist-bonus/reports/payment-ledger?fromDate=${fromDate}&toDate=${toDate}`;
      } else if (activeTab === "outstanding") {
        endpoint = `/api/artist-bonus/reports/pending`;
      } else if (activeTab === "all") {
        endpoint = `/api/artist-bonus/reports/performance?fromDate=${fromDate}&toDate=${toDate}`;
      }

      const res = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setData(res.data.data || []);
      }

      if (statsRes.data.success && statsRes.data.data) {
        const list = statsRes.data.data;
        const totalSales = list.reduce((s: number, r: any) => s + Number(r.CustomSales || r.DailySales), 0);
        const totalBonus = list.reduce((s: number, r: any) => s + Number(r.TotalBonusEarned), 0);
        const totalPaid = list.reduce((s: number, r: any) => s + Number(r.TotalBonusPaid), 0);
        const totalWaiting = list.reduce((s: number, r: any) => s + Number(r.PendingBonus), 0);
        
        const avgBonus = list.length > 0 ? totalBonus / list.length : 0;
        const largestBonus = Math.max(...list.map((r: any) => Number(r.TotalBonusEarned)), 0);
        const mostSales = Math.max(...list.map((r: any) => Number(r.CustomSales || r.DailySales)), 0);
        const mostPending = Math.max(...list.map((r: any) => Number(r.PendingBonus)), 0);

        setSummaryStats({
          avgBonus,
          largestBonus,
          mostSales,
          mostPending,
          totalSales,
          totalBonus,
          totalPaid,
          totalWaiting,
          artistCount: list.length,
        });
      }
    } catch (err: any) {
      showToast({ type: "error", message: "Load Failed", subtitle: err.message });
    } finally {
      setLoading(false);
    }
  }, [activeTab, fromDate, toDate, token]);

  useEffect(() => { fetchData(); }, [activeTab, fromDate, toDate]);

  const filteredData = data.filter((r: any) => {
    const term = search.toLowerCase();
    const name = (r.ArtistName || r.Artist || "").toLowerCase();
    const bill = (r.BillNo || "").toLowerCase();
    const status = (r.Status || r.StatusText || "").toLowerCase();
    return name.includes(term) || bill.includes(term) || status.includes(term);
  });

  const exportCsv = async () => {
    if (!filteredData.length) return;
    const keys = Object.keys(filteredData[0]);
    const header = keys.join(",");
    const rows = filteredData.map(row => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const csv = `${header}\n${rows}`;

    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `artist_report_${activeTab}.csv`;
      a.click();
    } else {
      try {
        const FileSystem = require("expo-file-system");
        const path = `${FileSystem.cacheDirectory}artist_report_${activeTab}.csv`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path);
      } catch (e) {
        showToast({ type: "error", message: "Export Failed", subtitle: "Unable to export on this device." });
      }
    }
  };

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
          <Text style={styles.headerTitle}>Incentive Ledger Audits</Text>
          <Text style={styles.headerSub}>{filteredData.length} entries found</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={exportCsv}>
          <Ionicons name="download-outline" size={17} color={Theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Filter & Search */}
      <View style={styles.filterBar}>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <TextInput style={styles.dateInput} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" placeholderTextColor={Theme.textMuted} />
          </View>
          <Ionicons name="arrow-forward" size={14} color={Theme.textMuted} />
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <TextInput style={styles.dateInput} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" placeholderTextColor={Theme.textMuted} />
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={fetchData}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Search Everywhere Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Theme.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Artist, Bill, Status, etc..."
            placeholderTextColor={Theme.textMuted}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* ── KPI EXECUTIVE SUMMARY ── */}
        <View style={styles.kpiGrid}>
          {[
            { label: "Largest Bonus", value: `$${summaryStats.largestBonus.toFixed(0)}`, color: "#F97316" },
            { label: "Average Bonus", value: `$${summaryStats.avgBonus.toFixed(0)}`, color: "#2563EB" },
            { label: "Most Sales", value: `$${summaryStats.mostSales.toFixed(0)}`, color: "#16A34A" },
            { label: "Most Pending", value: `$${summaryStats.mostPending.toFixed(0)}`, color: "#DC2626" },
          ].map(k => (
            <View key={k.label} style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* ── TABS AS QUICK FILTERS ── */}
        <View style={styles.filterTabs}>
          {([
            { key: "all", label: "All Ledgers" },
            { key: "sales", label: "Sales Log" },
            { key: "bonus", label: "Bonus Earned" },
            { key: "payments", label: "Payout Logs" },
            { key: "outstanding", label: "Waiting" },
          ] as const).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, activeTab === tab.key && styles.filterTabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.filterTabText, activeTab === tab.key && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.reportContainer}>
            {filteredData.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={40} color={Theme.textMuted} />
                <Text style={styles.emptyText}>No matching audits found.</Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {filteredData.map((row, idx) => (
                  <View key={idx} style={styles.rowCard}>
                    <View style={styles.rowTop}>
                      <Text style={styles.artistNameText}>{row.ArtistName || row.Artist}</Text>
                      {activeTab === "all" && (
                        <Text style={styles.metricText}>Sales: {fmtMoney(row.CustomSales || row.DailySales)}</Text>
                      )}
                      {activeTab === "sales" && (
                        <Text style={styles.metricText}>{fmtMoney(row.TotalSales)}</Text>
                      )}
                      {activeTab === "bonus" && (
                        <Text style={[styles.metricText, { color: "#F97316" }]}>+{fmtMoney(row.BonusEarned)}</Text>
                      )}
                      {activeTab === "payments" && (
                        <Text style={[styles.metricText, { color: "#16A34A" }]}>-{fmtMoney(row.PaymentAmount)}</Text>
                      )}
                      {activeTab === "outstanding" && (
                        <Text style={[styles.metricText, { color: "#DC2626" }]}>{fmtMoney(row.PendingBonus)}</Text>
                      )}
                    </View>

                    {/* Metadata details */}
                    <View style={styles.rowMeta}>
                      {row.CreatedDate && (
                        <Text style={styles.metaText}>Date: {fmtDate(row.CreatedDate)}</Text>
                      )}
                      {row.PaidDate && (
                        <Text style={styles.metaText}>Paid: {fmtDate(row.PaidDate)} by {row.PaidBy}</Text>
                      )}
                      {row.SalesFromDate && (
                        <Text style={styles.metaText}>Cycle: {fmtDate(row.SalesFromDate)} ➔ {fmtDate(row.SalesToDate)}</Text>
                      )}
                      {row.Remarks && (
                        <Text style={styles.remarksText}>Note: {row.Remarks}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Summary Strip */}
      <View style={styles.bottomStrip}>
        <View style={styles.stripCell}>
          <Text style={styles.stripLabel}>Total Sales</Text>
          <Text style={[styles.stripVal, { color: "#2563EB" }]}>${summaryStats.totalSales.toFixed(0)}</Text>
        </View>
        <View style={styles.stripCell}>
          <Text style={styles.stripLabel}>Total Bonus</Text>
          <Text style={[styles.stripVal, { color: "#F97316" }]}>${summaryStats.totalBonus.toFixed(0)}</Text>
        </View>
        <View style={styles.stripCell}>
          <Text style={styles.stripLabel}>Total Paid</Text>
          <Text style={[styles.stripVal, { color: "#16A34A" }]}>${summaryStats.totalPaid.toFixed(0)}</Text>
        </View>
        <View style={styles.stripCell}>
          <Text style={styles.stripLabel}>Waiting</Text>
          <Text style={[styles.stripVal, { color: "#DC2626" }]}>${summaryStats.totalWaiting.toFixed(0)}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.bgMain },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Theme.bgCard, borderBottomWidth: 1, borderBottomColor: Theme.border, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontFamily: Fonts.black, fontSize: 17, color: Theme.textPrimary },
  headerSub: { fontFamily: Fonts.medium, fontSize: 12, color: Theme.textSecondary },
  exportBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center" },

  // Filters
  filterBar: { backgroundColor: Theme.bgCard, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.border, gap: 10 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateField: { flex: 1 },
  dateLabel: { fontFamily: Fonts.medium, fontSize: 9, color: Theme.textSecondary, marginBottom: 4, textTransform: "uppercase" },
  dateInput: { backgroundColor: Theme.bgInput, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary, borderWidth: 1, borderColor: Theme.border },
  applyBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: Theme.primary, justifyContent: "center", marginTop: 12 },
  applyBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#fff" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Theme.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: Theme.border },
  searchInput: { flex: 1, fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary },

  // KPI grid
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16 },
  kpiCard: { flex: 1, minWidth: "45%", backgroundColor: Theme.bgCard, borderWidth: 1, borderColor: Theme.border, borderRadius: 12, padding: 12, alignItems: "center" },
  kpiValue: { fontFamily: Fonts.black, fontSize: 18 },
  kpiLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginTop: 4 },

  // Filter Tabs
  filterTabs: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Theme.bgMuted, borderWidth: 1, borderColor: Theme.border },
  filterTabActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  filterTabText: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textSecondary },
  filterTabTextActive: { color: "#fff" },

  reportContainer: { paddingHorizontal: 16, paddingBottom: 80 },
  cardList: { gap: 8 },
  rowCard: { backgroundColor: Theme.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Theme.border },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  artistNameText: { fontFamily: Fonts.black, fontSize: 13, color: Theme.textPrimary },
  metricText: { fontFamily: Fonts.black, fontSize: 14, color: Theme.textPrimary },
  rowMeta: { marginTop: 6, gap: 4 },
  metaText: { fontFamily: Fonts.medium, fontSize: 11, color: Theme.textSecondary },
  remarksText: { fontFamily: Fonts.regular, fontSize: 11, color: Theme.textMuted, fontStyle: "italic", marginTop: 2 },

  bottomStrip: { flexDirection: "row", backgroundColor: Theme.bgCard, borderTopWidth: 2, borderTopColor: Theme.primary, paddingVertical: 12, paddingHorizontal: 8 },
  stripCell: { flex: 1, alignItems: "center" },
  stripLabel: { fontFamily: Fonts.medium, fontSize: 9, color: Theme.textMuted, textTransform: "uppercase" },
  stripVal: { fontFamily: Fonts.black, fontSize: 15, marginTop: 2 },

  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontFamily: Fonts.medium, fontSize: 14, color: Theme.textSecondary },
});
