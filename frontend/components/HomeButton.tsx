import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Fonts } from "../constants/Fonts";
import { Theme } from "../constants/theme";

interface HomeButtonProps {
  /** Show label text beside the icon (default: true on tablet, false on phone) */
  showLabel?: boolean;
  /** Override container style */
  style?: ViewStyle;
  /** Compact mode: smaller padding, no label */
  compact?: boolean;
}

/**
 * HomeButton
 * A consistent Home navigation button used across the POS flow:
 * thai_kitchen → summary → payment (including split-paymode).
 *
 * Pressing it navigates to the category (table grid) screen via router.replace.
 * Using replace instead of back() ensures the user always lands on the table
 * grid, regardless of how deep the stack is.
 */
export default function HomeButton({ showLabel = true, style, compact = false }: HomeButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    router.replace("/(tabs)/category");
  };

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        compact && styles.btnCompact,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <Ionicons
        name="home-outline"
        size={compact ? 18 : 20}
        color={Theme.primary}
      />
      {showLabel && !compact && (
        <Text style={styles.label}>Home</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Theme.bgMuted,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  btnCompact: {
    height: 36,
    minWidth: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: Theme.primary,
  },
});
