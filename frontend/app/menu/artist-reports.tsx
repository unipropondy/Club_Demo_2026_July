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

type ReportTab = "sales" | "bonus-ledger" | "payment-ledger" | "pending" | "performance";

const TABS: { key: ReportTab; label: string; icon: string }[] = [
  { key: "sales",          label: "Sales",         icon: "bar-chart" },
  { key: "bonus-ledger",   label: "Bonus Ledger",  icon: "trophy" },
  { key: "payment-ledger", label: "Payment Ledger",icon: "cash" },
  { key: "pending",        label: "Pending",       icon: "time" },
  { key: "performance",    label: "Performance",   icon: "trending-up" },
];

export default function ArtistReportsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [loading, setLoading]     = useState(false);
  const [fromDate, setFromDate]   = useState(firstOfMonthStr());
  const [toDate, setToDate]       = useState(todayStr());
  const [data, setData]           = useState<any[]>([]);
  const [hasCustomRange, setHasCustomRange] = useState(false);

  const ENDPOINT_MAP: Record<ReportTab, string> = {
    "sales":          `/api/artist-bonus/reports/sales?fromDate=${fromDate}&toDate=${toDate}`,
    "bonus-ledger":   `/api/artist-bonus/reports/bonus-ledger?fromDate=${fromDate}&toDate=${toDate}`,
    "payment-ledger": `/api/artist-bonus/reports/payment-ledger?fromDate=${fromDate}&toDate=${toDate}`,
    "pending":        `/api/artist-bonus/reports/pending`,
    "performance":    `/api/artist-bonus/reports/performance?fromDate=${fromDate}&toDate=${toDate}`,
  };

  const fetchReport = useCallback(async (tab: ReportTab = activeTab) => {
    try {
      setLoading(true);
      setData([]);
      const res = await axios.get(`${API_URL}${ENDPOINT_MAP[tab]}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setData(res.data.data || []);
        setHasCustomRange(res.data.hasCustomRange ?? false);
      }
    } catch (err: any) {
      showToast({ type: "error", message: "Load Failed", subtitle: err.message });
    } finally {
      setLoading(false);
    }
  }, [activeTab, fromDate, toDate, token]);

  useEffect(() => { fetchReport(activeTab); }, [activeTab]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCsv = async () => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const header = keys.join(",");
    const rows = data.map(row => keys.map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const csv = `${header}\n${rows}`;

    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `artist_${activeTab}_${fromDate}.csv`;
      a.click();
    } else {
      try {
        const FileSystem = require("expo-file-system");
        const path = `${FileSystem.cacheDirectory}artist_${activeTab}.csv`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path);
      } catch (e) {
        showToast({ type: "error", message: "Export Failed", subtitle: "Unable to export on this device." });
      }
    }
  };

  // ── Print HTML ────────────────────────────────────────────────────────────
  const printReport = async () => {
    if (!data.length) return;
    const tabLabel = TABS.find(t => t.key === activeTab)?.label || "Report";

    // Curated column definitions per tab — mirrors the on-screen table exactly
    type ColDef = { label: string; render: (r: any) => string };
    const COL_DEFS: Record<ReportTab, ColDef[]> = {
      "sales": [
        { label: "Artist",  render: r => r.ArtistName },
        { label: "Sales",   render: r => fmtMoney(r.TotalSales) },
        { label: "Earned",  render: r => fmtMoney(r.BonusEarned) },
        { label: "Paid",    render: r => fmtMoney(r.BonusPaid) },
        { label: "Pending", render: r => fmtMoney(r.PendingBonus) },
      ],
      "bonus-ledger": [
        { label: "Artist",  render: r => r.ArtistName },
        { label: "From",    render: r => fmtDate(r.SalesFromDate) },
        { label: "To",      render: r => fmtDate(r.SalesToDate) },
        { label: "Sales",   render: r => fmtMoney(r.TotalSales) },
        { label: "Earned",  render: r => fmtMoney(r.BonusEarned) },
        { label: "Paid",    render: r => fmtMoney(r.BonusPaid) },
        { label: "Pending", render: r => fmtMoney(r.PendingBonus) },
        { label: "Status",  render: r => r.Status },
      ],
      "payment-ledger": [
        { label: "Artist",       render: r => r.ArtistName },
        { label: "Paid Date",    render: r => fmtDate(r.PaidDate) },
        { label: "Amount",       render: r => fmtMoney(r.PaymentAmount) },
        { label: "Paid By",      render: r => r.PaidBy || "—" },
        { label: "Remarks",      render: r => r.Remarks || "—" },
        { label: "Bonus Period", render: r => `${fmtDate(r.SalesFromDate)} to ${fmtDate(r.SalesToDate)}` },
      ],
      "pending": [
        { label: "Artist",  render: r => r.ArtistName },
        { label: "Earned",  render: r => fmtMoney(r.BonusEarned) },
        { label: "Paid",    render: r => fmtMoney(r.BonusPaid) },
        { label: "Pending", render: r => fmtMoney(r.PendingBonus) },
        { label: "From",    render: r => fmtDate(r.SalesFromDate) },
        { label: "To",      render: r => fmtDate(r.SalesToDate) },
        { label: "Status",  render: r => r.Status },
      ],
      "performance": [
        { label: "Artist",  render: r => r.ArtistName },
        { label: "Daily",   render: r => fmtMoney(r.DailySales) },
        { label: "Weekly",  render: r => fmtMoney(r.WeeklySales) },
        { label: "Monthly", render: r => fmtMoney(r.MonthlySales) },
        { label: "Yearly",  render: r => fmtMoney(r.YearlySales) },
        { label: "Earned",  render: r => fmtMoney(r.TotalBonusEarned) },
        { label: "Paid",    render: r => fmtMoney(r.TotalBonusPaid) },
        { label: "Pending", render: r => fmtMoney(r.PendingBonus) },
      ],
    };

    const cols = COL_DEFS[activeTab];
    const headers = cols.map(c => `<th>${c.label}</th>`).join("");
    const rows = data.map(row =>
      `<tr>${cols.map(c => `<td>${c.render(row)}</td>`).join("")}</tr>`
    ).join("");

    const formattedSgt = new Date().toLocaleString("en-SG", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }) + " SGT";

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; padding: 24px; }
          h1 { font-size: 20px; color: #F97316; }
          p { font-size: 12px; color: #6B7280; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #F97316; color: white; padding: 8px; text-align: left; }
          td { padding: 7px 8px; border-bottom: 1px solid #E5E7EB; }
          tr:nth-child(even) td { background: #FFF7ED; }
        </style>
      </head>
      <body>
        <h1>Artist ${tabLabel} Report</h1>
        <p>Period: ${fromDate} to ${toDate} | Generated: ${formattedSgt}</p>
        <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
      </body>
      </html>
    `;

    try {
      if (Platform.OS === "web") {
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      showToast({ type: "error", message: "Print Failed", subtitle: "Unable to print." });
    }
  };

  // ── Render Table Columns per tab ─────────────────────────────────────────
  const renderTable = () => {
    if (!data.length) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={40} color={Theme.textMuted} />
          <Text style={styles.emptyText}>No data for selected period</Text>
        </View>
      );
    }

    switch (activeTab) {
      case "sales":
        return (
          <>
            <TableRow header cells={["Artist", "Sales", "Earned", "Paid", "Pending"]} />
            {data.map((r, i) => (
              <TableRow key={i} alt={i % 2 === 1} cells={[
                r.ArtistName,
                fmtMoney(r.TotalSales),
                fmtMoney(r.BonusEarned),
                fmtMoney(r.BonusPaid),
                fmtMoney(r.PendingBonus),
              ]} />
            ))}
            <TotalsRow data={data} keys={["TotalSales","BonusEarned","BonusPaid","PendingBonus"]} />
          </>
        );

      case "bonus-ledger":
        return (
          <>
            <TableRow header cells={["Artist", "From", "To", "Sales", "Earned", "Paid", "Pending", "Status"]} />
            {data.map((r, i) => {
              const sc = r.Status === "Paid" ? "#16A34A" : r.Status === "Partially Paid" ? "#CA8A04" : "#DC2626";
              return (
                <TableRow key={i} alt={i % 2 === 1} cells={[
                  r.ArtistName,
                  fmtDate(r.SalesFromDate),
                  fmtDate(r.SalesToDate),
                  fmtMoney(r.TotalSales),
                  fmtMoney(r.BonusEarned),
                  fmtMoney(r.BonusPaid),
                  fmtMoney(r.PendingBonus),
                  r.Status,
                ]} statusCol={7} statusColor={sc} />
              );
            })}
          </>
        );

      case "payment-ledger":
        return (
          <>
            <TableRow header cells={["Artist", "Paid Date", "Amount", "Paid By", "Remarks", "Bonus Period"]} />
            {data.map((r, i) => (
              <TableRow key={i} alt={i % 2 === 1} cells={[
                r.ArtistName,
                fmtDate(r.PaidDate),
                fmtMoney(r.PaymentAmount),
                r.PaidBy,
                r.Remarks || "—",
                `${fmtDate(r.SalesFromDate)} → ${fmtDate(r.SalesToDate)}`,
              ]} />
            ))}
            <TotalsRow data={data} keys={["PaymentAmount"]} />
          </>
        );

      case "pending":
        return (
          <>
            <TableRow header cells={["Artist", "Earned", "Paid", "Pending", "From", "To", "Status"]} />
            {data.map((r, i) => {
              const sc = r.Status === "Partially Paid" ? "#CA8A04" : "#DC2626";
              return (
                <TableRow key={i} alt={i % 2 === 1} cells={[
                  r.ArtistName,
                  fmtMoney(r.BonusEarned),
                  fmtMoney(r.BonusPaid),
                  fmtMoney(r.PendingBonus),
                  fmtDate(r.SalesFromDate),
                  fmtDate(r.SalesToDate),
                  r.Status,
                ]} statusCol={6} statusColor={sc} />
              );
            })}
            <TotalsRow data={data} keys={["BonusEarned","BonusPaid","PendingBonus"]} />
          </>
        );

      case "performance":
        return (
          <>
            <TableRow header cells={[
              "Artist",
              ...(hasCustomRange ? [`${fromDate} – ${toDate}`] : []),
              "Daily", "Weekly", "Monthly", "Yearly",
              "Earned", "Paid", "Pending"
            ]} />
            {data.map((r, i) => (
              <TableRow key={i} alt={i % 2 === 1} cells={[
                r.ArtistName,
                ...(hasCustomRange ? [fmtMoney(r.CustomSales)] : []),
                fmtMoney(r.DailySales),
                fmtMoney(r.WeeklySales),
                fmtMoney(r.MonthlySales),
                fmtMoney(r.YearlySales),
                fmtMoney(r.TotalBonusEarned),
                fmtMoney(r.TotalBonusPaid),
                fmtMoney(r.PendingBonus),
              ]} />
            ))}
          </>
        );

      default:
        return null;
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
              router.replace("/menu/artist-management" as any);
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Artist Reports</Text>
          <Text style={styles.headerSub}>{data.length} records</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={exportCsv}>
          <Ionicons name="download-outline" size={17} color={Theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.printBtn} onPress={printReport}>
          <Ionicons name="print-outline" size={17} color={Theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Filter */}
      {(activeTab === "sales" || activeTab === "bonus-ledger" || activeTab === "payment-ledger" || activeTab === "performance") && (
        <View style={styles.filterBar}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <TextInput style={styles.dateInput} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" placeholderTextColor={Theme.textMuted} />
          </View>
          <Ionicons name="arrow-forward" size={14} color={Theme.textMuted} />
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <TextInput style={styles.dateInput} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" placeholderTextColor={Theme.textMuted} />
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={() => fetchReport(activeTab)}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.key ? Theme.primary : Theme.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Report Table */}
      {loading
        ? <ActivityIndicator size="large" color={Theme.primary} style={{ marginTop: 60 }} />
        : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minWidth: width }}>
              <View style={styles.tableWrap}>
                {renderTable()}
              </View>
              <View style={{ height: 60 }} />
            </ScrollView>
          </ScrollView>
        )
      }
    </SafeAreaView>
  );
}

// ── Reusable Table Components ─────────────────────────────────────────────

function TableRow({
  cells,
  header,
  alt,
  statusCol,
  statusColor,
}: {
  cells: string[];
  header?: boolean;
  alt?: boolean;
  statusCol?: number;
  statusColor?: string;
}) {
  return (
    <View style={[
      tableStyles.row,
      header && tableStyles.headerRow,
      alt && tableStyles.altRow,
    ]}>
      {cells.map((cell, i) => {
        const isStatus = statusCol !== undefined && i === statusCol;
        return (
          <View key={i} style={[tableStyles.cell, i === 0 && tableStyles.firstCell]}>
            {isStatus
              ? (
                <View style={[tableStyles.statusBadge, { backgroundColor: (statusColor || Theme.primary) + "20" }]}>
                  <Text style={[tableStyles.statusText, { color: statusColor }]}>{cell}</Text>
                </View>
              )
              : (
                <Text
                  style={[
                    header ? tableStyles.headerText : tableStyles.cellText,
                    i > 0 && { textAlign: "right" },
                  ]}
                  numberOfLines={1}
                >
                  {cell}
                </Text>
              )
            }
          </View>
        );
      })}
    </View>
  );
}

function TotalsRow({ data, keys }: { data: any[]; keys: string[] }) {
  const totals: Record<string, number> = {};
  keys.forEach(k => { totals[k] = data.reduce((s, r) => s + parseFloat(r[k] || 0), 0); });

  return (
    <View style={tableStyles.totalsRow}>
      <View style={[tableStyles.cell, tableStyles.firstCell]}>
        <Text style={tableStyles.totalLabel}>TOTAL</Text>
      </View>
      {Object.values(totals).map((v, i) => (
        <View key={i} style={tableStyles.cell}>
          <Text style={[tableStyles.totalValue, { textAlign: "right" }]}>{`$${v.toFixed(2)}`}</Text>
        </View>
      ))}
    </View>
  );
}

const tableStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minWidth: 900,
  },
  headerRow: { backgroundColor: Theme.bgMuted },
  altRow: { backgroundColor: "#FAFAF9" },
  totalsRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: Theme.primary,
    backgroundColor: Theme.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minWidth: 900,
  },
  cell: { flex: 1, paddingHorizontal: 6, justifyContent: "center", minWidth: 90 },
  firstCell: { minWidth: 120 },
  headerText: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  cellText: { fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary },
  totalLabel: { fontFamily: Fonts.black, fontSize: 12, color: Theme.primary, textTransform: "uppercase" },
  totalValue: { fontFamily: Fonts.black, fontSize: 14, color: Theme.primary },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
  statusText: { fontFamily: Fonts.bold, fontSize: 10 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.bgMain },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: Theme.bgCard,
    borderBottomWidth: 1, borderBottomColor: Theme.border, gap: 8,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontFamily: Fonts.black, fontSize: 17, color: Theme.textPrimary },
  headerSub: { fontFamily: Fonts.medium, fontSize: 12, color: Theme.textSecondary, marginTop: 1 },
  exportBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },
  printBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },
  filterBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Theme.bgCard, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Theme.border,
  },
  dateField: { flex: 1 },
  dateLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginBottom: 3, textTransform: "uppercase" },
  dateInput: {
    backgroundColor: Theme.bgInput, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary,
    borderWidth: 1, borderColor: Theme.border,
  },
  applyBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Theme.primary,
  },
  applyBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#fff" },
  tabBar: {
    backgroundColor: Theme.bgCard,
    borderBottomWidth: 1, borderBottomColor: Theme.border,
    flexGrow: 0, flexShrink: 0,
  },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Theme.primary },
  tabText: { fontFamily: Fonts.bold, fontSize: 12, color: Theme.textMuted, textTransform: "uppercase" },
  tabTextActive: { color: Theme.primary },
  tableWrap: {
    backgroundColor: Theme.bgCard, margin: 8,
    borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: Theme.border,
  },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: Fonts.medium, fontSize: 14, color: Theme.textSecondary },
});
