import { describe, expect, it, vi } from 'vitest';
import { mbdPwaManifest, createMbdPwaPlugin } from './pwaConfig';
import { VitePWA } from 'vite-plugin-pwa';

vi.mock('vite-plugin-pwa', () => ({
  VitePWA: vi.fn((config) => [{ name: 'mock-vite-pwa', config }]),
}));

describe('mbdPwaManifest', () => {
  it('defines the install metadata for Mr. Baseball Dynasty', () => {
    expect(mbdPwaManifest.name).toBe('Mr. Baseball Dynasty');
    expect(mbdPwaManifest.short_name).toBe('MBD');
    expect(mbdPwaManifest.theme_color).toBe('#0B1020');
    expect(mbdPwaManifest.icons.length).toBeGreaterThan(0);
    expect(mbdPwaManifest.start_url).toBe('/MBD/');
  });
});

describe('createMbdPwaPlugin', () => {
  it('returns a VitePWA plugin array', () => {
    const plugin = createMbdPwaPlugin();
    // VitePWA returns an array of Vite plugins
    expect(Array.isArray(plugin)).toBe(true);
  });

  it('keeps the service worker auto-update strategy enabled', () => {
    createMbdPwaPlugin();

    expect(VitePWA).toHaveBeenCalledWith(expect.objectContaining({
      injectRegister: false,
      registerType: 'autoUpdate',
      workbox: expect.objectContaining({
        skipWaiting: true,
        clientsClaim: true,
      }),
    }));
  });
});
