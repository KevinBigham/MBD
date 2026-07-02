import { describe, expect, it } from 'vitest';
import {
  MOBILE_PRIMARY_ROUTES,
  NAVIGATION_GROUPS,
  getNavigationSearchValue,
} from './navigationRegistry';

describe('navigationRegistry', () => {
  it('groups playable routes around GM task areas in the expected order', () => {
    expect(NAVIGATION_GROUPS.map((group) => group.label)).toEqual([
      'Home',
      'Team',
      'Players',
      'Transactions',
      'League',
      'Story',
      'System',
    ]);

    expect(NAVIGATION_GROUPS.flatMap((group) => group.items.map((item) => item.to))).toEqual(
      expect.arrayContaining([
        '/dashboard',
        '/roster',
        '/players',
        '/trade',
        '/league/standings',
        '/history',
        '/settings',
      ]),
    );
  });

  it('keeps mobile primary routes focused on the most common GM tasks', () => {
    expect(MOBILE_PRIMARY_ROUTES).toEqual([
      '/dashboard',
      '/roster',
      '/draft',
      '/trade',
      '/league/standings',
    ]);
  });

  it('indexes intent aliases for global command search', () => {
    const searchIndex = NAVIGATION_GROUPS
      .flatMap((group) => group.items.map((item) => getNavigationSearchValue(item, group.label)))
      .join(' ');

    expect(searchIndex).toContain('shop player');
    expect(searchIndex).toContain('fix roster');
    expect(searchIndex).toContain('budget');
    expect(searchIndex).toContain('reports');
    expect(searchIndex).toContain('what now');
  });
});
