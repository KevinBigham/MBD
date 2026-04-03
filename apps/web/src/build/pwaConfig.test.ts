import { describe, expect, it } from 'vitest';
import { mbdPwaManifest } from './pwaConfig';

describe('mbdPwaManifest', () => {
  it('defines the install metadata for Mr. Baseball Dynasty', () => {
    expect(mbdPwaManifest.name).toBe('Mr. Baseball Dynasty');
    expect(mbdPwaManifest.short_name).toBe('MBD');
    expect(mbdPwaManifest.theme_color).toBe('#0B1020');
    expect(mbdPwaManifest.icons.length).toBeGreaterThan(0);
    expect(mbdPwaManifest.start_url).toBe('/MBD/');
  });
});
