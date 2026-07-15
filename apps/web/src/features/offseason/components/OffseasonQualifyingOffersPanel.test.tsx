import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  OffseasonQualifyingOffersPanel,
  type QualifyingOfferEligibleView,
} from './OffseasonQualifyingOffersPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const candidates: QualifyingOfferEligibleView[] = [
  {
    playerId: 'qo-1',
    playerName: 'Victor Veteran',
    projectedMarketValue: 24.8,
    qualifyingOfferSalary: 21.4,
    serviceYears: 6,
  },
];

describe('OffseasonQualifyingOffersPanel', () => {
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
    vi.clearAllMocks();
  });

  it('renders qualifying offer candidates and delegates issue/resolve actions', async () => {
    const onIssue = vi.fn();
    const onResolve = vi.fn();

    await act(async () => {
      root.render(
        <OffseasonQualifyingOffersPanel
          eligible={candidates}
          qualifyingOfferSalary={21.4}
          results={[]}
          active
          advancing={false}
          onIssue={onIssue}
          onResolve={onResolve}
        />,
      );
    });

    expect(container.textContent).toContain('Qualifying Offers');
    expect(container.textContent).toContain('Salary line $21.40M');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Victor Veteran');
    expect(container.textContent).toContain('$24.8M');
    expect(container.textContent).toContain('Service');

    const issueButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Issue QO'),
    );
    const resolveButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Resolve Offers'),
    );

    expect(issueButton?.getAttribute('data-mobile-critical-control')).toBe('offseason-issue-qo');
    expect(resolveButton?.getAttribute('data-mobile-critical-control')).toBe('offseason-resolve-qos');
    expect(resolveButton?.hasAttribute('disabled')).toBe(true);

    await act(async () => {
      issueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onIssue).toHaveBeenCalledWith('qo-1');
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('renders an empty state and fallback salary line', async () => {
    await act(async () => {
      root.render(
        <OffseasonQualifyingOffersPanel
          eligible={[]}
          qualifyingOfferSalary={null}
          results={[]}
          active
          advancing
          onIssue={vi.fn()}
          onResolve={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Salary line --');
    expect(container.textContent).toContain('No qualifying-offer files are eligible this offseason.');
    for (const button of container.querySelectorAll('button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
    }
  });

  it('shows recorded outcomes and resolves only while an offer is pending', async () => {
    const onResolve = vi.fn();
    await act(async () => {
      root.render(
        <OffseasonQualifyingOffersPanel
          eligible={candidates}
          qualifyingOfferSalary={21.4}
          results={[{
            playerId: 'qo-1',
            teamId: 'chi',
            amount: 21.4,
            status: 'offered',
            signingTeamId: null,
            compensationPickId: null,
            compensationTier: null,
            forfeitedPick: null,
          }]}
          active
          advancing={false}
          onIssue={vi.fn()}
          onResolve={onResolve}
        />,
      );
    });

    expect(container.textContent).toContain('offered');
    expect(container.textContent).toContain('QO Recorded');
    const resolveButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Resolve Offers'),
    );
    expect(resolveButton?.hasAttribute('disabled')).toBe(false);
    await act(async () => {
      resolveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('shows result-only players beside remaining eligible files and keeps history read-only after the phase', async () => {
    const onIssue = vi.fn();
    const onResolve = vi.fn();
    await act(async () => {
      root.render(
        <OffseasonQualifyingOffersPanel
          eligible={candidates}
          qualifyingOfferSalary={21.4}
          results={[{
            playerId: 'qo-2',
            playerName: 'Rafael Result',
            teamId: 'chi',
            amount: 21.4,
            status: 'accepted',
            signingTeamId: null,
            compensationPickId: null,
            compensationTier: null,
            forfeitedPick: null,
          }]}
          active={false}
          advancing={false}
          onIssue={onIssue}
          onResolve={onResolve}
        />,
      );
    });

    expect(container.textContent).toContain('Victor Veteran');
    expect(container.textContent).toContain('Rafael Result');
    expect(container.textContent).toContain('accepted');
    for (const button of container.querySelectorAll('button')) {
      expect(button.hasAttribute('disabled')).toBe(true);
    }
  });
});
