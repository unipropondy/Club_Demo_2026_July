import { Platform } from 'react-native';

/**
 * ★ Neon Noir — Club & Pub Venue POS Theme ★
 * Primary:    Electric Violet #A855F7
 * Background: Deep Navy-Black #0A0A14
 * Accents:    Neon Pink, Neon Gold, Neon Green, Neon Blue
 */

export const Theme = {
  // ── Primary Brand (Electric Violet) ──
  primary: '#A855F7',
  primaryDark: '#7C3AED',
  primaryLight: '#2D1B69',
  primaryBorder: 'rgba(168,85,247,0.40)',

  // ── Dark Backgrounds ──
  bgMain: '#0A0A14',        // Deep navy-black — main app bg
  bgCard: '#12121F',        // Dark card surface
  bgInput: '#1A1A2E',       // Dark input fields
  bgNav: '#0E0E1A',         // Header / nav bar
  bgMuted: '#1E1E30',       // Secondary / muted surfaces
  bgOverlay: 'rgba(10,10,20,0.96)',

  // ── Dark Palette (legacy tokens mapped to dark equivalents) ──
  bgDark: '#0A0A14',
  cardDark: '#12121F',
  borderDark: '#2A2A45',
  bgDarkMuted: '#1E1E30',

  // ── Text ──
  textPrimary: '#F0F0FF',          // Near-white with slight lavender
  textSecondary: '#9B9BC4',        // Muted lavender
  textMuted: '#5A5A80',            // Placeholder / disabled
  textInverse: '#0A0A14',          // Dark text on light surfaces
  textOrange: '#A855F7',           // Mapped to violet (primary)

  // ── Borders ──
  border: '#2A2A45',               // Subtle dark border
  borderStrong: '#3D3D60',         // Stronger border
  borderOrange: 'rgba(168,85,247,0.35)',  // Violet border variant

  // ── Neon Accent Colors ──
  neonViolet: '#A855F7',
  neonBlue: '#3B82F6',
  neonPink: '#EC4899',
  neonGold: '#F59E0B',
  neonGreen: '#10B981',
  neonRed: '#EF4444',
  neonCyan: '#06B6D4',

  // ── Glassmorphism ──
  glassCard: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassCardStrong: 'rgba(168,85,247,0.08)',
  glassBorderStrong: 'rgba(168,85,247,0.25)',

  // ── Shadows (colored glow for dark mode) ──
  shadowSm: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: Platform.OS === 'android' ? 2 : 2,
  },
  shadowMd: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 4 : 4,
  },
  shadowLg: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: Platform.OS === 'android' ? 8 : 8,
  },

  // ── Semantic Status Colors (neon dark-mode versions) ──
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.12)',
  successBorder: 'rgba(16,185,129,0.35)',

  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
  warningBorder: 'rgba(245,158,11,0.35)',

  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.12)',
  dangerBorder: 'rgba(239,68,68,0.35)',

  info: '#3B82F6',
  infoBg: 'rgba(59,130,246,0.12)',
  infoBorder: 'rgba(59,130,246,0.35)',

  // ── Table / Zone status (neon glow for dark surfaces) ──
  tableLocked:      { bg: 'rgba(239,68,68,0.15)',    border: '#EF4444' },   // Red — Reserved
  tableHold:        { bg: 'rgba(59,130,246,0.15)',   border: '#3B82F6' },   // Blue — Hold
  tableSent:        { bg: 'rgba(16,185,129,0.15)',   border: '#10B981' },   // Green — Active/Dining
  tableSentOld:     { bg: 'rgba(168,85,247,0.15)',   border: '#A855F7' },   // Violet — legacy
  tableBillRequest: { bg: 'rgba(245,158,11,0.15)',   border: '#F59E0B' },   // Gold — Billing
  tableEmpty:       { bg: 'rgba(255,255,255,0.03)',  border: '#2A2A45' },   // Dark — Open

  // ── Radius ──
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 999,
};

// Legacy Colors export — dark mode values for both light/dark
export const Colors = {
  light: {
    text: Theme.textPrimary,
    background: Theme.bgMain,
    tint: Theme.primary,
    icon: Theme.textSecondary,
    tabIconDefault: Theme.textSecondary,
    tabIconSelected: Theme.primary,
  },
  dark: {
    text: Theme.textPrimary,
    background: Theme.bgMain,
    tint: Theme.primary,
    icon: Theme.textSecondary,
    tabIconDefault: Theme.textSecondary,
    tabIconSelected: Theme.primary,
  },
};

