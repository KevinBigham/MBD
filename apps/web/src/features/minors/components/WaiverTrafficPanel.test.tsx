import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import WaiverTrafficPanel, { type WaiverClaimView } from './WaiverTrafficPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const waiverClaims: WaiverClaimView[] = [
  {
    playerId: 'claim-1',
    playerName: 'Rico Depth',
    fromTeamName: 'Chicago',
    toTeamName: 'New York',
    status: 'pending_claim',
    salary: 4.5,
    priorityIndex: 2,
  },
];

describe('WaiverTrafficPanel', () => {
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

  it('renders waiver claims with humanized status, source club, salary, and priority copy', async () => {
    await act(async () => {
      root.render(<WaiverTrafficPanel waiverClaims={waiverClaims} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Waiver traffic');
    expect(content).toContain('Rico Depth');
    expect(content).toContain('Pending Claim | Chicago');
    expect(content).toContain('$4.5M | Priority 2');
  });

  it('renders the empty waiver movement state', async () => {
    await act(async () => {
      root.render(<WaiverTrafficPanel waiverClaims={[]} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Waiver traffic');
    expect(content).toContain('No recent waiver movement.');
  });
});
