import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import InternationalProspectReportPanel from './InternationalProspectReportPanel';
import type { IFAPoolView, IFAReportView } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
  prospects: [],
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
    ],
    outcomeSummary: 'Analytics eventually narrowed the risk band.',
  },
};

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('InternationalProspectReportPanel', () => {
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

  it('renders selected prospect grades, WAR context, conflict evidence, and bonus controls', async () => {
    const onChangeIFABonus = vi.fn();
    const onSignProspect = vi.fn();

    await act(async () => {
      root.render(
        <InternationalProspectReportPanel
          ifaBonus="1.25"
          ifaPool={pool}
          ifaReport={report}
          onChangeIFABonus={onChangeIFABonus}
          onSignProspect={onSignProspect}
        />,
      );
    });

    expect(container.textContent).toContain('Selected Prospect');
    expect(container.textContent).toContain('Rafael Ortiz');
    expect(container.textContent).toContain('SS | Age 17 | Dominican Republic / Dominican Republic');
    expect(container.textContent).toContain('Target $1.25M');
    expect(container.textContent).toContain('Contact');
    expect(container.textContent).toContain('WAR Ceiling');
    expect(container.textContent).toContain('Scout Debate');
    expect(container.textContent).toContain('Analytics eventually narrowed the risk band.');

    const input = container.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, '1.50');
    });
    expect(onChangeIFABonus).toHaveBeenCalledWith('1.50');

    const signButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Sign',
    ) as HTMLButtonElement;
    await act(async () => {
      signButton.click();
    });
    expect(onSignProspect).toHaveBeenCalledTimes(1);
  });

  it('renders no-report and closed-window states without firing sign actions', async () => {
    const onSignProspect = vi.fn();

    await act(async () => {
      root.render(
        <InternationalProspectReportPanel
          ifaBonus="1.25"
          ifaPool={{ ...pool, signingWindowOpen: false }}
          ifaReport={null}
          onChangeIFABonus={vi.fn()}
          onSignProspect={onSignProspect}
        />,
      );
    });

    expect(container.textContent).toContain('Scout a prospect from the table to reveal your report and set a bonus offer.');
    expect(container.querySelector('button')).toBeNull();

    await act(async () => {
      root.render(
        <InternationalProspectReportPanel
          ifaBonus="1.25"
          ifaPool={{ ...pool, signingWindowOpen: false }}
          ifaReport={report}
          onChangeIFABonus={vi.fn()}
          onSignProspect={onSignProspect}
        />,
      );
    });

    const signButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Sign',
    ) as HTMLButtonElement;
    expect(signButton.disabled).toBe(true);
    await act(async () => {
      signButton.click();
    });
    expect(onSignProspect).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Signing opens during the dedicated international phase of the offseason.');
  });
});
