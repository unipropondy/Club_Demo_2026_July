/**
 * SplitChitPreview.tsx
 * Pre-payment bill chit for a split portion.
 * Shown BEFORE going to the payment screen so the customer can verify their share.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Fonts } from "../constants/Fonts";
import { Theme } from "../constants/theme";

interface SplitChitItem {
  name: string;
  qty: number;
  price: number;
  discountAmount?: number;
  discountType?: string;
  status?: string;
  isServiceCharge?: boolean | number;
}

interface SplitChitPreviewProps {
  visible: boolean;
  onClose: () => void;
  onProceedToPay: () => void;
  onPrintChit?: () => void;

  items: SplitChitItem[];
  partLabel: string;          // e.g. "Part 2 of 3" or "Person 2"
  totalParts?: number;
  currentPart?: number;

  // Billing config passed from summary
  gstRate: number;            // 0.09 for 9%
  scRate: number;             // 0.10 for 10%
  scReduced: boolean;
  discountInfo: any | null;   // bill-level discount
  currencySymbol: string;

  orderId?: string;
  tableNo?: string;
  orderType?: string;
}

/** Calculate totals for a specific set of items, proportional to their subtotal vs full bill */
function calcChitTotals({
  items,
  gstRate,
  scRate,
  scReduced,
  discountInfo,
}: {
  items: SplitChitItem[];
  gstRate: number;
  scRate: number;
  scReduced: boolean;
  discountInfo: any | null;
}) {
  let grossTotal = 0;
  let itemDiscount = 0;
  let scEligible = 0;

  items.forEach((item) => {
    if (item.status === "VOIDED") return;
    const baseTotal = (item.price || 0) * item.qty;
    const discAmt = Number(item.discountAmount ?? 0);
    const discType = item.discountType || "percentage";
    let disc = 0;
    if (discAmt > 0) {
      disc = discType === "percentage"
        ? (item.price || 0) * (discAmt / 100) * item.qty
        : Math.min(discAmt, item.price || 0) * item.qty;
    }
    const itemSubtotal = baseTotal - disc;
    grossTotal += baseTotal;
    itemDiscount += disc;
    const isSC = Number(item.isServiceCharge) === 1 || item.isServiceCharge === true;
    if (isSC) scEligible += itemSubtotal;
  });

  const subtotal = grossTotal - itemDiscount;

  // Proportional bill-level discount
  const billDiscount = (() => {
    if (!discountInfo?.applied) return 0;
    if (discountInfo.type === "percentage") return (subtotal * discountInfo.value) / 100;
    // For fixed discount, apply proportionally (chit subtotal / fullBillSubtotal * fixedDiscount)
    // We simplify: we already received the chit's items so just do proportion = subtotal / subtotal = 1 if single person
    return Math.min(discountInfo.value, subtotal);
  })();

  const netAfterDiscount = subtotal - billDiscount;

  // SC on eligible items, pro-rating the bill discount
  const proportion = subtotal > 0 ? scEligible / subtotal : 0;
  const scEligibleNet = Math.max(0, scEligible - proportion * billDiscount);
  const serviceCharge = scReduced ? 0 : scEligibleNet * scRate;

  const taxable = netAfterDiscount + serviceCharge;
  const gst = taxable * gstRate;
  const grandTotal = Math.round((taxable + gst) * 100) / 100;

  return { subtotal, billDiscount, itemDiscount, serviceCharge, gst, grandTotal, netAfterDiscount };
}

export default function SplitChitPreview({
  visible,
  onClose,
  onProceedToPay,
  onPrintChit,
  items,
  partLabel,
  totalParts,
  currentPart,
  gstRate,
  scRate,
  scReduced,
  discountInfo,
  currencySymbol,
  orderId,
  tableNo,
  orderType,
}: SplitChitPreviewProps) {
  const activeItems = useMemo(
    () => items.filter((i) => i.status !== "VOIDED"),
    [items]
  );

  const totals = useMemo(
    () => calcChitTotals({ items: activeItems, gstRate, scRate, scReduced, discountInfo }),
    [activeItems, gstRate, scRate, scReduced, discountInfo]
  );

  const fmt = (n: number) => `${currencySymbol}${Math.max(0, n).toFixed(2)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.chitBadge}>
                <Ionicons name="receipt-outline" size={16} color={Theme.primary} />
                <Text style={styles.chitBadgeText}>Bill Preview</Text>
              </View>
              <Text style={styles.partLabel}>{partLabel}</Text>
              {tableNo ? (
                <Text style={styles.headerSub}>
                  {orderType === "DINE_IN" ? `Table ${tableNo}` : "Takeaway"}
                  {orderId ? `  ·  #${orderId}` : ""}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Progress Bar (for split by parts) ── */}
          {totalParts && currentPart ? (
            <View style={styles.progressWrap}>
              {Array.from({ length: totalParts }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressSeg,
                    i < currentPart ? styles.progressSegDone : styles.progressSegPending,
                  ]}
                />
              ))}
            </View>
          ) : null}

          {/* ── Items List ── */}
          <ScrollView
            style={styles.itemsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {activeItems.length === 0 ? (
              <Text style={styles.emptyText}>No items selected for this portion.</Text>
            ) : (
              activeItems.map((item, idx) => {
                const lineTotal = (item.price || 0) * item.qty;
                const disc = Number(item.discountAmount ?? 0);
                const discType = item.discountType || "percentage";
                const discCalc =
                  disc > 0
                    ? discType === "percentage"
                      ? (item.price || 0) * (disc / 100) * item.qty
                      : Math.min(disc, item.price || 0) * item.qty
                    : 0;
                const net = lineTotal - discCalc;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.itemRow,
                      idx < activeItems.length - 1 && styles.itemRowBorder,
                    ]}
                  >
                    <View style={styles.qtyBubble}>
                      <Text style={styles.qtyText}>
                        {Number.isInteger(item.qty)
                          ? item.qty
                          : item.qty.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}
                      </Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {disc > 0 && (
                        <Text style={styles.itemDiscNote}>
                          -{discType === "percentage" ? `${disc}%` : fmt(disc)} discount
                        </Text>
                      )}
                    </View>
                    <Text style={styles.itemTotal}>{fmt(net)}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* ── Totals Breakdown ── */}
          <View style={styles.totalsCard}>
            {totals.itemDiscount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Item Discounts</Text>
                <Text style={[styles.totalVal, { color: Theme.success }]}>
                  -{fmt(totals.itemDiscount)}
                </Text>
              </View>
            )}
            {totals.billDiscount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {discountInfo?.label || "Discount"}
                </Text>
                <Text style={[styles.totalVal, { color: Theme.success }]}>
                  -{fmt(totals.billDiscount)}
                </Text>
              </View>
            )}
            {totals.serviceCharge > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Service Charge ({Math.round(scRate * 100)}%)
                </Text>
                <Text style={styles.totalVal}>{fmt(totals.serviceCharge)}</Text>
              </View>
            )}
            {totals.gst > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  GST ({Math.round(gstRate * 100)}%)
                </Text>
                <Text style={styles.totalVal}>{fmt(totals.gst)}</Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.grandRow]}>
              <Text style={styles.grandLabel}>AMOUNT DUE</Text>
              <Text style={styles.grandVal}>{fmt(totals.grandTotal)}</Text>
            </View>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            {onPrintChit && (
              <TouchableOpacity
                style={styles.printBtn}
                onPress={onPrintChit}
                activeOpacity={0.8}
              >
                <Ionicons name="print-outline" size={18} color={Theme.primary} />
                <Text style={styles.printBtnText}>Print Chit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.payBtn}
              onPress={onProceedToPay}
              activeOpacity={0.85}
            >
              <Ionicons name="card-outline" size={20} color="#fff" />
              <Text style={styles.payBtnText}>Proceed to Pay  {fmt(totals.grandTotal)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Theme.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 12,
  },
  headerLeft: { flex: 1 },
  chitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Theme.primaryLight || "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  chitBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: Theme.primary,
  },
  partLabel: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Theme.textPrimary,
    marginBottom: 3,
  },
  headerSub: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Theme.textSecondary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.bgInput || Theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  progressWrap: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  progressSeg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    maxWidth: 80,
  },
  progressSegDone: { backgroundColor: Theme.success },
  progressSegPending: { backgroundColor: Theme.border },
  itemsList: {
    maxHeight: 260,
    marginHorizontal: 16,
    backgroundColor: Theme.bgInput || Theme.bgMain,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  qtyBubble: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Theme.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: Theme.primary,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Theme.textPrimary,
  },
  itemDiscNote: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Theme.success,
    marginTop: 2,
  },
  itemTotal: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Theme.textPrimary,
    textAlign: "right",
  },
  emptyText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: "center",
    padding: 24,
  },
  totalsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Theme.bgMain,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 14,
    gap: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Theme.textSecondary,
  },
  totalVal: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Theme.textPrimary,
  },
  grandRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.border,
  },
  grandLabel: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: Theme.textPrimary,
    letterSpacing: 0.5,
  },
  grandVal: {
    fontFamily: Fonts.extraBold,
    fontSize: 20,
    color: Theme.primary,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Theme.primary,
    backgroundColor: "transparent",
  },
  printBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Theme.primary,
  },
  payBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Theme.primary,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  payBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    color: "#fff",
  },
});
