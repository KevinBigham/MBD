import { describe, expect, it } from 'vitest';
import { mbdPwaManifest, createMbdPwaPlugin } from './pwaConfig';

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
});
