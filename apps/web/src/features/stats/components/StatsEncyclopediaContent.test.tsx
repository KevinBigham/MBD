import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import StatsEncyclopediaContent from './StatsEncyclopediaContent';
import { STAT_DEFINITIONS } from '../data/statDefinitions';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('StatsEncyclopediaContent', () => {
  it('renders route content from extracted definitions and delegates filter changes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onFilterChange = vi.fn();

    try {
      await act(async () => {
        root.render(
          <MemoryRouter>
            <StatsEncyclopediaContent
              definitions={STAT_DEFINITIONS}
              filter="all"
              leagueContext={{
                leagueWoba: 0.318,
                leagueOps: 0.721,
                leagueEra: 4.12,
                leagueFip: 4.04,
                runsPerWin: 9.7,
              }}
              onFilterChange={onFilterChange}
            />
          </MemoryRouter>,
        );
      });

      expect(STAT_DEFINITIONS).toHaveLength(10);
      expect(container.textContent).toContain('Stats Encyclopedia');
      expect(container.textContent).toContain('Current League Environment');
      expect(container.textContent).toContain('0.318');
      expect(container.textContent).toContain('WAR');
      expect(container.textContent).toContain('FIP');
      expect(container.querySelector('a')?.getAttribute('href')).toBe('/league/leaders');

      const pitchingFilter = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Pitching'),
      );

      await act(async () => {
        pitchingFilter?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(onFilterChange).toHaveBeenCalledWith('pitching');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
