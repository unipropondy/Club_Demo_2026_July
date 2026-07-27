import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

import { Fonts } from "@/constants/Fonts";
import { Theme } from "@/constants/theme";
import { API_URL } from "@/constants/Config";
import { useAuthStore } from "@/stores/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ============ ROLE CONFIG ============ */
const ROLE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  ADMIN:      { color: "#EF4444", icon: "shield-checkmark", label: "Administrator" },
  MANAGER:    { color: "#A855F7", icon: "briefcase",        label: "Manager" },
  SUPERVISOR: { color: "#06B6D4", icon: "eye",              label: "Supervisor" },
  CASHIER:    { color: Theme.primary, icon: "cash",         label: "Cashier" },
  KDS:        { color: "#10B981", icon: "flame-outline",    label: "Kitchen" },
};

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setPermissions = useAuthStore((s) => s.setPermissions);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [userName, setUserName]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  useFocusEffect(
    useCallback(() => {
      const { user, loginDate, logout } = useAuthStore.getState();
      if (user) {
        const currentDate = new Date().toISOString().split("T")[0];
        if (loginDate && currentDate !== loginDate) {
          logout();
        } else {
          const uName = (user.userName || "").trim().toUpperCase();
          if (user.userGroupId === "DFCF23EE-F6F4-4885-8D26-0056C657595F") {
            router.replace("/sales-report");
          } else if (uName === "KDS") {
            router.replace("/kds" as any);
          } else {
            router.replace("/(tabs)/category");
          }
          return;
        }
      }

      setError("");
      setLoading(false);

      const loadRemembered = async () => {
        try {
          const saved = await AsyncStorage.getItem("remembered_creds");
          if (saved) {
            const { u, p } = JSON.parse(saved);
            setUserName(u || "");
            setPassword(p || "");
            setRememberMe(true);
          }
        } catch (e) {}
      };
      loadRemembered();

      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
    }, [fadeAnim, slideAnim]),
  );

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!userName.trim() || !password.trim()) {
      setError("Please enter both User ID and Password.");
      shakeError();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: userName.trim(), password }),
      });
      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user, data.token);

        try {
          if (rememberMe) {
            await AsyncStorage.setItem("remembered_creds", JSON.stringify({ u: userName.trim(), p: password }));
          } else {
            await AsyncStorage.removeItem("remembered_creds");
          }
        } catch (e) {}

        try {
          const permRes = await fetch(`${API_URL}/api/auth/permissions/${data.user.role}`);
          if (permRes.ok) {
            const permData = await permRes.json();
            setPermissions(permData);
          }
        } catch {
          setPermissions({});
        }

        const role = data.user.role;
        if (data.user.userGroupId === "DFCF23EE-F6F4-4885-8D26-0056C657595F") {
          router.replace("/sales-report");
        } else if (role === "KDS") {
          router.replace("/(tabs)/kds" as any);
        } else {
          router.replace("/(tabs)/category");
        }
      } else {
        setError(data.message || "Login failed. Please try again.");
        shakeError();
      }
    } catch (err: any) {
      console.error("❌ [Login Network Failure]:", err?.message || err);
      setError("Cannot connect to server. Check your network.");
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Deep dark gradient bg ── */}
      <LinearGradient
        colors={["#0A0A14", "#140830", "#0A0A14"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Neon ambient orbs ── */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, isLandscape && { paddingVertical: 16 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.centeredContent}>
              <Animated.View
                style={[
                  styles.wrapper,
                  { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                  isLandscape && { maxWidth: 520 },
                ]}
              >
                {/* ── Brand / Logo ── */}
                <View style={[styles.brandRow, isLandscape && { marginBottom: 20, flexDirection: "row", gap: 18, alignItems: "center" }]}>
                  {/* Logo with violet glow ring */}
                  <View style={[styles.logoRing, isLandscape && { width: 68, height: 68, marginBottom: 0 }]}>
                    <Image
                      source={require("../assets/images/logo_pos.png")}
                      style={{ width: isLandscape ? 46 : 64, height: isLandscape ? 46 : 64, borderRadius: 16 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={isLandscape && { alignItems: "flex-start" }}>
                    <Text style={[styles.appName, isLandscape && { fontSize: 24 }]}>
                      <Text style={{ color: "#A855F7" }}>Smart</Text>
                      <Text style={{ color: "#F0F0FF" }}>-Club</Text>
                    </Text>
                    <Text style={[styles.appTagline, isLandscape && { fontSize: 10 }]}>
                      VENUE MANAGEMENT SYSTEM
                    </Text>
                  </View>
                </View>

                {/* ── Glass Card ── */}
                <Animated.View
                  style={[
                    styles.card,
                    { transform: [{ translateX: shakeAnim }] },
                    isLandscape && { padding: 22 },
                  ]}
                >
                  {/* Neon top border accent */}
                  <View style={styles.cardTopAccent} />

                  <Text style={styles.cardTitle}>Welcome Back</Text>
                  <Text style={styles.cardSub}>Sign in to manage your venue</Text>

                  {/* Error */}
                  {error !== "" && (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={15} color="#EF4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  {/* User ID */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>USER ID</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="person-outline" size={18} color="#5A5A80" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your User ID"
                        placeholderTextColor="#5A5A80"
                        value={userName}
                        onChangeText={(t) => { setUserName(t); setError(""); }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View style={[styles.inputGroup, isLandscape && { marginBottom: 14 }]}>
                    <Text style={styles.inputLabel}>PASSWORD</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="lock-closed-outline" size={18} color="#5A5A80" style={{ marginRight: 10 }} />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Enter your Password"
                        placeholderTextColor="#5A5A80"
                        value={password}
                        onChangeText={(t) => { setPassword(t); setError(""); }}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={20}
                          color="#5A5A80"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Remember Me */}
                  <TouchableOpacity
                    style={styles.rememberRow}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                      {rememberMe && <Ionicons name="checkmark" size={13} color="#FFF" />}
                    </View>
                    <Text style={styles.rememberText}>Remember Me</Text>
                  </TouchableOpacity>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    style={[styles.btn, loading && { opacity: 0.7 }, isLandscape && { height: 50, marginTop: 4 }]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#A855F7", "#7C3AED"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="log-in-outline" size={22} color="#fff" />
                          <Text style={styles.btnText}>Sign In</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Footer */}
                <Text style={styles.footerText}>© 2026 Unipro Softwares SG Pte Ltd</Text>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#0A0A14" },
  safeArea:     { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent:{ flexGrow: 1 },
  centeredContent: {
    flex: 1, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 24,
  },
  wrapper: { width: "100%", maxWidth: 460, alignItems: "center" },

  // Ambient neon orbs
  orb:  { position: "absolute", borderRadius: 999 },
  orb1: { width: 340, height: 340, backgroundColor: "rgba(168,85,247,0.14)", top: -100, left: -80 },
  orb2: { width: 380, height: 380, backgroundColor: "rgba(236,72,153,0.09)", bottom: -140, right: -100 },
  orb3: { width: 180, height: 180, backgroundColor: "rgba(6,182,212,0.07)", top: "38%", right: -50 },

  // Brand / Logo
  brandRow: { alignItems: "center", marginBottom: 32 },
  logoRing: {
    width: 96, height: 96, borderRadius: 30, marginBottom: 18,
    backgroundColor: "rgba(168,85,247,0.12)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "rgba(168,85,247,0.45)",
    shadowColor: "#A855F7", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 20, elevation: 10,
  },
  appName:    { color: "#F0F0FF", fontSize: 30, fontFamily: Fonts.black, letterSpacing: 1.5 },
  appTagline: {
    color: "rgba(155,155,196,0.75)", fontSize: 11, fontFamily: Fonts.bold,
    letterSpacing: 2.5, marginTop: 6, textTransform: "uppercase",
  },

  // Glassmorphism card
  card: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.038)",
    borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: "rgba(168,85,247,0.28)",
    overflow: "hidden",
    shadowColor: "#A855F7", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 28, elevation: 12,
  },
  cardTopAccent: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 2, backgroundColor: "#A855F7", borderRadius: 2, opacity: 0.9,
  },
  cardTitle: { color: "#F0F0FF", fontSize: 22, fontFamily: Fonts.black, marginTop: 6, marginBottom: 4 },
  cardSub:   { color: "#5A5A80", fontSize: 13, fontFamily: Fonts.medium, marginBottom: 24 },

  // Error
  errorRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.30)",
  },
  errorText: { color: "#EF4444", fontSize: 12, fontFamily: Fonts.medium, flex: 1 },

  // Inputs
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    color: "#9B9BC4", fontSize: 10, fontFamily: Fonts.bold,
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1A1A2E", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#2A2A45",
    paddingHorizontal: 14, height: 54,
  },
  input: {
    flex: 1, color: "#F0F0FF", fontSize: 15, fontFamily: Fonts.medium,
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },

  // Remember Me
  rememberRow:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22, paddingLeft: 2 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    borderColor: "#2A2A45", justifyContent: "center",
    alignItems: "center", backgroundColor: "#1A1A2E",
  },
  checkboxActive: { backgroundColor: Theme.primary, borderColor: Theme.primary },
  rememberText:  { fontSize: 14, fontFamily: Fonts.bold, color: "#9B9BC4" },

  // Sign In button
  btn: {
    height: 58, borderRadius: 16, marginTop: 4, overflow: "hidden",
    shadowColor: "#A855F7", shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.50, shadowRadius: 18, elevation: 10,
  },
  btnGradient: {
    flex: 1, flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 10,
  },
  btnText: { color: "#fff", fontSize: 18, fontFamily: Fonts.black, letterSpacing: 0.5 },

  footerText: {
    color: "rgba(90,90,128,0.85)", fontSize: 11,
    fontFamily: Fonts.medium, marginTop: 28,
  },
});
