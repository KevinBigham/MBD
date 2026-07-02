import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import PlayerProfileContractSnapshotPanel from './PlayerProfileContractSnapshotPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type ContractSnapshotProps = Parameters<typeof PlayerProfileContractSnapshotPanel>[0];

const basePlayer: ContractSnapshotProps['player'] = {
  contract: {
    years: 3,
    annualSalary: 18.25,
    totalValue: 54.75,
    noTradeClause: true,
    noTradeClauseType: 'partial',
    playerOption: false,
    teamOption: true,
    optOutYears: [2],
    signingBonus: 4.5,
    buyoutAmount: 1.2,
    deferredMoney: [],
  },
  rosterStatus: 'MLB',
  minorLeagueLevel: null,
  optionYearsUsed: 2,
  isOutOfOptions: false,
  serviceTimeDays: 401,
};

describe('PlayerProfileContractSnapshotPanel', () => {
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

  async function renderPanel(player: ContractSnapshotProps['player'] = basePlayer) {
    await act(async () => {
      root.render(<PlayerProfileContractSnapshotPanel player={player} />);
      await Promise.resolve();
    });
  }

  it('renders contract value, roster context, and service-time copy', async () => {
    await renderPanel();

    expect(container.textContent).toContain('Contract Snapshot');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('$18.3M');
    expect(container.textContent).toContain('$54.8M');
    expect(container.textContent).toContain('$4.5M');
    expect(container.textContent).toContain('partial');
    expect(container.textContent).toContain('MLB');
    expect(container.textContent).toContain('Options Used 2');
    expect(container.textContent).toContain('Service time: 2 years · 57 days');
  });

  it('renders minor-league level and out-of-options roster pressure', async () => {
    await renderPanel({
      ...basePlayer,
      rosterStatus: 'AAA',
      minorLeagueLevel: 'AAA',
      isOutOfOptions: true,
      contract: {
        ...basePlayer.contract,
        noTradeClause: false,
        noTradeClauseType: 'none',
        optOutYears: [],
      },
    });

    expect(container.textContent).toContain('AAA');
    expect(container.textContent).toContain('Out of Options');
    expect(container.textContent).toContain('none');
    expect(container.textContent).toContain('--');
  });
});
