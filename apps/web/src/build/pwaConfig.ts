import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';

export const mbdPwaManifest = {
  name: 'Mr. Baseball Dynasty',
  short_name: 'MBD',
  description: 'A browser-based baseball franchise dynasty simulator.',
  start_url: '/MBD/',
  scope: '/MBD/',
  display: 'standalone',
  background_color: '#0B1020',
  theme_color: '#0B1020',
  icons: [
    {
      src: '/MBD/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
} satisfies Partial<ManifestOptions>;

export function createMbdPwaPlugin() {
  return VitePWA({
    injectRegister: false,
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: mbdPwaManifest,
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,json}'],
      navigateFallback: '/MBD/index.html',
    },
  });
}
