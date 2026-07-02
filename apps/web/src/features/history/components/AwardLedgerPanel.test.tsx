import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { AwardHistoryEntry } from '@mbd/contracts';
import AwardLedgerPanel from './AwardLedgerPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const awardHistory: AwardHistoryEntry[] = [
  {
    season: 9,
    award: 'CY_YOUNG',
    league: 'NL',
    playerId: 'pitcher-1',
    teamId: 'nym',
    summary: 'A 2.18 ERA and 231 strikeouts anchored the staff.',
  },
  {
    season: 8,
    award: 'MVP',
    league: 'AL',
    playerId: 'slugger-1',
    teamId: 'bos',
    summary: 'Led the league in OPS while carrying a division winner.',
  },
];

function playerName(playerId: string): string {
  if (playerId === 'pitcher-1') return 'Elena Vargas';
  if (playerId === 'slugger-1') return 'Riley Stone';
  return 'Unknown Player';
}

function teamName(teamId: string | null): string {
  if (teamId === 'nym') return 'New York Tycoons';
  if (teamId === 'bos') return 'Boston Pilgrims';
  return 'Unknown Club';
}

function formatAwardLabel(value: string): string {
  return value === 'CY_YOUNG' ? 'Cy Young' : 'MVP';
}

describe('AwardLedgerPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders award ledger entries with resolved player and team labels', async () => {
    await act(async () => {
      root.render(
        <AwardLedgerPanel
          awardHistory={awardHistory}
          formatAwardLabel={formatAwardLabel}
          playerName={playerName}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('Award Ledger');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Season 9 NL Cy Young');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Elena Vargas');
    expect(container.textContent).toContain('2.18 ERA and 231 strikeouts');
    expect(container.textContent).toContain('Season 8 AL MVP');
    expect(container.textContent).toContain('Boston Pilgrims');
    expect(container.textContent).toContain('Riley Stone');
  });

  it('renders empty ledger copy before awards are recorded', async () => {
    await act(async () => {
      root.render(
        <AwardLedgerPanel
          awardHistory={[]}
          formatAwardLabel={formatAwardLabel}
          playerName={playerName}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('Award Ledger');
    expect(container.textContent).toContain('No awards recorded yet. Complete a season to start building the ledger.');
  });
});
