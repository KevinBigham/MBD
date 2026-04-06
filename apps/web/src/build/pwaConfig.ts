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
    {
      src: '/MBD/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/MBD/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
} satisfies Partial<ManifestOptions>;

export function createMbdPwaPlugin() {
  return VitePWA({
    injectRegister: false,
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon-180.png'],
    manifest: mbdPwaManifest,
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,json}'],
      navigateFallback: '/MBD/index.html',
      skipWaiting: true,
      clientsClaim: true,
    },
  });
}
