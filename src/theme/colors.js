/**
 * RememberMe App - Theme & Colors
 */

export const COLORS = {
  // Primary palette
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  primaryLight: '#8B85FF',

  // Accent
  accent: '#FF6584',
  accentLight: '#FF8FA3',

  // Background
  bgDark: '#0F0F23',
  bgCard: '#1A1A2E',
  bgCardLight: '#25253E',
  bgModal: '#16213E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#6B6B8D',

  // Status
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',

  // WhatsApp
  whatsapp: '#25D366',

  // Misc
  border: '#2A2A4A',
  overlay: 'rgba(0,0,0,0.7)',
  shadow: '#000000',
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.textPrimary },
  medium: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },
  bold: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  title: { fontSize: 24, color: COLORS.textPrimary, fontWeight: '800' },
  hero: { fontSize: 32, color: COLORS.textPrimary, fontWeight: '900' },
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  large: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
};
