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
const fmtDate = (raw: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};
const fmtPeriod = (from: string, to: string) => `${fmtDate(from)} → ${fmtDate(to)}`;

interface Transaction {
  Id: string;
  ArtistDishId: string;
  ArtistName: string;
  SalesFromDate: string;
  SalesToDate: string;
  TotalSales: number;
  BonusEarned: number;
  BonusPaid: number;
  pendingBonus: number;
  status: string;
  CreatedDate: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Paid:             { bg: "#DCFCE7", text: "#16A34A" },
  "Partially Paid": { bg: "#FEF9C3", text: "#CA8A04" },
  Pending:          { bg: "#FEE2E2", text: "#DC2626" },
};

export default function ArtistBonusPaymentsScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [loading, setLoading]       = useState(false);
  const [transactions, setTxns]     = useState<Transaction[]>([]);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [payments, setPayments]     = useState<Record<string, any[]>>({});

  // Pay modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedTxn, setSelectedTxn]   = useState<Transaction | null>(null);
  const [payAmount, setPayAmount]       = useState("");
  const [payRemarks, setPayRemarks]     = useState("");
  const [paying, setPaying]             = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/artist-bonus/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setTxns(res.data.data);
    } catch (err: any) {
      showToast({ type: "error", message: "Load Failed", subtitle: err.message });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const loadPayments = async (txnId: string) => {
    try {
      const res = await axios.get(`${API_URL}/api/artist-bonus/payments?transactionId=${txnId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setPayments(prev => ({ ...prev, [txnId]: res.data.data }));
      }
    } catch (_) {}
  };

  const toggleExpand = (txnId: string) => {
    if (expanded === txnId) {
      setExpanded(null);
    } else {
      setExpanded(txnId);
      if (!payments[txnId]) loadPayments(txnId);
    }
  };

  const openPayModal = (txn: Transaction) => {
    setSelectedTxn(txn);
    setPayAmount(txn.pendingBonus.toFixed(2)); // Default to full pending
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
          subtitle: `$${amount.toFixed(2)} paid to ${selectedTxn.ArtistName}. Pending: $${res.data.pendingBonus.toFixed(2)}`,
        });
        setShowPayModal(false);
        // Clear cached payments for this txn so it refreshes
        setPayments(prev => { const copy = { ...prev }; delete copy[selectedTxn.Id]; return copy; });
        fetchPending();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      showToast({ type: "error", message: "Payment Failed", subtitle: msg });
    } finally {
      setPaying(false);
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
          <Text style={styles.headerTitle}>Bonus Payments</Text>
          <Text style={styles.headerSub}>{transactions.length} pending / partial bonuses</Text>
        </View>
        <TouchableOpacity onPress={fetchPending} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={Theme.primary} />
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator size="large" color={Theme.primary} style={{ marginTop: 60 }} />
        : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {transactions.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySubtitle}>No pending or partially paid bonuses.</Text>
              </View>
            )}

            {transactions.map((txn, idx) => {
              const sc = STATUS_COLORS[txn.status] || STATUS_COLORS.Pending;
              const isOpen = expanded === txn.Id;
              const txnPayments = payments[txn.Id] || [];

              return (
                <View key={txn.Id} style={styles.txnCard}>
                  {/* Top Row */}
                  <View style={styles.txnHeader}>
                    <View style={styles.artistInfo}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{(txn.ArtistName || "?")[0].toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={styles.artistName}>{txn.ArtistName}</Text>
                        <Text style={styles.periodText}>{fmtPeriod(txn.SalesFromDate, txn.SalesToDate)}</Text>
                      </View>
                    </View>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.text }]}>{txn.status}</Text>
                    </View>
                  </View>

                  {/* Amounts Row */}
                  <View style={styles.amountsRow}>
                    <AmountCell label="Sales" value={`$${Number(txn.TotalSales).toFixed(2)}`} color="#3B82F6" />
                    <AmountCell label="Earned" value={`$${Number(txn.BonusEarned).toFixed(2)}`} color={Theme.primary} />
                    <AmountCell label="Paid" value={`$${Number(txn.BonusPaid).toFixed(2)}`} color="#16A34A" />
                    <AmountCell label="Pending" value={`$${Number(txn.pendingBonus).toFixed(2)}`} color="#DC2626" />
                  </View>

                  {/* Actions */}
                  <View style={styles.txnActions}>
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => toggleExpand(txn.Id)}
                    >
                      <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={15} color={Theme.textSecondary} />
                      <Text style={styles.expandBtnText}>
                        {isOpen ? "Hide" : "View"} Payment History
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => openPayModal(txn)}
                    >
                      <Ionicons name="cash" size={16} color="#fff" />
                      <Text style={styles.payBtnText}>Pay Bonus</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Expanded Payment History */}
                  {isOpen && (
                    <View style={styles.payHistSection}>
                      <Text style={styles.payHistTitle}>Payment Records</Text>
                      {txnPayments.length === 0
                        ? <Text style={styles.payHistEmpty}>No payments recorded yet for this bonus.</Text>
                        : txnPayments.map((pay, pi) => (
                          <View key={pay.Id} style={[styles.payRow, pi % 2 === 1 && { backgroundColor: "#FAFAF9" }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.payRowDate}>{fmtDate(pay.PaidDate)}</Text>
                              <Text style={styles.payRowBy}>by {pay.PaidBy}</Text>
                              {pay.Remarks ? <Text style={styles.payRowRemarks}>{pay.Remarks}</Text> : null}
                            </View>
                            <Text style={styles.payRowAmt}>+${Number(pay.PaymentAmount).toFixed(2)}</Text>
                          </View>
                        ))
                      }
                    </View>
                  )}
                </View>
              );
            })}
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
                <Text style={styles.modalSubtitle}>{selectedTxn?.ArtistName}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPayModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={Theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Bonus Summary (read-only) */}
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

function AmountCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={[{ fontFamily: Fonts.black, fontSize: 14, color: color || Theme.textPrimary }]}>{value}</Text>
      <Text style={{ fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginTop: 2, textTransform: "uppercase" }}>{label}</Text>
    </View>
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
  headerTitle: { fontFamily: Fonts.black, fontSize: 17, color: Theme.textPrimary },
  headerSub: { fontFamily: Fonts.medium, fontSize: 12, color: Theme.textSecondary, marginTop: 1 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  txnCard: {
    backgroundColor: Theme.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Theme.border,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  txnHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  artistInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.primaryLight, justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontFamily: Fonts.black, fontSize: 14, color: Theme.primary },
  artistName: { fontFamily: Fonts.bold, fontSize: 14, color: Theme.textPrimary },
  periodText: { fontFamily: Fonts.medium, fontSize: 11, color: Theme.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontFamily: Fonts.bold, fontSize: 11 },

  amountsRow: {
    flexDirection: "row", backgroundColor: Theme.bgMuted, borderRadius: 12,
    padding: 12, marginBottom: 14,
  },
  txnActions: { flexDirection: "row", gap: 10 },
  expandBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
    backgroundColor: Theme.bgMuted, borderWidth: 1, borderColor: Theme.border,
  },
  expandBtnText: { fontFamily: Fonts.bold, fontSize: 12, color: Theme.textSecondary },
  payBtn: {
    flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#16A34A",
  },
  payBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#fff" },

  payHistSection: {
    marginTop: 14, borderTopWidth: 1, borderTopColor: Theme.border, paddingTop: 12,
  },
  payHistTitle: { fontFamily: Fonts.bold, fontSize: 12, color: Theme.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  payHistEmpty: { fontFamily: Fonts.regular, fontSize: 13, color: Theme.textMuted, fontStyle: "italic" },
  payRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 8,
    paddingHorizontal: 10, borderRadius: 8,
  },
  payRowDate: { fontFamily: Fonts.bold, fontSize: 13, color: Theme.textPrimary },
  payRowBy: { fontFamily: Fonts.medium, fontSize: 11, color: Theme.textSecondary, marginTop: 1 },
  payRowRemarks: { fontFamily: Fonts.regular, fontSize: 11, color: Theme.textMuted, marginTop: 2, fontStyle: "italic" },
  payRowAmt: { fontFamily: Fonts.black, fontSize: 16, color: "#16A34A" },

  emptyState: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: Fonts.black, fontSize: 20, color: Theme.textPrimary },
  emptySubtitle: { fontFamily: Fonts.medium, fontSize: 14, color: Theme.textSecondary, textAlign: "center" },

  // Modal
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
