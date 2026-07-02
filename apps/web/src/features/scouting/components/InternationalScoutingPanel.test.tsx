import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import InternationalScoutingPanel, {
  type ScoutingTradeTarget,
} from './InternationalScoutingPanel';
import type { IFAPoolView, IFAProspectView, IFAReportView } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const tradeTargets: ScoutingTradeTarget[] = [
  { id: 'bos', city: 'Boston', name: 'Ports' },
  { id: 'kc', city: 'Kansas City', name: 'Fountains' },
];

const prospect: IFAProspectView = {
  id: 'ifa-1',
  playerName: 'Rafael Ortiz',
  age: 17,
  position: 'SS',
  region: 'dominican_republic',
  country: 'Dominican Republic',
  expectedBonus: 1.25,
  status: 'available',
  signedTeamId: null,
  signedBonus: null,
  looks: 2,
  overall: 58,
  confidence: 6,
  ceiling: 72,
  floor: 42,
  notes: 'Fast hands with room to add strength.',
  scoutConflict: {
    prospectId: 'ifa-1',
    teamId: 'nym',
    prospectType: 'ifa',
    createdSeason: 1,
    resolutionSeason: 4,
    resolved: false,
    headline: 'Front office split on Rafael Ortiz',
    divergence: 18,
    debateGenerated: true,
    resolution: null,
    winningSource: null,
    opinions: [
      {
        source: 'scout_director',
        overallGrade: 64,
        ceiling: 76,
        floor: 40,
        confidence: 5,
        summary: 'Impact body projection.',
      },
      {
        source: 'analytics_head',
        overallGrade: 52,
        ceiling: 66,
        floor: 38,
        confidence: 8,
        summary: 'Model sees swing risk.',
      },
      {
        source: 'manager',
        overallGrade: 58,
        ceiling: 70,
        floor: 42,
        confidence: 6,
        summary: 'Usable middle infield path.',
      },
    ],
    outcomeSummary: null,
  },
};

const pool: IFAPoolView = {
  season: 1,
  currentPhase: 'international_signing',
  signingWindowOpen: true,
  budget: {
    baseAllocation: 5,
    tradedIn: 0.5,
    tradedOut: 0.25,
    committed: 1,
    remaining: 4.25,
  },
  staffAccuracy: 0.78,
  prospects: [prospect],
};

const report: IFAReportView = {
  playerId: 'ifa-1',
  playerName: 'Rafael Ortiz',
  age: 17,
  position: 'SS',
  region: 'dominican_republic',
  country: 'Dominican Republic',
  expectedBonus: 1.25,
  looks: 3,
  grades: {
    contact: 60,
    power: 48,
    eye: 54,
    speed: 66,
    defense: 58,
    durability: 52,
  },
  overall: 59,
  confidence: 5,
  ceiling: 74,
  floor: 43,
  notes: 'Projection bat with impact range.',
  reliability: 4,
  scoutConflict: prospect.scoutConflict,
};

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('InternationalScoutingPanel', () => {
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

  it('renders the international unavailable state when the pool has not loaded', async () => {
    await act(async () => {
      root.render(
        <InternationalScoutingPanel
          actionMessage={null}
          ifaBonus=""
          ifaLoading={false}
          ifaPool={null}
          ifaReport={null}
          onChangeIFABonus={vi.fn()}
          onChangeTradeAmount={vi.fn()}
          onChangeTradeTarget={vi.fn()}
          onScoutProspect={vi.fn()}
          onSignProspect={vi.fn()}
          onTradePoolSpace={vi.fn()}
          tradeAmount="0.50"
          tradeTarget="bos"
          tradeTargets={tradeTargets}
        />,
      );
    });

    expect(container.textContent).toContain('International scouting data is not available yet.');
    expect(container.textContent).toContain('No international prospects are loaded for this season yet.');
  });

  it('renders pool controls, selected prospect context, and delegates IFA actions', async () => {
    const onChangeIFABonus = vi.fn();
    const onChangeTradeAmount = vi.fn();
    const onChangeTradeTarget = vi.fn();
    const onScoutProspect = vi.fn();
    const onSignProspect = vi.fn();
    const onTradePoolSpace = vi.fn();

    await act(async () => {
      root.render(
        <InternationalScoutingPanel
          actionMessage="Transferred $0.50M of pool space."
          ifaBonus="1.25"
          ifaLoading
          ifaPool={pool}
          ifaReport={report}
          onChangeIFABonus={onChangeIFABonus}
          onChangeTradeAmount={onChangeTradeAmount}
          onChangeTradeTarget={onChangeTradeTarget}
          onScoutProspect={onScoutProspect}
          onSignProspect={onSignProspect}
          onTradePoolSpace={onTradePoolSpace}
          tradeAmount="0.50"
          tradeTarget="bos"
          tradeTargets={tradeTargets}
        />,
      );
    });

    expect(container.textContent).toContain('International Bonus Pool');
    expect(container.textContent).toContain('$4.25M');
    expect(container.textContent).toContain('Dept. Accuracy');
    expect(container.textContent).toContain('Rafael Ortiz');
    expect(container.textContent).toContain('Scout Debate');
    expect(container.textContent).toContain('Updating international reports');
    expect(container.textContent).toContain('Transferred $0.50M of pool space.');

    const tradeTargetSelect = container.querySelector('select') as HTMLSelectElement;
    await act(async () => {
      tradeTargetSelect.value = 'kc';
      tradeTargetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onChangeTradeTarget).toHaveBeenCalledWith('kc');

    const inputs = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];
    const tradeAmountInput = inputs[0] as HTMLInputElement;
    const bonusInput = inputs[1] as HTMLInputElement;
    await act(async () => {
      setInputValue(tradeAmountInput, '0.75');
    });
    expect(onChangeTradeAmount).toHaveBeenCalledWith('0.75');

    await act(async () => {
      setInputValue(bonusInput, '1.50');
    });
    expect(onChangeIFABonus).toHaveBeenCalledWith('1.50');

    const transferButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Transfer');
    const signButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Sign');
    const scoutButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Scout');

    await act(async () => {
      transferButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      signButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      scoutButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onTradePoolSpace).toHaveBeenCalledTimes(1);
    expect(onSignProspect).toHaveBeenCalledTimes(1);
    expect(onScoutProspect).toHaveBeenCalledWith(prospect);
  });
});
