import { DarkTheme as RNDarkTheme, DefaultTheme as RNDefaultTheme, ThemeProvider as RNThemeProvider } from "@react-navigation/native";
import { useIsFocused as useRNIsFocused } from "@react-navigation/native";
import { PlatformPressable as RNPlatformPressable } from "@react-navigation/elements";
import type { BottomTabBarButtonProps as RNBottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

export const DarkTheme = RNDarkTheme;
export const DefaultTheme = RNDefaultTheme;
export const ThemeProvider = RNThemeProvider;
export const useIsFocused = useRNIsFocused;
export const PlatformPressable = RNPlatformPressable;
export type BottomTabBarButtonProps = RNBottomTabBarButtonProps;
