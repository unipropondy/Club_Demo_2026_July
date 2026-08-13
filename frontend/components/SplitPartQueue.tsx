/**
 * SplitPartQueue.tsx
 * Full-screen queue manager for "Split by Equal Parts".
 * Shows all N parts as a visual checklist, tracks which are paid,
 * and triggers SplitChitPreview before each payment.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Fonts } from "../constants/Fonts";
import { Theme } from "../constants/theme";
import SplitChitPreview from "./SplitChitPreview";

interface SplitPartQueueItem {
  name: string;
  qty: number;
  price: number;
  discountAmount?: number;
  discountType?: string;
  status?: string;
  lineItemId?: string;
  isServiceCharge?: boolean | number;
}

interface SplitPartQueueProps {
  visible: boolean;
  onClose: () => void;
  onPayPart: (partIndex: number) => void;
  onPrintAllChits?: () => Promise<void>; // prints N checkout bills

  totalParts: number;
  paidParts: number[];  // array of part indexes (1-based) that have been paid
  cart: SplitPartQueueItem[];

  // Billing config
  gstRate: number;
  scRate: number;
  scReduced: boolean;
  discountInfo: any | null;
  currencySymbol: string;
  grandTotal: number;   // full bill grand total

  orderId?: string;
  tableNo?: string;
  orderType?: string;
}

export default function SplitPartQueue({
  visible,
  onClose,
  onPayPart,
  onPrintAllChits,
  totalParts,
  paidParts,
  cart,
  gstRate,
  scRate,
  scReduced,
  discountInfo,
  currencySymbol,
  grandTotal,
  orderId,
  tableNo,
  orderType,
}: SplitPartQueueProps) {
  const [chitPartIndex, setChitPartIndex] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const activeCart = useMemo(
    () => cart.filter((i) => i.status !== "VOIDED"),
    [cart]
  );

  const perPartAmount = grandTotal / totalParts;

  const paidCount = paidParts.length;
  const paidAmount = paidCount * perPartAmount;
  const remainingAmount = grandTotal - paidAmount;
  const progressPercent = Math.round((paidCount / totalParts) * 100);

  // Build proportional chit items for any given part (qty / totalParts)
  const chitItems = useMemo(() => {
    return activeCart.map((item) => ({
      ...item,
      qty: item.qty / totalParts,
    }));
  }, [activeCart, totalParts]);

  const fmt = (n: number) => `${currencySymbol}${Math.max(0, n).toFixed(2)}`;

  // Current active part = smallest index not in paidParts
  const currentActivePart = useMemo(() => {
    for (let i = 1; i <= totalParts; i++) {
      if (!paidParts.includes(i)) return i;
    }
    return null; // all paid
  }, [paidParts, totalParts]);

  const allPaid = currentActivePart === null;

  const getPartStatus = (part: number) => {
    if (paidParts.includes(part)) return "paid";
    if (part === currentActivePart) return "active";
    return "pending";
  };

  const handlePrintAll = async () => {
    if (!onPrintAllChits || isPrinting) return;
    setIsPrinting(true);
    try {
      await onPrintAllChits();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.sheet}>
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Split by {totalParts}</Text>
                <Text style={styles.subtitle}>
                  {orderId ? `Order #${orderId}` : ""}
                  {tableNo
                    ? `  ·  ${orderType === "DINE_IN" ? `Table ${tableNo}` : "Takeaway"}`
                    : ""}
                </Text>
              </View>

              <View style={styles.headerRight}>
                {/* Print All Bills button */}
                {onPrintAllChits && (
                  <TouchableOpacity
                    style={[styles.printAllBtn, isPrinting && { opacity: 0.6 }]}
                    onPress={handlePrintAll}
                    disabled={isPrinting}
                    activeOpacity={0.8}
                  >
                    {isPrinting ? (
                      <ActivityIndicator size="small" color={Theme.primary} />
                    ) : (
                      <Ionicons name="print-outline" size={17} color={Theme.primary} />
                    )}
                    <Text style={styles.printAllText}>
                      {isPrinting ? "Printing..." : `Print ${totalParts} Bills`}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Progress Summary ── */}
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%` as any },
                    ]}
                  />
                </View>
                <Text style={styles.progressPct}>{progressPercent}%</Text>
              </View>
              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Collected</Text>
                  <Text style={[styles.amountVal, { color: Theme.success }]}>
                    {fmt(paidAmount)}
                  </Text>
                </View>
                <View style={styles.dividerV} />
                <View>
                  <Text style={styles.amountLabel}>Remaining</Text>
                  <Text style={[styles.amountVal, { color: allPaid ? Theme.success : Theme.primary }]}>
                    {fmt(remainingAmount)}
                  </Text>
                </View>
                <View style={styles.dividerV} />
                <View>
                  <Text style={styles.amountLabel}>Total Bill</Text>
                  <Text style={styles.amountVal}>{fmt(grandTotal)}</Text>
                </View>
              </View>
            </View>

            {/* ── Parts List ── */}
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: totalParts }).map((_, i) => {
                const part = i + 1;
                const status = getPartStatus(part);
                return (
                  <View key={part} style={[styles.partRow, status === "active" && styles.partRowActive]}>
                    {/* Left: Part indicator */}
                    <View style={[styles.partBubble, (styles as any)[`bubble_${status}`]]}>
                      {status === "paid" ? (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      ) : status === "active" ? (
                        <Text style={styles.bubbleNumActive}>{part}</Text>
                      ) : (
                        <Text style={styles.bubbleNumPending}>{part}</Text>
                      )}
                    </View>

                    {/* Middle: Label */}
                    <View style={styles.partInfo}>
                      <Text style={[
                        styles.partLabel,
                        status === "paid" && { color: Theme.success },
                        status === "active" && { color: Theme.primary },
                      ]}>
                        Part {part} of {totalParts}
                      </Text>
                      <Text style={styles.partAmount}>{fmt(perPartAmount)}</Text>
                    </View>

                    {/* Right: Status / Action */}
                    {status === "paid" ? (
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>PAID ✓</Text>
                      </View>
                    ) : status === "active" ? (
                      <TouchableOpacity
                        style={styles.payNowBtn}
                        activeOpacity={0.85}
                        onPress={() => setChitPartIndex(part)}
                      >
                        <Ionicons name="eye-outline" size={14} color="#fff" />
                        <Text style={styles.payNowText}>View & Pay</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.waitingBadge}>
                        <Text style={styles.waitingText}>Waiting</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* ── Footer note ── */}
            {allPaid ? (
              <View style={styles.allDoneRow}>
                <Ionicons name="checkmark-circle" size={22} color={Theme.success} />
                <Text style={styles.allDoneText}>
                  All {totalParts} parts collected! Order is fully paid.
                </Text>
              </View>
            ) : (
              <Text style={styles.footerNote}>
                Tap "View & Pay" to preview the bill for the current part before payment.
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Split Chit Preview for current part ── */}
      {chitPartIndex !== null && (
        <SplitChitPreview
          visible={chitPartIndex !== null}
          onClose={() => setChitPartIndex(null)}
          onProceedToPay={() => {
            const idx = chitPartIndex;
            setChitPartIndex(null);
            // Small delay so the chit modal closes before navigating
            setTimeout(() => onPayPart(idx), 200);
          }}
          items={chitItems}
          partLabel={`Part ${chitPartIndex} of ${totalParts}`}
          totalParts={totalParts}
          currentPart={chitPartIndex}
          gstRate={gstRate}
          scRate={scRate}
          scReduced={scReduced}
          discountInfo={discountInfo}
          currencySymbol={currencySymbol}
          orderId={orderId}
          tableNo={tableNo}
          orderType={orderType}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: Theme.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    paddingBottom: 24,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  headerLeft: { flex: 1 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Theme.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Theme.textSecondary,
    marginTop: 3,
  },

  // Print all button
  printAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Theme.primary,
    backgroundColor: Theme.primaryLight || "#eff6ff",
  },
  printAllText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Theme.primary,
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.bgInput || Theme.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Progress card
  progressCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: Theme.bgMain,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.border,
    padding: 14,
    gap: 12,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.border,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: Theme.success,
  },
  progressPct: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Theme.success,
    minWidth: 38,
    textAlign: "right",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  amountLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Theme.textSecondary,
    textAlign: "center",
    marginBottom: 3,
  },
  amountVal: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Theme.textPrimary,
    textAlign: "center",
  },
  dividerV: {
    width: 1,
    height: 32,
    backgroundColor: Theme.border,
  },

  // Parts list
  listScroll: {
    maxHeight: 340,
    paddingHorizontal: 16,
  },
  partRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Theme.bgMain,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  partRowActive: {
    borderColor: Theme.primary,
    backgroundColor: Theme.primaryLight || "#eff6ff",
  },

  // Part bubble
  partBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble_paid: { backgroundColor: Theme.success },
  bubble_active: { backgroundColor: Theme.primary },
  bubble_pending: { backgroundColor: Theme.border },
  bubbleNumActive: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#fff",
  },
  bubbleNumPending: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Theme.textSecondary,
  },

  // Part info
  partInfo: { flex: 1 },
  partLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: Theme.textPrimary,
  },
  partAmount: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Theme.textSecondary,
    marginTop: 2,
  },

  // Badges
  paidBadge: {
    backgroundColor: Theme.success + "20",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Theme.success + "40",
  },
  paidBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: Theme.success,
  },
  waitingBadge: {
    backgroundColor: Theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  waitingText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Theme.textSecondary,
  },
  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Theme.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  payNowText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#fff",
  },

  // Footer
  footerNote: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Theme.textSecondary,
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 8,
    lineHeight: 18,
  },
  allDoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  allDoneText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Theme.success,
    flex: 1,
  },
});
