import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeResultBanner, { type TradeResultView } from './TradeResultBanner';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TradeResultBanner', () => {
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

  it('renders accepted, counter, and declined result headlines', async () => {
    const renderResult = async (result: TradeResultView) => {
      await act(async () => {
        root.render(<TradeResultBanner result={result} />);
        await Promise.resolve();
      });
    };

    await renderResult({ status: 'accepted', message: 'Deal is complete.' });
    expect(container.textContent).toContain('Deal Completed');
    expect(container.textContent).toContain('Deal is complete.');

    await renderResult({ status: 'counter', message: 'Adjust the package below.' });
    expect(container.textContent).toContain('Trade Talks Continue');
    expect(container.textContent).toContain('Adjust the package below.');

    await renderResult({ status: 'declined', message: 'The room walked away.' });
    expect(container.textContent).toContain('Talks Broke Down');
    expect(container.textContent).toContain('The room walked away.');
  });

  it('renders negotiation review evidence when present', async () => {
    await act(async () => {
      root.render(
        <TradeResultBanner
          result={{
            status: 'rejected',
            message: 'Boston is not there yet.',
            review: {
              fairnessScore: 7.25,
              rosterValid: false,
              rosterIssues: ['Boston would exceed the 40-man roster limit.', 'New York needs an active catcher.'],
              narrative: 'Boston likes the headliner but sees roster friction.',
            },
          }}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Talks Broke Down');
    expect(container.textContent).toContain('Boston is not there yet.');
    expect(container.textContent).toContain('Negotiation Review');
    expect(container.textContent).toContain('Fairness 7.3');
    expect(container.textContent).toContain('Roster check: Needs attention');
    expect(container.textContent).toContain('Boston would exceed the 40-man roster limit.');
    expect(container.textContent).toContain('New York needs an active catcher.');
    expect(container.textContent).toContain('Boston likes the headliner but sees roster friction.');
    expect(container.textContent).toContain('Why the GM reacted this way');
    expect(container.textContent).toContain('Value');
    expect(container.textContent).toContain('Age / control / contract');
    expect(container.textContent).toContain('Roster legality');
    expect(container.textContent).toContain('Budget');
    expect(container.textContent).toContain('GM personality');
    expect(container.textContent).toContain('Relationship');
    expect(container.textContent).toContain('Market phase');
  });
});
