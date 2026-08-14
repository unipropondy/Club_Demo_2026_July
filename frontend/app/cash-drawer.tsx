import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import API from "../api";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../constants/Config";
import { Fonts } from "../constants/Fonts";
import { Theme } from "../constants/theme";
import CashDrawerService, {
  DrawerActionType,
} from "../services/CashDrawerService";
import { useAuthStore } from "../stores/authStore";

interface ReasonConfig {
  label: string;
  actionType: DrawerActionType;
  amountRequired: boolean;
  icon: keyof typeof Ionicons.prototype.toJSON | string;
  color: string;
}

const REASONS: ReasonConfig[] = [
  {
    label: "Cash In",
    actionType: "CASH_IN",
    amountRequired: true,
    icon: "add-circle-outline",
    color: "#16A34A",
  },
  {
    label: "Cash Out",
    actionType: "CASH_OUT",
    amountRequired: true,
    icon: "remove-circle-outline",
    color: "#DC2626",
  },
  {
    label: "Opening Float",
    actionType: "OPENING_FLOAT",
    amountRequired: true,
    icon: "wallet-outline",
    color: "#2563EB",
  },
  {
    label: "Drawer Check",
    actionType: "DRAWER_CHECK",
    amountRequired: false,
    icon: "eye-outline",
    color: "#7C3AED",
  },
  {
    label: "Other",
    actionType: "OTHER",
    amountRequired: false,
    icon: "ellipsis-horizontal",
    color: "#6B7280",
  },
];

export default function CashDrawerScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const { token, user } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [selectedReason, setSelectedReason] = useState("");
  const [actionType, setActionType] = useState<DrawerActionType>("OTHER");

  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [opening, setOpening] = useState(false);
  const [drawerSuccess, setDrawerSuccess] = useState<boolean | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  // Focus input automatically on step change
  const pinInputRef = React.useRef<TextInput>(null);
  const amountInputRef = React.useRef<TextInput>(null);
  const remarkInputRef = React.useRef<TextInput>(null);

  useEffect(() => {
    if (step === 1) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [step]);

  const verifyPin = async () => {
    if (!pin) {
      setPinError("Please enter admin PIN.");
      return;
    }
    setVerifying(true);
    setPinError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pin, role: "ADMIN,MANAGER" }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
      } else {
        setPinError("Invalid Admin PIN. Management permissions required.");
        setPin("");
      }
    } catch (err) {
      setPinError("Authentication service connection failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleReasonSelect = (reason: ReasonConfig) => {
    setSelectedReason(reason.label);
    setActionType(reason.actionType);
    if (reason.amountRequired) {
      setStep(3);
      setTimeout(() => amountInputRef.current?.focus(), 100);
    } else {
      setAmount("0");
      setStep(4);
      setTimeout(() => remarkInputRef.current?.focus(), 100);
    }
  };

  const handleAmountNext = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Validation Error", "Please enter a valid cash amount.");
      return;
    }
    setStep(4);
    setTimeout(() => remarkInputRef.current?.focus(), 100);
  };

  const handleConfirmAndOpen = async () => {
    setOpening(true);
    try {
      const terminalCodeVal =
        (await AsyncStorage.getItem("terminalCode")) || "T1";
      const success = await CashDrawerService.openAndLog({
        outletId: 1,
        terminalCode: terminalCodeVal,
        actionType,
        amount: parseFloat(amount) || 0,
        reason: selectedReason,
        remark: remark || null,
        openedByUserId: user?.userId || "1",
        approvedByUserId: user?.userId || "1",
        openSource: "MANUAL",
        attachmentUrl: attachmentUrl || null,
      });
      setDrawerSuccess(success);
      setStep(5);
    } catch (err: any) {
      console.error(err);
      setDrawerSuccess(false);
      setStep(5);
    } finally {
      setOpening(false);
    }
  };

  const handleSelectImage = async (mode: 'camera' | 'library') => {
    try {
      let permissionResult;
      if (mode === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", `We need access to your ${mode === 'camera' ? 'camera' : 'photo library'} to upload receipts.`);
        return;
      }

      const pickerResult = mode === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.3,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.3,
          });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      const fileUri = pickerResult.assets[0].uri;
      await handleUploadImage(fileUri);
    } catch (err) {
      console.error("❌ SELECT IMAGE ERROR", err);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const handleUploadImage = async (fileUri: string) => {
    try {
      setUploading(true);
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append('image', blob, 'receipt.png');
      } else {
        const filename = fileUri.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('image', {
          uri: fileUri,
          name: filename,
          type,
        } as any);
      }

      const response = await API.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.success) {
        setAttachmentUrl(response.data.imageUrl);
        Alert.alert("Success", "Receipt uploaded successfully!");
      } else {
        Alert.alert("Upload Failed", "Could not upload image to server.");
      }
    } catch (err: any) {
      console.error("❌ UPLOAD IMAGE ERROR", err);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setPin("");
    setSelectedReason("");
    setActionType("OTHER");
    setAmount("");
    setRemark("");
    setAttachmentUrl("");
    setDrawerSuccess(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />

      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/category")}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={Theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💵 Cash Drawer Management</Text>
        <TouchableOpacity
          onPress={() => router.push("/cash-drawer-report")}
          style={styles.reportButton}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={Theme.primary}
          />
          {isTablet && (
            <Text style={styles.reportButtonText}>Activity Audit</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wizard Steps indicator */}
        <View style={styles.stepsContainer}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={styles.stepIndicatorWrapper}>
              <View
                style={[
                  styles.stepDot,
                  step >= s && styles.stepDotActive,
                  step === s && styles.stepDotCurrent,
                ]}
              >
                <Text
                  style={[styles.stepText, step >= s && styles.stepTextActive]}
                >
                  {s}
                </Text>
              </View>
              {s < 5 && (
                <View
                  style={[styles.stepLine, step > s && styles.stepLineActive]}
                />
              )}
            </View>
          ))}
        </View>

        {/* STEP 1: PIN AUTH */}
        {step === 1 && (
          <View style={[styles.card, !isTablet && { width: "100%" }]}>
            <Ionicons
              name="lock-closed"
              size={48}
              color={Theme.primary}
              style={styles.lockIcon}
            />
            <Text style={styles.title}>Supervisor Authorization</Text>
            <Text style={styles.subtitle}>
              Enter Admin PIN to unlock manual cash drawer control.
            </Text>

            <TextInput
              ref={pinInputRef}
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor={Theme.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              value={pin}
              onChangeText={setPin}
              onSubmitEditing={verifyPin}
            />
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, verifying && styles.disabledButton]}
              onPress={verifyPin}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Unlock</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: REASON SELECTION */}
        {step === 2 && (
          <View style={styles.gridCard}>
            <Text style={styles.title}>Select Action Reason</Text>
            <Text style={styles.subtitle}>
              Identify the purpose of opening the cash drawer.
            </Text>

            <View style={styles.grid}>
              {REASONS.map((r, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.gridItem, { borderColor: r.color + "33" }]}
                  onPress={() => handleReasonSelect(r)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.iconBg, { backgroundColor: r.color + "15" }]}
                  >
                    <Ionicons name={r.icon as any} size={28} color={r.color} />
                  </View>
                  <Text style={styles.gridLabel}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 3: AMOUNT VALUE */}
        {step === 3 && (
          <View style={[styles.card, !isTablet && { width: "100%" }]}>
            <Text style={styles.title}>Enter Float Amount</Text>
            <Text style={styles.subtitle}>
              Specify the amount of cash matching: {selectedReason}
            </Text>

            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                ref={amountInputRef}
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
                onSubmitEditing={handleAmountNext}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAmountNext}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.textButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: REMARKS */}
        {step === 4 && (
          <View style={[styles.card, !isTablet && { width: "100%" }]}>
            <Text style={styles.title}>Add Remarks / Notes</Text>
            <Text style={styles.subtitle}>
              Enter any notes regarding this action (Mandatory for "Other").
            </Text>

            <TextInput
              ref={remarkInputRef}
              style={styles.remarksInput}
              placeholder="Enter remarks..."
              placeholderTextColor={Theme.textMuted}
              multiline
              numberOfLines={3}
              value={remark}
              onChangeText={setRemark}
            />

            {/* Attachment Section - Only for CASH_IN and CASH_OUT */}
            {(actionType === 'CASH_IN' || actionType === 'CASH_OUT') && (
              <View style={{ width: "100%", marginBottom: 20 }}>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 13, marginBottom: 8, color: Theme.textSecondary }}>Receipt Attachment</Text>
                
                {uploading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                    <ActivityIndicator size="small" color={Theme.primary} />
                    <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Theme.textMuted }}>Uploading receipt...</Text>
                  </View>
                ) : attachmentUrl ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Theme.bgMuted, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Theme.border, width: "100%" }}>
                    <Ionicons name="document-attach-outline" size={24} color={Theme.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: Theme.textPrimary }} numberOfLines={1}>
                        {attachmentUrl.split('/').pop()}
                      </Text>
                      <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: Theme.textMuted }}>Compressed receipt photo</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => setViewerImageUrl(attachmentUrl)} style={{ padding: 4 }}>
                        <Ionicons name="eye-outline" size={20} color={Theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setAttachmentUrl("")} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={20} color={Theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 12, width: "100%" }}>
                    <TouchableOpacity 
                      onPress={() => handleSelectImage('camera')}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: Theme.bgCard,
                        borderWidth: 1.5,
                        borderColor: Theme.primary + '30',
                        borderStyle: 'dashed',
                        paddingVertical: 12,
                        borderRadius: 8
                      }}
                    >
                      <Ionicons name="camera-outline" size={18} color={Theme.primary} />
                      <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: Theme.primary }}>Take Photo</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => handleSelectImage('library')}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: Theme.bgCard,
                        borderWidth: 1.5,
                        borderColor: Theme.primary + '30',
                        borderStyle: 'dashed',
                        paddingVertical: 12,
                        borderRadius: 8
                      }}
                    >
                      <Ionicons name="image-outline" size={18} color={Theme.primary} />
                      <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: Theme.primary }}>Upload Image</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, opening && styles.disabledButton]}
              onPress={handleConfirmAndOpen}
              disabled={opening}
            >
              {opening ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Open Cash Drawer</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textButton}
              onPress={() => {
                const reason = REASONS.find(r => r.label === selectedReason);
                setStep(reason?.amountRequired ? 3 : 2);
              }}
            >
              <Text style={styles.textButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 5: OUTCOME RESULT */}
        {step === 5 && (
          <View style={[styles.card, !isTablet && { width: "100%" }]}>
            {drawerSuccess ? (
              <View style={styles.outcomeWrapper}>
                <Ionicons name="checkmark-circle" size={80} color="#16A34A" />
                <Text style={styles.title}>Drawer Opened Successfully</Text>
                <Text style={styles.subtitle}>
                  The pulse was sent to the cashier printer. Ensure the drawer
                  is fully closed after use.
                </Text>
              </View>
            ) : (
              <View style={styles.outcomeWrapper}>
                <Ionicons name="alert-circle" size={80} color="#DC2626" />
                <Text style={styles.title}>Trigger Failed</Text>
                <Text style={styles.subtitle}>
                  We could not connect to the LAN receipt printer. The drawer
                  trigger event has been logged for audit review.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={resetFlow}>
              <Text style={styles.primaryButtonText}>Finish & Reset</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Full-Screen Image Viewer Modal */}
      <Modal visible={!!viewerImageUrl} transparent animationType="fade" onRequestClose={() => setViewerImageUrl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setViewerImageUrl(null)} 
          />
          <View style={{ width: '90%', height: '80%', justifyContent: 'center', alignItems: 'center' }}>
            {!!viewerImageUrl && (
              <Image 
                source={{ uri: viewerImageUrl.startsWith('http') ? viewerImageUrl : `${API_URL}${viewerImageUrl}` }} 
                style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
              />
            )}
          </View>
          <TouchableOpacity 
            onPress={() => setViewerImageUrl(null)} 
            style={{ position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 20 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.bgMain,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Theme.bgNav,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.black,
    color: Theme.textPrimary,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Theme.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.primaryBorder,
  },
  reportButtonText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Theme.primary,
  },
  scrollContent: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 400,
    marginBottom: 40,
  },
  stepIndicatorWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.bgMuted,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  stepDotActive: {
    backgroundColor: Theme.primary,
  },
  stepDotCurrent: {
    borderWidth: 3,
    borderColor: Theme.primaryBorder,
  },
  stepText: {
    fontSize: 12,
    fontFamily: Fonts.black,
    color: Theme.textMuted,
  },
  stepTextActive: {
    color: "#fff",
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: Theme.border,
    marginHorizontal: -2,
    zIndex: 1,
  },
  stepLineActive: {
    backgroundColor: Theme.primary,
  },
  card: {
    backgroundColor: Theme.bgCard,
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 450,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Theme.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  lockIcon: {
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: Theme.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 18,
  },
  pinInput: {
    width: "100%",
    height: 52,
    backgroundColor: Theme.bgInput,
    borderWidth: 1.5,
    borderColor: Theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontFamily: Fonts.black,
    textAlign: "center",
    color: Theme.textPrimary,
    letterSpacing: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#DC2626",
    fontFamily: Fonts.bold,
    fontSize: 12,
    marginBottom: 15,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.black,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  gridCard: {
    backgroundColor: Theme.bgCard,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 600,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    backgroundColor: Theme.bgMuted,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  gridLabel: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Theme.textPrimary,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: Theme.border,
    width: "100%",
    justifyContent: "center",
    marginBottom: 30,
  },
  currencySymbol: {
    fontSize: 32,
    fontFamily: Fonts.black,
    color: Theme.textPrimary,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 36,
    fontFamily: Fonts.black,
    color: Theme.textPrimary,
    paddingVertical: 8,
    minWidth: 100,
    textAlign: "left",
  },
  textButton: {
    paddingVertical: 12,
    marginTop: 10,
  },
  textButtonText: {
    color: Theme.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  remarksInput: {
    width: "100%",
    minHeight: 80,
    backgroundColor: Theme.bgInput,
    borderWidth: 1.5,
    borderColor: Theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Theme.textPrimary,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  outcomeWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
});
