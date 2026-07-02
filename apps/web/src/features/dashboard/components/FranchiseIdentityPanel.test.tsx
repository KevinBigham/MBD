import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import FranchiseIdentityPanel from './FranchiseIdentityPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FranchiseIdentityPanel', () => {
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

  it('renders franchise identity, standing context, and live dashboard meters', async () => {
    await act(async () => {
      root.render(
        <FranchiseIdentityPanel
          division="AL_WEST"
          divisionRank={2}
          dynastyGrade="B+"
          dynastyScore={142}
          fanSentimentScore={72.4}
          fanSentimentSummary="Fans are buying in"
          fanSentimentTrend="rising"
          gmName="Kevin"
          ownerMeterValue={67.6}
          ownerSummary="Ownership trusts the plan"
          record="88-74"
          season={3}
          teamId="kc"
          teamName="Kansas City Fire"
        />,
      );
    });

    expect(container.textContent).toContain('Franchise Identity');
    expect(container.textContent).toContain('Kansas City Fire');
    expect(container.textContent).toContain('GM Kevin');
    expect(container.textContent).toContain('Season 3');
    expect(container.textContent).toContain('88-74');
    expect(container.textContent).toContain('AL West · 2 place');
    expect(container.textContent).toContain('Dynasty');
    expect(container.textContent).toContain('B+');
    expect(container.textContent).toContain('142 pts');
    expect(container.textContent).toContain('Fan Mood');
    expect(container.textContent).toContain('72');
    expect(container.textContent).toContain('Fans are buying in');
    expect(container.textContent).toContain('Owner Heat');
    expect(container.textContent).toContain('68');
    expect(container.textContent).toContain('Ownership trusts the plan');
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('KC logo');
  });

  it('renders no logo without a team id and applies warning tones to falling fans and hot-seat owners', async () => {
    await act(async () => {
      root.render(
        <FranchiseIdentityPanel
          division="Division"
          divisionRank={1}
          dynastyGrade="F"
          dynastyScore={0}
          fanSentimentScore={35.2}
          fanSentimentSummary="Fans are restless"
          fanSentimentTrend="falling"
          gmName="General Manager"
          ownerMeterValue={28}
          ownerSummary="Ownership is losing patience"
          record="0-0"
          season={1}
          teamId={null}
          teamName="Front Office"
        />,
      );
    });

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('Front Office');
    expect(container.textContent).toContain('Division · 1 place');

    const fanScore = Array.from(container.querySelectorAll('div')).find((node) => node.textContent === '35');
    expect(fanScore?.className).toContain('text-accent-danger');

    const ownerMeter = Array.from(container.querySelectorAll('div')).find((node) => (node as HTMLElement).style.width === '28%');
    expect(ownerMeter?.className).toContain('bg-accent-danger');
  });
});
