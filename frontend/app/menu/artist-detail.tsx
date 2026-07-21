import { API_URL } from "@/constants/Config";
import { Fonts } from "@/constants/Fonts";
import { Theme } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "../../components/Toast";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
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
const formatDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return formatDateStr(d); };
const todayStr = () => formatDateStr(new Date());

const fmtDate = (raw: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Paid:             { bg: "#DCFCE7", text: "#16A34A" },
  "Partially Paid": { bg: "#FEF9C3", text: "#CA8A04" },
  Pending:          { bg: "#FEE2E2", text: "#DC2626" },
};

type TabKey = "sales" | "bonus" | "payments";

export default function ArtistDetailScreen() {
  const { dishId } = useLocalSearchParams<{ dishId: string }>();
  const router     = useRouter();
  const { token }  = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<TabKey>("bonus");
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Date range for historical lookup; empty = use active business day (backend default)
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [isDayActive, setIsDayActive] = useState(false);
  const [activeDay, setActiveDay]     = useState<string | null>(null);

  const [artist, setArtist]           = useState<{ dishId: string; name: string } | null>(null);
  const [summary, setSummary]         = useState({ totalSales: 0, bonusEarned: 0, bonusPaid: 0, pendingBonus: 0 });
  const [activeRule, setActiveRule]   = useState<any>(null);
  const [progress, setProgress]       = useState<any>(null);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [bonusHistory, setBonusHistory] = useState<any[]>([]);
  const [payHistory, setPayHistory]   = useState<any[]>([]);

  // Pay modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedTxn, setSelectedTxn]   = useState<any>(null);
  const [payAmount, setPayAmount]       = useState("");
  const [payRemarks, setPayRemarks]     = useState("");
  const [paying, setPaying]             = useState(false);

  // fetchData: if no fromDate/toDate, backend defaults to active business day
  const fetchData = useCallback(async (explicitFrom?: string, explicitTo?: string) => {
    if (!dishId) return;
    try {
      setLoading(true);
      const from = explicitFrom !== undefined ? explicitFrom : fromDate;
      const to   = explicitTo   !== undefined ? explicitTo   : toDate;
      const params = from && to ? `?fromDate=${from}&toDate=${to}` : "";
      const res = await axios.get(
        `${API_URL}/api/artist-bonus/artist/${dishId}${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setArtist(res.data.artist);
        setSummary(res.data.summary);
        setActiveRule(res.data.activeRule);
        setProgress(res.data.progressToNext);
        setSalesHistory(res.data.salesHistory || []);
        setBonusHistory(res.data.bonusHistory || []);
        setPayHistory(res.data.paymentHistory || []);
        setIsDayActive(res.data.isDayActive ?? false);
        setActiveDay(res.data.activeDay ?? null);
      }
    } catch (err: any) {
      showToast({ type: "error", message: "Load Failed", subtitle: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dishId, fromDate, toDate, token]);

  // On mount: fetch active day (no date params)
  useEffect(() => { fetchData("", ""); }, [dishId, token]);

  const openPayModal = () => {
    // Find the first transaction in bonusHistory that has a pending bonus > 0
    const firstPendingTxn = bonusHistory.find(r => (Number(r.BonusEarned) - Number(r.BonusPaid)) > 0);
    if (!firstPendingTxn) {
      showToast({ type: "error", message: "No Pending Bonus", subtitle: "Please calculate bonuses first or resolve payments." });
      return;
    }
    const pendingVal = Number(firstPendingTxn.BonusEarned) - Number(firstPendingTxn.BonusPaid);
    setSelectedTxn({
      ...firstPendingTxn,
      pendingBonus: pendingVal
    });
    setPayAmount(pendingVal.toFixed(2));
    setPayRemarks("");
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!selectedTxn) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      showToast({ type: "error", message: "Validation", subtitle: "Payment amount must be greater than $0." });
      return;
    }
    if (amount > selectedTxn.pendingBonus) {
      showToast({ type: "error", message: "Validation", subtitle: `Amount cannot exceed pending bonus ($${selectedTxn.pendingBonus.toFixed(2)}).` });
      return;
    }

    try {
      setPaying(true);
      const res = await axios.post(
        `${API_URL}/api/artist-bonus/pay`,
        {
          transactionId: selectedTxn.Id,
          paymentAmount: amount,
          remarks: payRemarks || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        showToast({
          type: "success",
          message: "Payment Recorded",
          subtitle: `$${amount.toFixed(2)} paid to ${artist?.name}. Pending: $${res.data.pendingBonus.toFixed(2)}`,
        });
        setShowPayModal(false);
        fetchData(); // Refresh history
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      showToast({ type: "error", message: "Payment Failed", subtitle: msg });
    } finally {
      setPaying(false);
    }
  };

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "bonus",    label: "Bonus History",   icon: "trophy" },
    { key: "payments", label: "Payment History",  icon: "cash" },
    { key: "sales",    label: "Sales History",    icon: "bar-chart" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgMain} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.artistHeaderInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(artist?.name || "?")[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{artist?.name || "Artist"}</Text>
            <Text style={styles.headerSub}>{fromDate} → {toDate}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchData(); }} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={Theme.primary} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing
        ? <ActivityIndicator size="large" color={Theme.primary} style={{ marginTop: 60 }} />
        : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[Theme.primary]} tintColor={Theme.primary} />}
          >
            {/* Summary Cards */}
            <View style={styles.cardsRow}>
              {[
                { label: "Total Sales", value: `$${summary.totalSales.toFixed(2)}`, color: "#3B82F6" },
                { label: "Bonus Earned", value: `$${summary.bonusEarned.toFixed(2)}`, color: Theme.primary },
                { label: "Bonus Paid", value: `$${summary.bonusPaid.toFixed(2)}`, color: "#16A34A" },
                { label: "Pending", value: `$${summary.pendingBonus.toFixed(2)}`, color: "#DC2626" },
              ].map(c => (
                <View key={c.label} style={styles.card}>
                  <Text style={[styles.cardValue, { color: c.color }]}>{c.value}</Text>
                  <Text style={styles.cardLabel}>{c.label}</Text>
                </View>
              ))}
            </View>

            {/* Active Rule Section */}
            {activeRule && (
              <View style={styles.ruleSection}>
                <Text style={styles.sectionTitle}>Current Bonus Rule</Text>
                <View style={styles.rulePill}>
                  <View style={styles.ruleBlock}>
                    <Text style={styles.ruleBlockLabel}>Threshold</Text>
                    <Text style={styles.ruleBlockVal}>${activeRule.ThresholdAmount}</Text>
                  </View>
                  <View style={styles.ruleArrow}>
                    <Ionicons name="arrow-forward" size={20} color={Theme.primary} />
                  </View>
                  <View style={styles.ruleBlock}>
                    <Text style={styles.ruleBlockLabel}>Bonus</Text>
                    <Text style={[styles.ruleBlockVal, { color: "#16A34A" }]}>${activeRule.BonusAmount}</Text>
                  </View>
                  <View style={styles.ruleBlock}>
                    <Text style={styles.ruleBlockLabel}>Type</Text>
                    <Text style={styles.ruleBlockVal}>{activeRule.IsRepeating ? "Repeating" : "One-time"}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Progress to Next Bonus */}
            {progress && (
              <View style={styles.progressSection}>
                <Text style={styles.sectionTitle}>Progress to Next Bonus</Text>
                <View style={styles.progressCard}>
                  <View style={styles.progressStats}>
                    <View style={styles.progressStat}>
                      <Text style={styles.progressStatLabel}>Current Sales</Text>
                      <Text style={[styles.progressStatVal, { color: "#3B82F6" }]}>
                        ${progress.currentSales.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.progressStat}>
                      <Text style={styles.progressStatLabel}>Next Milestone</Text>
                      <Text style={[styles.progressStatVal, { color: Theme.primary }]}>
                        ${progress.nextMilestone.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.progressStat}>
                      <Text style={styles.progressStatLabel}>Remaining</Text>
                      <Text style={[styles.progressStatVal, { color: "#DC2626" }]}>
                        ${progress.remaining.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(100, progress.progressPct)}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressBarLabel}>
                    {progress.progressPct.toFixed(1)}% toward next ${progress.nextBonus.toFixed(2)} bonus
                  </Text>
                </View>
              </View>
            )}

            {/* Pay Bonus Button */}
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              {summary.pendingBonus > 0 ? (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={openPayModal}
                >
                  <Ionicons name="cash-outline" size={18} color="#fff" />
                  <Text style={styles.payBtnText}>Pay Bonus (${summary.pendingBonus.toFixed(2)})</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.payBtn, { backgroundColor: Theme.bgMuted, borderColor: Theme.border, borderWidth: 1, flexDirection: "row", justifyContent: "center", gap: 8 }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={Theme.textMuted} />
                  <Text style={[styles.payBtnText, { color: Theme.textMuted }]}>All Settled (No Pending Bonus)</Text>
                </View>
              )}
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={15}
                    color={activeTab === tab.key ? Theme.primary : Theme.textMuted}
                  />
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>

              {/* BONUS HISTORY TAB */}
              {activeTab === "bonus" && (
                bonusHistory.length === 0
                  ? <EmptySection label="No bonus records for this period" icon="trophy-outline" />
                  : bonusHistory.map((row, idx) => {
                    const sc = STATUS_COLORS[row.status] || STATUS_COLORS.Pending;
                    return (
                      <View key={row.Id} style={[styles.histRow, idx % 2 === 1 && styles.histRowAlt]}>
                        <View style={styles.histRowTop}>
                          <Text style={styles.histPeriod}>
                            {fmtDate(row.SalesFromDate)} → {fmtDate(row.SalesToDate)}
                          </Text>
                          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                            <Text style={[styles.badgeText, { color: sc.text }]}>{row.status}</Text>
                          </View>
                        </View>
                        <View style={styles.histRowMeta}>
                          <MetaItem label="Sales" value={`$${Number(row.TotalSales).toFixed(2)}`} color="#3B82F6" flex={1} />
                          <MetaItem label="Earned" value={`$${Number(row.BonusEarned).toFixed(2)}`} color={Theme.primary} flex={1} />
                          <MetaItem label="Paid" value={`$${Number(row.BonusPaid).toFixed(2)}`} color="#16A34A" flex={1} />
                          <MetaItem label="Pending" value={`$${Number(row.pendingBonus).toFixed(2)}`} color="#DC2626" flex={1} />
                        </View>
                      </View>
                    );
                  })
              )}

              {/* PAYMENT HISTORY TAB */}
              {activeTab === "payments" && (
                payHistory.length === 0
                  ? <EmptySection label="No payments recorded yet" icon="cash-outline" />
                  : payHistory.map((row, idx) => (
                    <View key={row.Id} style={[styles.histRow, idx % 2 === 1 && styles.histRowAlt]}>
                      <View style={styles.histRowTop}>
                        <Text style={styles.histPeriod}>{fmtDate(row.PaidDate)}</Text>
                        <Text style={[styles.payAmt, { color: "#16A34A" }]}>
                          +${Number(row.PaymentAmount).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.histRowMeta}>
                        <MetaItem label="Paid By" value={row.PaidBy || "—"} flex={1} />
                        <MetaItem label="Remarks" value={row.Remarks || "—"} flex={2.5} />
                      </View>
                    </View>
                  ))
              )}

              {/* SALES HISTORY TAB */}
              {activeTab === "sales" && (
                salesHistory.length === 0
                  ? <EmptySection label="No sales records for this period" icon="bar-chart-outline" />
                  : salesHistory.map((row, idx) => (
                    <View key={idx} style={[styles.histRow, idx % 2 === 1 && styles.histRowAlt]}>
                      <View style={styles.histRowTop}>
                        <Text style={styles.histPeriod}>{fmtDate(row.SaleDate)}</Text>
                        <Text style={styles.payAmt}>${Number(row.Amount).toFixed(2)}</Text>
                      </View>
                      <View style={styles.histRowMeta}>
                        <MetaItem label="Bill" value={row.BillNo || "—"} flex={1} />
                        <MetaItem label="Item" value={row.ItemName || "—"} flex={2} />
                        <MetaItem label="Qty" value={String(row.Qty || 1)} flex={0.6} />
                      </View>
                    </View>
                  ))
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )
      }

      {/* Pay Bonus Modal */}
      <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => setShowPayModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Payment</Text>
                <Text style={styles.modalSubtitle}>{artist?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPayModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={Theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Bonus Summary */}
            {selectedTxn && (
              <View style={styles.modalSummary}>
                <SummaryRow label="Bonus Earned" value={`$${Number(selectedTxn.BonusEarned).toFixed(2)}`} color={Theme.primary} />
                <SummaryRow label="Already Paid" value={`$${Number(selectedTxn.BonusPaid).toFixed(2)}`} color="#16A34A" />
                <View style={styles.summaryDivider} />
                <SummaryRow label="Pending Bonus" value={`$${Number(selectedTxn.pendingBonus).toFixed(2)}`} color="#DC2626" bold />
              </View>
            )}

            {/* Payment Amount */}
            <Text style={styles.fieldLabel}>Payment Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount to pay"
              placeholderTextColor={Theme.textMuted}
            />
            {selectedTxn && (
              <View style={styles.quickAmtRow}>
                {[25, 50, 75, 100].map(pct => {
                  const amt = (Number(selectedTxn.pendingBonus) * pct / 100);
                  return (
                    <TouchableOpacity
                      key={pct}
                      style={styles.quickAmtBtn}
                      onPress={() => setPayAmount(amt.toFixed(2))}
                    >
                      <Text style={styles.quickAmtText}>{pct}% (${amt.toFixed(2)})</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Remarks */}
            <Text style={styles.fieldLabel}>Remarks (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              value={payRemarks}
              onChangeText={setPayRemarks}
              placeholder="e.g. Cash payment, weekly settlement..."
              placeholderTextColor={Theme.textMuted}
              multiline
            />

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, paying && { opacity: 0.6 }]} onPress={handlePay} disabled={paying}>
                {paying
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.confirmBtnText}>Confirm Payment</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowLabel}>{label}</Text>
      <Text style={[styles.summaryRowValue, color ? { color } : {}, bold ? { fontSize: 18 } : {}]}>{value}</Text>
    </View>
  );
}

function MetaItem({ label, value, color, flex }: { label: string; value: string; color?: string; flex?: number }) {
  return (
    <View style={[styles.metaItem, flex !== undefined ? { flex } : {}]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, color ? { color } : {}]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function EmptySection({ label, icon }: { label: string; icon: string }) {
  return (
    <View style={styles.emptySection}>
      <Ionicons name={icon as any} size={36} color={Theme.textMuted} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
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
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center",
  },
  artistHeaderInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontFamily: Fonts.black, fontSize: 15, color: Theme.primary },
  headerTitle: { fontFamily: Fonts.black, fontSize: 16, color: Theme.textPrimary },
  headerSub: { fontFamily: Fonts.medium, fontSize: 11, color: Theme.textSecondary, marginTop: 1 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },

  cardsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    paddingHorizontal: 16, paddingTop: 16,
  },
  card: {
    flex: 1, minWidth: "22%", backgroundColor: Theme.bgCard, borderRadius: 14,
    padding: 12, alignItems: "center",
    borderWidth: 1, borderColor: Theme.border,
    ...Platform.select({ web: { boxShadow: "0 2px 6px rgba(0,0,0,0.05)" } }) as any,
  },
  cardValue: { fontFamily: Fonts.black, fontSize: 16 },
  cardLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginTop: 4, textAlign: "center" },

  sectionTitle: {
    fontFamily: Fonts.black, fontSize: 13, color: Theme.textPrimary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },
  ruleSection: { paddingHorizontal: 16, paddingTop: 20 },
  rulePill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Theme.primaryLight, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Theme.primaryBorder, gap: 8,
  },
  ruleBlock: { flex: 1, alignItems: "center" },
  ruleBlockLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginBottom: 4, textTransform: "uppercase" },
  ruleBlockVal: { fontFamily: Fonts.black, fontSize: 18, color: Theme.textPrimary },
  ruleArrow: { paddingHorizontal: 4 },

  progressSection: { paddingHorizontal: 16, paddingTop: 20 },
  progressCard: {
    backgroundColor: Theme.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Theme.border,
  },
  progressStats: { flexDirection: "row", marginBottom: 16 },
  progressStat: { flex: 1, alignItems: "center" },
  progressStatLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginBottom: 4 },
  progressStatVal: { fontFamily: Fonts.black, fontSize: 16 },
  progressBarTrack: {
    height: 10, backgroundColor: Theme.bgMuted, borderRadius: 5, overflow: "hidden", marginBottom: 8,
  },
  progressBarFill: {
    height: "100%", backgroundColor: Theme.primary, borderRadius: 5,
  },
  progressBarLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Theme.textSecondary, textAlign: "center" },

  tabBar: {
    flexDirection: "row", backgroundColor: Theme.bgCard,
    borderTopWidth: 1, borderTopColor: Theme.border,
    borderBottomWidth: 1, borderBottomColor: Theme.border,
    marginTop: 20,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Theme.primary },
  tabText: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textMuted, textTransform: "uppercase" },
  tabTextActive: { color: Theme.primary },
  tabContent: { paddingHorizontal: 16, paddingTop: 4 },

  histRow: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Theme.border,
  },
  histRowAlt: { backgroundColor: "#FAFAF9" },
  histRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  histPeriod: { fontFamily: Fonts.bold, fontSize: 13, color: Theme.textPrimary },
  payAmt: { fontFamily: Fonts.black, fontSize: 15, color: Theme.textPrimary },
  histRowMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  metaItem: { minWidth: 70 },
  metaLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, textTransform: "uppercase" },
  metaValue: { fontFamily: Fonts.semiBold, fontSize: 13, color: Theme.textPrimary, marginTop: 2 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontFamily: Fonts.bold, fontSize: 10 },

  emptySection: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontFamily: Fonts.medium, fontSize: 14, color: Theme.textSecondary },

  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#16A34A",
  },
  payBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: "#fff" },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    ...Platform.select({
      web: { justifyContent: "center", alignItems: "center" },
      default: { justifyContent: "flex-end" }
    })
  },
  modalBox: {
    backgroundColor: Theme.bgCard,
    padding: 24,
    ...Platform.select({
      web: {
        borderRadius: 24,
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        width: "90%",
        maxWidth: 500,
      },
      default: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }
    })
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontFamily: Fonts.black, fontSize: 20, color: Theme.textPrimary },
  modalSubtitle: { fontFamily: Fonts.medium, fontSize: 13, color: Theme.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center",
  },
  modalSummary: {
    backgroundColor: Theme.bgMuted, borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Theme.border,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  summaryRowLabel: { fontFamily: Fonts.medium, fontSize: 13, color: Theme.textSecondary },
  summaryRowValue: { fontFamily: Fonts.black, fontSize: 15, color: Theme.textPrimary },
  summaryDivider: { height: 1, backgroundColor: Theme.border, marginVertical: 6 },
  fieldLabel: { fontFamily: Fonts.bold, fontSize: 13, color: Theme.textPrimary, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: Theme.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Fonts.medium, fontSize: 15, color: Theme.textPrimary,
    borderWidth: 1, borderColor: Theme.border,
  },
  quickAmtRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  quickAmtBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Theme.bgMuted, borderWidth: 1, borderColor: Theme.border,
  },
  quickAmtText: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textSecondary },
  modalFooter: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Theme.bgMuted, alignItems: "center",
  },
  cancelBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: Theme.textSecondary },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#16A34A", alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 8,
  },
  confirmBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: "#fff" },
});
