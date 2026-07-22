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
import { formatToSingaporeDateTime } from "@/utils/timezoneHelper";
import { artistDateState } from "@/stores/artistDateStore";

const pad = (n: number) => n.toString().padStart(2, "0");
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

type TabKey = "bonus" | "payments" | "sales";

export default function ArtistDetailScreen() {
  const { dishId } = useLocalSearchParams<{ dishId: string }>();
  const router     = useRouter();
  const { token }  = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<TabKey>("bonus");
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [artist, setArtist]           = useState<{ dishId: string; name: string } | null>(null);
  const [summary, setSummary]         = useState({
    totalSales: 0,
    bonusEarned: 0,
    bonusPaid: 0,
    pendingBonus: 0,
    periodSales: 0,
    periodEarned: 0,
    periodPaid: 0,
    periodPending: 0,
    lifetimeEarned: 0,
    lifetimePaid: 0,
    lifetimePending: 0,
  });
  const [activeRule, setActiveRule]   = useState<any>(null);
  const [progress, setProgress]       = useState<any>(null);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [bonusHistory, setBonusHistory] = useState<any[]>([]);
  const [payHistory, setPayHistory]   = useState<any[]>([]);

  // Pay modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [pendingTxns, setPendingTxns]   = useState<any[]>([]);
  const [payAmount, setPayAmount]       = useState("");
  const [payRemarks, setPayRemarks]     = useState("");
  const [paying, setPaying]             = useState(false);

  // Fetch data using date range from state to retrieve period metrics
  const fetchData = useCallback(async () => {
    if (!dishId) return;
    try {
      setLoading(true);
      const params = artistDateState.fromDate && artistDateState.toDate
        ? `?fromDate=${artistDateState.fromDate}&toDate=${artistDateState.toDate}`
        : "";
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
      }
    } catch (err: any) {
      showToast({ type: "error", message: "Load Failed", subtitle: err.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dishId, token]);

  useEffect(() => { fetchData(); }, [dishId, token]);

  const totalOutstanding = summary.lifetimePending ?? summary.pendingBonus;

  const openPayModal = () => {
    // Get all transactions with pending balance
    const allPendingTxns = bonusHistory.filter(r => (Number(r.BonusEarned) - Number(r.BonusPaid)) > 0);
    if (allPendingTxns.length === 0) {
      showToast({ type: "error", message: "No Pending Bonus", subtitle: "No outstanding bonus to settle." });
      return;
    }
    setPendingTxns(allPendingTxns);
    setPayAmount(totalOutstanding.toFixed(2));
    setPayRemarks("");
    setShowPayModal(true);
  };

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      showToast({ type: "error", message: "Validation", subtitle: "Payment amount must be greater than $0." });
      return;
    }
    if (amount > totalOutstanding + 0.01) {
      showToast({ type: "error", message: "Validation", subtitle: `Amount cannot exceed outstanding ($${totalOutstanding.toFixed(2)}).` });
      return;
    }

    // Pay off transactions one by one from oldest first
    const txnsToSettle = [...pendingTxns].reverse(); // oldest first
    let remaining = amount;

    try {
      setPaying(true);
      for (const txn of txnsToSettle) {
        if (remaining <= 0) break;
        const txnPending = Number(txn.BonusEarned) - Number(txn.BonusPaid);
        const payForThisTxn = Math.min(remaining, txnPending);
        await axios.post(
          `${API_URL}/api/artist-bonus/pay`,
          {
            transactionId: txn.Id,
            paymentAmount: parseFloat(payForThisTxn.toFixed(2)),
            remarks: payRemarks || null,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        remaining -= payForThisTxn;
      }

      showToast({
        type: "success",
        message: "Payment Recorded",
        subtitle: `$${amount.toFixed(2)} paid to ${artist?.name}.`,
      });
      setShowPayModal(false);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      showToast({ type: "error", message: "Payment Failed", subtitle: msg });
    } finally {
      setPaying(false);
    }
  };

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "bonus",    label: "Bonus History",  icon: "trophy" },
    { key: "payments", label: "Payments",        icon: "cash" },
    { key: "sales",    label: "Sales",           icon: "bar-chart" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgMain} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/menu/artist-management" as any);
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.artistHeaderInfo}>
          <View style={[styles.avatarCircle, totalOutstanding > 0 && { backgroundColor: "#FEE2E2" }]}>
            <Text style={[styles.avatarText, totalOutstanding > 0 && { color: "#DC2626" }]}>
              {(artist?.name || "?")[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{artist?.name || "Artist"}</Text>
            <Text style={styles.headerSub}>
              {totalOutstanding > 0
                ? `$${totalOutstanding.toFixed(2)} outstanding`
                : "All bonuses settled ✓"}
            </Text>
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
            {/* ── BONUS SUMMARY ── */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
              <Text style={styles.sectionTitle}>Bonus Summary</Text>
            </View>
            <View style={styles.cardsRow}>
              {[
                { label: "Lifetime Earned",  value: `$${(summary.lifetimeEarned ?? summary.bonusEarned ?? 0).toFixed(2)}`, color: Theme.primary, bg: "#FFF7ED" },
                { label: "Total Paid",       value: `$${(summary.lifetimePaid ?? summary.bonusPaid ?? 0).toFixed(2)}`,   color: "#16A34A",     bg: "#F0FDF4" },
                { label: "Outstanding",      value: `$${totalOutstanding.toFixed(2)}`,                               color: totalOutstanding > 0 ? "#DC2626" : "#16A34A", bg: totalOutstanding > 0 ? "#FEF2F2" : "#F0FDF4" },
              ].map(c => (
                <View key={c.label} style={[styles.card, { backgroundColor: c.bg }]}>
                  <Text style={[styles.cardValue, { color: c.color }]} numberOfLines={1}>{c.value}</Text>
                  <Text style={styles.cardLabel}>{c.label}</Text>
                </View>
              ))}
            </View>

            {/* ── ACTIVE BONUS RULE ── */}
            {activeRule && (
              <View style={styles.ruleSection}>
                <Text style={styles.sectionTitle}>Bonus Rule</Text>
                <View style={styles.rulePill}>
                  <View style={styles.ruleBlock}>
                    <Text style={styles.ruleBlockLabel}>Every</Text>
                    <Text style={styles.ruleBlockVal}>${activeRule.ThresholdAmount}</Text>
                    <Text style={[styles.ruleBlockLabel, { marginTop: 2 }]}>in sales</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={22} color={Theme.primary} />
                  <View style={styles.ruleBlock}>
                    <Text style={styles.ruleBlockLabel}>Earns</Text>
                    <Text style={[styles.ruleBlockVal, { color: "#16A34A" }]}>${activeRule.BonusAmount}</Text>
                    <Text style={[styles.ruleBlockLabel, { marginTop: 2 }]}>{activeRule.IsRepeating ? "repeating" : "one-time"}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── PROGRESS TO NEXT BONUS ── */}
            {progress && progress.remaining > 0 && (
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
                      <Text style={styles.progressStatLabel}>Next at</Text>
                      <Text style={[styles.progressStatVal, { color: Theme.primary }]}>
                        ${progress.nextMilestone.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.progressStat}>
                      <Text style={styles.progressStatLabel}>Need</Text>
                      <Text style={[styles.progressStatVal, { color: "#DC2626" }]}>
                        ${progress.remaining.toFixed(2)}
                      </Text>
                    </View>
                  </View>
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

            {/* ── PAY BONUS BUTTON ── */}
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              {totalOutstanding > 0 ? (
                <TouchableOpacity style={styles.payBtn} onPress={openPayModal}>
                  <Ionicons name="cash-outline" size={20} color="#fff" />
                  <View>
                    <Text style={styles.payBtnText}>Settle Outstanding Bonus</Text>
                    <Text style={[styles.payBtnText, { fontSize: 12, opacity: 0.85 }]}>
                      ${totalOutstanding.toFixed(2)} across {bonusHistory.filter(r => Number(r.BonusEarned) - Number(r.BonusPaid) > 0).length} period(s)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={styles.settledBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={styles.settledText}>All Bonuses Settled</Text>
                </View>
              )}
            </View>

            {/* ── TABS ── */}
            <View style={styles.tabBar}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={14}
                    color={activeTab === tab.key ? Theme.primary : Theme.textMuted}
                  />
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── TAB CONTENT ── */}
            <View style={styles.tabContent}>

              {/* BONUS HISTORY */}
              {activeTab === "bonus" && (
                bonusHistory.length === 0
                  ? <EmptySection label="No bonus records yet" icon="trophy-outline" />
                  : bonusHistory.map((row, idx) => {
                    const sc = STATUS_COLORS[row.status] || STATUS_COLORS.Pending;
                    const pending = Number(row.BonusEarned) - Number(row.BonusPaid);
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
                          <MetaItem label="Sales"   value={`$${Number(row.TotalSales).toFixed(2)}`}  color="#3B82F6" flex={1} />
                          <MetaItem label="Earned"  value={`$${Number(row.BonusEarned).toFixed(2)}`} color={Theme.primary} flex={1} />
                          <MetaItem label="Paid"    value={`$${Number(row.BonusPaid).toFixed(2)}`}   color="#16A34A" flex={1} />
                          <MetaItem label="Pending" value={`$${pending.toFixed(2)}`}                 color={pending > 0 ? "#DC2626" : "#16A34A"} flex={1} />
                        </View>
                      </View>
                    );
                  })
              )}

              {/* PAYMENT HISTORY */}
              {activeTab === "payments" && (
                payHistory.length === 0
                  ? <EmptySection label="No payments recorded yet" icon="cash-outline" />
                  : payHistory.map((row, idx) => (
                    <View key={row.Id} style={[styles.histRow, idx % 2 === 1 && styles.histRowAlt]}>
                      <View style={styles.histRowTop}>
                        <Text style={styles.histPeriod}>{formatToSingaporeDateTime(row.PaidDate)}</Text>
                        <Text style={[styles.payAmt, { color: "#16A34A" }]}>
                          +${Number(row.PaymentAmount).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.histRowMeta}>
                        <MetaItem label="By"      value={row.PaidBy || "—"} flex={1} />
                        <MetaItem label="Remarks" value={row.Remarks || "—"} flex={2.5} />
                      </View>
                    </View>
                  ))
              )}

              {/* SALES HISTORY */}
              {activeTab === "sales" && (
                salesHistory.length === 0
                  ? <EmptySection label="No sales in the last 30 days" icon="bar-chart-outline" />
                  : salesHistory.map((row, idx) => (
                    <View key={idx} style={[styles.histRow, idx % 2 === 1 && styles.histRowAlt]}>
                      <View style={styles.histRowTop}>
                        <Text style={styles.histPeriod}>{fmtDate(row.SaleDate)}</Text>
                        <Text style={styles.payAmt}>${Number(row.Amount).toFixed(2)}</Text>
                      </View>
                      <View style={styles.histRowMeta}>
                        <MetaItem label="Bill" value={row.BillNo || "—"} flex={1} />
                        <MetaItem label="Item" value={row.ItemName || "—"} flex={2} />
                        <MetaItem label="Qty"  value={String(row.Qty || 1)} flex={0.6} />
                      </View>
                    </View>
                  ))
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )
      }

      {/* ── PAY MODAL ── */}
      <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => setShowPayModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Settle Bonus</Text>
                <Text style={styles.modalSubtitle}>{artist?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPayModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={Theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Outstanding Summary */}
            <View style={styles.modalSummary}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={styles.summaryRowLabel}>Total Earned</Text>
                <Text style={[styles.summaryRowValue, { color: Theme.primary }]}>${(summary.lifetimeEarned ?? 0).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={styles.summaryRowLabel}>Already Paid</Text>
                <Text style={[styles.summaryRowValue, { color: "#16A34A" }]}>${(summary.lifetimePaid ?? 0).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={[styles.summaryRowLabel, { fontFamily: Fonts.bold }]}>Outstanding</Text>
                <Text style={[styles.summaryRowValue, { color: "#DC2626", fontSize: 18 }]}>${totalOutstanding.toFixed(2)}</Text>
              </View>
              {pendingTxns.length > 1 && (
                <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: Theme.textMuted, marginTop: 8 }}>
                  Across {pendingTxns.length} bonus periods — settled oldest first
                </Text>
              )}
            </View>

            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount to Pay ($)</Text>
            <TextInput
              style={styles.input}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
              placeholderTextColor={Theme.textMuted}
            />
            <View style={styles.quickAmtRow}>
              {[25, 50, 75, 100].map(pct => {
                const amt = totalOutstanding * pct / 100;
                return (
                  <TouchableOpacity key={pct} style={styles.quickAmtBtn} onPress={() => setPayAmount(amt.toFixed(2))}>
                    <Text style={styles.quickAmtText}>{pct}%</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Remarks */}
            <Text style={styles.fieldLabel}>Remarks (optional)</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              value={payRemarks}
              onChangeText={setPayRemarks}
              placeholder="e.g. Cash payment, weekly settlement..."
              placeholderTextColor={Theme.textMuted}
              multiline
            />

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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontFamily: Fonts.black, fontSize: 16, color: Theme.primary },
  headerTitle: { fontFamily: Fonts.black, fontSize: 16, color: Theme.textPrimary },
  headerSub: { fontFamily: Fonts.medium, fontSize: 11, color: Theme.textSecondary, marginTop: 1 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },

  cardsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    paddingHorizontal: 16, paddingTop: 8,
  },
  card: {
    flex: 1, minWidth: "28%", borderRadius: 14,
    padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: Theme.border,
    ...Platform.select({ web: { boxShadow: "0 2px 6px rgba(0,0,0,0.05)" } }) as any,
  },
  cardValue: { fontFamily: Fonts.black, fontSize: 17 },
  cardLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginTop: 4, textAlign: "center" },

  sectionTitle: {
    fontFamily: Fonts.black, fontSize: 12, color: Theme.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  ruleSection: { paddingHorizontal: 16, paddingTop: 20 },
  rulePill: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    backgroundColor: Theme.primaryLight, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Theme.primaryBorder,
  },
  ruleBlock: { alignItems: "center" },
  ruleBlockLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, textTransform: "uppercase" },
  ruleBlockVal: { fontFamily: Fonts.black, fontSize: 20, color: Theme.textPrimary, marginTop: 2 },

  progressSection: { paddingHorizontal: 16, paddingTop: 20 },
  progressCard: {
    backgroundColor: Theme.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Theme.border,
  },
  progressStats: { flexDirection: "row", marginBottom: 14 },
  progressStat: { flex: 1, alignItems: "center" },
  progressStatLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginBottom: 4 },
  progressStatVal: { fontFamily: Fonts.black, fontSize: 15 },
  progressBarTrack: {
    height: 14, backgroundColor: Theme.bgMuted, borderRadius: 7, overflow: "hidden", marginBottom: 8,
    width: "70%", alignSelf: "center",
  },
  progressBarFill: { height: "100%", backgroundColor: Theme.primary, borderRadius: 7 },
  progressBarLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Theme.textSecondary, textAlign: "center" },

  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16, paddingHorizontal: 18, borderRadius: 14,
    backgroundColor: "#16A34A", gap: 12,
    ...Platform.select({ web: { boxShadow: "0 4px 12px rgba(22,163,74,0.3)" } }) as any,
  },
  payBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: "#fff", flex: 1 },
  settledBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC",
  },
  settledText: { fontFamily: Fonts.bold, fontSize: 14, color: "#16A34A" },

  tabBar: {
    flexDirection: "row", backgroundColor: Theme.bgCard,
    borderTopWidth: 1, borderTopColor: Theme.border,
    borderBottomWidth: 1, borderBottomColor: Theme.border,
    marginTop: 20,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Theme.primary },
  tabText: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textMuted, textTransform: "uppercase" },
  tabTextActive: { color: Theme.primary },
  tabContent: { paddingHorizontal: 16, paddingTop: 4 },

  histRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Theme.border },
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    ...Platform.select({
      web: { justifyContent: "center", alignItems: "center" },
      default: { justifyContent: "flex-end" }
    })
  },
  modalBox: {
    backgroundColor: Theme.bgCard,
    padding: 24,
    ...Platform.select({
      web: { borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", width: "90%", maxWidth: 500 },
      default: { borderTopLeftRadius: 24, borderTopRightRadius: 24 }
    })
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
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
  summaryRowLabel: { fontFamily: Fonts.medium, fontSize: 13, color: Theme.textSecondary },
  summaryRowValue: { fontFamily: Fonts.black, fontSize: 15, color: Theme.textPrimary },
  summaryDivider: { height: 1, backgroundColor: Theme.border, marginVertical: 8 },
  fieldLabel: { fontFamily: Fonts.bold, fontSize: 13, color: Theme.textPrimary, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: Theme.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Fonts.medium, fontSize: 15, color: Theme.textPrimary,
    borderWidth: 1, borderColor: Theme.border,
  },
  quickAmtRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  quickAmtBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
    backgroundColor: Theme.bgMuted, borderWidth: 1, borderColor: Theme.border,
  },
  quickAmtText: { fontFamily: Fonts.bold, fontSize: 12, color: Theme.textSecondary },
  modalFooter: { flexDirection: "row", gap: 12, marginTop: 20 },
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
