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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface BonusRule {
  Id: string;
  ThresholdAmount: number;
  BonusAmount: number;
  IsRepeating: boolean;
  IsActive: boolean;
  ArtistDishId: string | null;
  ArtistType: string | null;
  ArtistDishName: string | null;
  CreatedDate: string;
}

const EMPTY_FORM = {
  ThresholdAmount: "",
  BonusAmount: "",
  IsRepeating: true,
  IsActive: true,
  ArtistDishId: null as string | null,
  ArtistType: "",
};

export default function ArtistBonusMasterScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [rules, setRules] = useState<BonusRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/artist-bonus/master`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setRules(res.data.data);
    } catch (err: any) {
      showToast({ type: "error", message: "Load Failed", subtitle: err.message });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (rule: BonusRule) => {
    setForm({
      ThresholdAmount: String(rule.ThresholdAmount),
      BonusAmount: String(rule.BonusAmount),
      IsRepeating: rule.IsRepeating,
      IsActive: rule.IsActive,
      ArtistDishId: rule.ArtistDishId,
      ArtistType: rule.ArtistType || "",
    });
    setEditingId(rule.Id);
    setShowModal(true);
  };

  const handleSave = async () => {
    const threshold = parseFloat(form.ThresholdAmount);
    const bonus = parseFloat(form.BonusAmount);
    if (!threshold || threshold <= 0) {
      showToast({ type: "error", message: "Validation Error", subtitle: "Threshold Amount must be greater than 0." });
      return;
    }
    if (!bonus || bonus <= 0) {
      showToast({ type: "error", message: "Validation Error", subtitle: "Bonus Amount must be greater than 0." });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        thresholdAmount: threshold,
        bonusAmount: bonus,
        isRepeating: form.IsRepeating,
        isActive: form.IsActive,
        artistDishId: form.ArtistDishId || null,
        artistType: form.ArtistType || null,
      };

      if (editingId) {
        await axios.put(`${API_URL}/api/artist-bonus/master/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast({ type: "success", message: "Rule Updated", subtitle: "Bonus rule saved successfully." });
      } else {
        await axios.post(`${API_URL}/api/artist-bonus/master`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast({ type: "success", message: "Rule Created", subtitle: "New bonus rule is now active." });
      }

      setShowModal(false);
      fetchRules();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message;
      showToast({ type: "error", message: "Save Failed", subtitle: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (rule: BonusRule) => {
    const title = rule.IsActive ? "Deactivate Rule" : "Activate Rule";
    const msg = rule.IsActive
      ? "This will deactivate the bonus rule. Artists will no longer earn bonuses until a new rule is created."
      : "Activate this rule? It will become the new global bonus rule.";

    const executeChange = async () => {
      try {
        if (rule.IsActive) {
          await axios.delete(`${API_URL}/api/artist-bonus/master/${rule.Id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          await axios.put(
            `${API_URL}/api/artist-bonus/master/${rule.Id}`,
            {
              thresholdAmount: rule.ThresholdAmount,
              bonusAmount: rule.BonusAmount,
              isRepeating: rule.IsRepeating,
              isActive: true,
              artistDishId: rule.ArtistDishId,
              artistType: rule.ArtistType,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        showToast({ type: "success", message: "Done", subtitle: "Rule status updated." });
        fetchRules();
      } catch (err: any) {
        const errorMsg = err?.response?.data?.error || err.message;
        showToast({ type: "error", message: "Failed", subtitle: errorMsg });
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${msg}`)) {
        executeChange();
      }
    } else {
      Alert.alert(title, msg, [
        { text: "Cancel", style: "cancel" },
        {
          text: rule.IsActive ? "Deactivate" : "Activate",
          style: rule.IsActive ? "destructive" : "default",
          onPress: executeChange,
        },
      ]);
    }
  };

  // Live preview of bonus milestones
  const previewRows = () => {
    const threshold = parseFloat(form.ThresholdAmount);
    const bonus = parseFloat(form.BonusAmount);
    if (!threshold || !bonus || threshold <= 0 || bonus <= 0) return [];
    const rows = [];
    for (let tier = 1; tier <= 5; tier++) {
      const sales = threshold * tier;
      const earned = form.IsRepeating ? bonus * tier : bonus;
      rows.push({ sales, earned });
    }
    return rows;
  };

  const globalActive = rules.find(r => r.IsActive && !r.ArtistDishId);

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
          <Text style={styles.headerTitle}>Bonus Master</Text>
          <Text style={styles.headerSub}>Configure artist bonus rules</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>New Rule</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Active Rule Banner */}
        {globalActive && (
          <View style={styles.activeBanner}>
            <View style={styles.activeBannerIcon}>
              <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeBannerTitle}>Active Global Rule</Text>
              <Text style={styles.activeBannerSub}>
                Every ${globalActive.ThresholdAmount} → ${globalActive.BonusAmount} bonus
                {globalActive.IsRepeating ? " (Repeating)" : " (One-time)"}
              </Text>
            </View>
          </View>
        )}

        {!globalActive && !loading && (
          <View style={styles.noRuleWarn}>
            <Ionicons name="warning" size={20} color="#D97706" />
            <Text style={styles.noRuleText}>No active global bonus rule. Create one to start tracking artist bonuses.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" color={Theme.primary} style={{ marginTop: 32 }} />}

        {/* Rules List */}
        {rules.map((rule) => (
          <View key={rule.Id} style={[styles.ruleCard, !rule.IsActive && styles.ruleCardInactive]}>
            {/* Rule Header */}
            <View style={styles.ruleCardHeader}>
              <View style={styles.ruleTypeTag}>
                <Text style={styles.ruleTypeText}>
                  {rule.ArtistDishId ? `Artist: ${rule.ArtistDishName}` : "Global Rule"}
                </Text>
              </View>
              <View style={[styles.ruleStatusBadge, rule.IsActive ? styles.activeTag : styles.inactiveTag]}>
                <Text style={[styles.ruleStatusText, rule.IsActive ? styles.activeTagText : styles.inactiveTagText]}>
                  {rule.IsActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>

            {/* Rule Values */}
            <View style={styles.ruleValues}>
              <View style={styles.ruleValueBox}>
                <Text style={styles.ruleValueLabel}>Threshold</Text>
                <Text style={styles.ruleValueNum}>${rule.ThresholdAmount}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Theme.textMuted} />
              <View style={styles.ruleValueBox}>
                <Text style={styles.ruleValueLabel}>Bonus</Text>
                <Text style={[styles.ruleValueNum, { color: Theme.primary }]}>${rule.BonusAmount}</Text>
              </View>
              <View style={styles.ruleValueBox}>
                <Text style={styles.ruleValueLabel}>Type</Text>
                <Text style={styles.ruleValueNum}>{rule.IsRepeating ? "Repeating" : "One-time"}</Text>
              </View>
            </View>

            {/* Rule description */}
            <Text style={styles.ruleDesc}>
              {rule.IsRepeating
                ? `For every $${rule.ThresholdAmount} in sales, artist earns $${rule.BonusAmount} bonus.`
                : `When sales reach $${rule.ThresholdAmount}, artist earns a one-time $${rule.BonusAmount} bonus.`}
            </Text>

            {/* Actions */}
            <View style={styles.ruleActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(rule)}>
                <Ionicons name="pencil" size={15} color="#3B82F6" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deactivateBtn, !rule.IsActive && styles.activateBtn]}
                onPress={() => handleDeactivate(rule)}
              >
                <Ionicons
                  name={rule.IsActive ? "close-circle" : "checkmark-circle"}
                  size={15}
                  color={rule.IsActive ? "#DC2626" : "#16A34A"}
                />
                <Text style={[styles.deactivateBtnText, !rule.IsActive && styles.activateBtnText]}>
                  {rule.IsActive ? "Deactivate" : "Activate"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {rules.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="settings-outline" size={48} color={Theme.textMuted} />
            <Text style={styles.emptyTitle}>No Rules Yet</Text>
            <Text style={styles.emptySubtitle}>Create your first bonus rule to get started</Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={openCreate}>
              <Text style={styles.createFirstBtnText}>Create Bonus Rule</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isTablet && { maxWidth: 560 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Bonus Rule" : "Create Bonus Rule"}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={Theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Threshold */}
              <Text style={styles.fieldLabel}>Threshold Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={form.ThresholdAmount}
                onChangeText={v => setForm(f => ({ ...f, ThresholdAmount: v }))}
                keyboardType="decimal-pad"
                placeholder="e.g. 500"
                placeholderTextColor={Theme.textMuted}
              />

              {/* Bonus */}
              <Text style={styles.fieldLabel}>Bonus Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={form.BonusAmount}
                onChangeText={v => setForm(f => ({ ...f, BonusAmount: v }))}
                keyboardType="decimal-pad"
                placeholder="e.g. 50"
                placeholderTextColor={Theme.textMuted}
              />

              {/* Repeating Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Repeating Bonus</Text>
                  <Text style={styles.fieldHint}>
                    {form.IsRepeating
                      ? "Bonus repeats every time sales hit the threshold again"
                      : "One-time bonus when sales first reach the threshold"}
                  </Text>
                </View>
                <Switch
                  value={form.IsRepeating}
                  onValueChange={v => setForm(f => ({ ...f, IsRepeating: v }))}
                  trackColor={{ false: Theme.border, true: Theme.primaryBorder }}
                  thumbColor={form.IsRepeating ? Theme.primary : "#f4f3f4"}
                />
              </View>

              {/* Preview table */}
              {previewRows().length > 0 && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>Bonus Preview</Text>
                  <View style={styles.previewHeader}>
                    <Text style={[styles.previewCell, { flex: 1.5 }]}>At Sales</Text>
                    <Text style={[styles.previewCell, { flex: 1, textAlign: "right" }]}>Bonus Earned</Text>
                  </View>
                  {previewRows().map((row, i) => (
                    <View key={i} style={[styles.previewRow, i % 2 === 1 && { backgroundColor: Theme.bgMuted }]}>
                      <Text style={[styles.previewVal, { flex: 1.5 }]}>${row.sales.toFixed(2)}</Text>
                      <Text style={[styles.previewVal, { flex: 1, textAlign: "right", color: "#16A34A", fontFamily: Fonts.bold }]}>
                        ${row.earned.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>{editingId ? "Save Changes" : "Create Rule"}</Text>
                }
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
    borderBottomWidth: 1, borderBottomColor: Theme.border, gap: 12,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontFamily: Fonts.black, fontSize: 17, color: Theme.textPrimary },
  headerSub: { fontFamily: Fonts.medium, fontSize: 12, color: Theme.textSecondary, marginTop: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Theme.primary, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#fff" },
  scroll: { padding: 16, paddingBottom: 40 },

  activeBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0",
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  activeBannerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#DCFCE7", justifyContent: "center", alignItems: "center",
  },
  activeBannerTitle: { fontFamily: Fonts.bold, fontSize: 13, color: "#166534" },
  activeBannerSub: { fontFamily: Fonts.medium, fontSize: 12, color: "#16A34A", marginTop: 2 },

  noRuleWarn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  noRuleText: { fontFamily: Fonts.medium, fontSize: 13, color: "#92400E", flex: 1 },

  ruleCard: {
    backgroundColor: Theme.bgCard, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Theme.border,
    ...Platform.select({ web: { boxShadow: "0 2px 8px rgba(0,0,0,0.06)" } }) as any,
  },
  ruleCardInactive: { opacity: 0.65 },
  ruleCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  ruleTypeTag: {
    backgroundColor: Theme.bgMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  ruleTypeText: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textSecondary },
  ruleStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeTag: { backgroundColor: "#DCFCE7" },
  inactiveTag: { backgroundColor: "#F5F5F5" },
  ruleStatusText: { fontFamily: Fonts.bold, fontSize: 11 },
  activeTagText: { color: "#16A34A" },
  inactiveTagText: { color: "#9CA3AF" },

  ruleValues: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Theme.bgMuted, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  ruleValueBox: { flex: 1, alignItems: "center" },
  ruleValueLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Theme.textSecondary, marginBottom: 4, textTransform: "uppercase" },
  ruleValueNum: { fontFamily: Fonts.black, fontSize: 18, color: Theme.textPrimary },

  ruleDesc: { fontFamily: Fonts.regular, fontSize: 13, color: Theme.textSecondary, marginBottom: 14, lineHeight: 19 },

  ruleActions: { flexDirection: "row", gap: 10 },
  editBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE",
  },
  editBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#3B82F6" },
  deactivateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
  },
  deactivateBtnText: { fontFamily: Fonts.bold, fontSize: 13, color: "#DC2626" },
  activateBtn: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  activateBtnText: { color: "#16A34A" },

  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontFamily: Fonts.black, fontSize: 18, color: Theme.textPrimary, marginTop: 16 },
  emptySubtitle: { fontFamily: Fonts.medium, fontSize: 14, color: Theme.textSecondary, marginTop: 8, textAlign: "center" },
  createFirstBtn: {
    marginTop: 20, backgroundColor: Theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  createFirstBtnText: { fontFamily: Fonts.bold, fontSize: 14, color: "#fff" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: Theme.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: "92%",
    ...Platform.select({ web: { boxShadow: "0 -4px 20px rgba(0,0,0,0.1)" } }) as any,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontFamily: Fonts.black, fontSize: 18, color: Theme.textPrimary, flex: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center",
  },
  fieldLabel: { fontFamily: Fonts.bold, fontSize: 13, color: Theme.textPrimary, marginBottom: 6, marginTop: 16 },
  fieldHint: { fontFamily: Fonts.regular, fontSize: 12, color: Theme.textSecondary, marginTop: 2 },
  input: {
    backgroundColor: Theme.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Fonts.medium, fontSize: 15, color: Theme.textPrimary,
    borderWidth: 1, borderColor: Theme.border,
  },
  toggleRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Theme.bgMuted, borderRadius: 12, padding: 14, marginTop: 16,
  },
  previewBox: {
    marginTop: 20, backgroundColor: Theme.bgMuted, borderRadius: 12,
    overflow: "hidden", borderWidth: 1, borderColor: Theme.border,
  },
  previewTitle: { fontFamily: Fonts.bold, fontSize: 12, color: Theme.textSecondary, padding: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  previewHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Theme.bgCard },
  previewCell: { fontFamily: Fonts.bold, fontSize: 11, color: Theme.textSecondary, textTransform: "uppercase" },
  previewRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8 },
  previewVal: { fontFamily: Fonts.medium, fontSize: 13, color: Theme.textPrimary },
  modalFooter: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Theme.bgMuted, alignItems: "center",
  },
  cancelBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: Theme.textSecondary },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Theme.primary, alignItems: "center",
  },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: "#fff" },
});
