/**
 * MBD Design Tokens — Colors
 * Bloomberg Terminal aesthetic: deep navy surfaces with orange accent system.
 */

export const dynasty = {
  base: '#0B1020',
  surface: '#0F1930',
  elevated: '#142447',
  overlay: '#1A2D5A',
  border: '#1E3A6E',
  muted: '#8A9BB5',
  textSecondary: '#8A9BB5',
  text: '#E2E8F0',
  textBright: '#F8FAFC',
} as const;

export const accent = {
  primary: '#f97316',
  primaryHover: '#ea580c',
  success: '#22C55E',
  successMuted: '#166534',
  warning: '#F59E0B',
  warningMuted: '#92400E',
  danger: '#F43F5E',
  dangerMuted: '#9F1239',
  info: '#38BDF8',
  infoMuted: '#075985',
} as const;

export type DynastyColor = keyof typeof dynasty;
export type AccentColor = keyof typeof accent;
