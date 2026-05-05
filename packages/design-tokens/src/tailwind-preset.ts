/**
 * MBD Design Tokens — Tailwind CSS Preset
 * Exports all tokens as a Tailwind-compatible preset.
 */

import { dynasty, accent } from './colors';
import { fontFamily, fontSize } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

/**
 * Tailwind expects fontSize entries as [size, { lineHeight }] tuples.
 */
function buildFontSize(
  entries: typeof fontSize,
): Record<string, [string, { lineHeight: string }]> {
  const result: Record<string, [string, { lineHeight: string }]> = {};
  for (const [key, value] of Object.entries(entries)) {
    result[key] = [value.size, { lineHeight: value.lineHeight }];
  }
  return result;
}

const mbdPreset = {
  theme: {
    extend: {
      colors: {
        dynasty: { ...dynasty },
        accent: { ...accent },
      },
      fontFamily: {
        data: [fontFamily.data],
        heading: [fontFamily.heading],
        brand: [fontFamily.brand],
      },
      fontSize: buildFontSize(fontSize),
      spacing: { ...spacing },
      boxShadow: { ...shadows },
      animation: {
        'ceremony-fade-in': 'ceremonyFadeIn 0.6s ease-out forwards',
        'ceremony-scale-up': 'ceremonyScaleUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'ceremony-glow': 'ceremonyGlow 2s ease-in-out infinite',
        'ceremony-slide-up': 'ceremonySlideUp 0.4s ease-out forwards',
        'stat-tick': 'statTick 0.3s ease-out',
        'assistant-enter': 'assistantEnter 0.18s ease-out',
        'assistant-pulse': 'assistantPulse 0.9s ease-out 1',
      },
      keyframes: {
        ceremonyFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        ceremonyScaleUp: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        ceremonyGlow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(249, 115, 22, 0.3)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(249, 115, 22, 0.6)' },
        },
        ceremonySlideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        statTick: {
          '0%': { transform: 'scale(1.15)', color: 'rgba(249, 115, 22, 1)' },
          '100%': { transform: 'scale(1)', color: 'inherit' },
        },
        assistantEnter: {
          '0%': { transform: 'translateY(4px) scale(0.96)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        assistantPulse: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.28)' },
          '45%': { transform: 'scale(1.04)', boxShadow: '0 0 0 8px rgba(34, 197, 94, 0.12)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
    },
  },
} as const;

export default mbdPreset;
export { mbdPreset };
