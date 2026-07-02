import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradePackageEvaluationCard from './TradePackageEvaluationCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TradePackageEvaluationCard', () => {
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

  it('renders package value, fairness, and routes submit and clear callbacks', async () => {
    const onClear = vi.fn();
    const onSubmit = vi.fn();

    await act(async () => {
      root.render(
        <TradePackageEvaluationCard
          activeCounterOfferId={null}
          activeNegotiation={false}
          disabledReason="The trade market is closed."
          fairnessRatio={0.49}
          hasOfferingAssets
          hasRequestingAssets
          offerTotal={48.5}
          offeringSummary={[
            { key: 'player:nyy-1', label: 'A. Volpe · SS' },
            { key: 'draft:4:1:nym', label: 'R1 4 · NYM original' },
          ]}
          onClear={onClear}
          onSubmit={onSubmit}
          packageFairness={{ text: 'Fair trade', color: 'text-accent-success' }}
          proposing={false}
          requestTotal={50}
          requestingSummary={[
            { key: 'player:bos-1', label: 'R. Anthony · CF' },
          ]}
          selectedTeam="bos"
          tradeMarketOpen
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Package Evaluation');
    expect(container.textContent).toContain('A. Volpe · SS');
    expect(container.textContent).toContain('R1 4 · NYM original');
    expect(container.textContent).toContain('R. Anthony · CF');
    expect(container.textContent).toContain('48.5');
    expect(container.textContent).toContain('50.0');
    expect(container.textContent).toContain('Fair trade');
    expect(container.textContent).toContain('Start Negotiation');
    expect(container.textContent).toContain('Clear');

    await act(async () => {
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Start Negotiation')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Clear')) as HTMLButtonElement).click();
    });

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });
});
