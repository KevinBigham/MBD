import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeBuilderContextPanel, { type RelationshipView } from './TradeBuilderContextPanel';
import type { TradeDialogueView } from './tradePresentation';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const relationship: RelationshipView = {
  teamId: 'bos',
  teamName: 'Boston Noreasters',
  teamAbbreviation: 'BOS',
  score: 82,
  tier: 'trusted',
  tooltip: 'Boston trusts this room after recent fair dealing.',
  lastInteractionSeason: 4,
  lastEventLabel: 'Accepted Counter',
  latestMemoryDescription: 'Boston remembers a fair deadline counter.',
};

const dialogue: TradeDialogueView = {
  mode: 'buyer',
  urgency: 'high',
  headline: 'Boston wants a premium bat before the room closes.',
  lines: [
    'We are buying, but we need the package to respect our 40-man shape.',
    'Add one useful near-MLB piece and we can keep talking.',
  ],
};

describe('TradeBuilderContextPanel', () => {
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

  it('renders builder context and routes target team actions', async () => {
    const onOpenMultiTeamBuilder = vi.fn();
    const onSelectTeam = vi.fn();

    await act(async () => {
      root.render(
        <TradeBuilderContextPanel
          activeCounterOfferId={null}
          disabledReason="The deadline has passed."
          gmDialogue={dialogue}
          onOpenMultiTeamBuilder={onOpenMultiTeamBuilder}
          onSelectTeam={onSelectTeam}
          otherTeams={[
            { id: 'bos', abbr: 'BOS', name: 'Boston Noreasters' },
            { id: 'sea', abbr: 'SEA', name: 'Seattle Drizzle' },
          ]}
          relationshipsByTeamId={new Map([['bos', relationship]])}
          selectedRelationship={relationship}
          selectedTeam="bos"
          tradeMarketOpen
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Trade Builder');
    expect(container.textContent).toContain('Direct proposal to another front office');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('Trusted');
    expect(container.textContent).toContain('BOS · Boston Noreasters');
    expect(container.textContent).toContain('Boston remembers a fair deadline counter.');
    expect(container.textContent).toContain('Seattle Drizzle');
    expect(container.textContent).toContain('No trade memory logged');
    expect(container.textContent).toContain('GM personality and memory');
    expect(container.textContent).toContain('Boston Noreasters front office: Trusted room');
    expect(container.textContent).toContain('Accepted Counter · S4');
    expect(container.textContent).toContain('Negotiation Flow');
    expect(container.textContent).toContain('Buyer');
    expect(container.textContent).toContain('Boston wants a premium bat');
    expect(container.textContent).toContain('Add one useful near-MLB piece');

    await act(async () => {
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('3+ Team Trade')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('SEA · Seattle Drizzle')) as HTMLButtonElement).click();
      const select = container.querySelector('select') as HTMLSelectElement;
      select.value = 'bos';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onOpenMultiTeamBuilder).toHaveBeenCalledOnce();
    expect(onSelectTeam).toHaveBeenCalledWith('sea');
    expect(onSelectTeam).toHaveBeenCalledWith('bos');
  });

  it('renders counter-offer copy and disables multi-team action when the market is closed', async () => {
    const onOpenMultiTeamBuilder = vi.fn();

    await act(async () => {
      root.render(
        <TradeBuilderContextPanel
          activeCounterOfferId="offer-1"
          disabledReason="Formal offers unlock on Opening Day."
          gmDialogue={null}
          onOpenMultiTeamBuilder={onOpenMultiTeamBuilder}
          onSelectTeam={vi.fn()}
          otherTeams={[{ id: 'bos', abbr: 'BOS', name: 'Boston Noreasters' }]}
          relationshipsByTeamId={new Map()}
          selectedRelationship={null}
          selectedTeam=""
          tradeMarketOpen={false}
        />,
      );
      await Promise.resolve();
    });

    const multiTeamButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('3+ Team Trade')) as HTMLButtonElement;
    expect(container.textContent).toContain('Counter Offer Builder');
    expect(container.textContent).toContain('Loaded from trade inbox');
    expect(multiTeamButton.disabled).toBe(true);
    expect(multiTeamButton.title).toBe('Formal offers unlock on Opening Day.');

    await act(async () => {
      multiTeamButton.click();
    });

    expect(onOpenMultiTeamBuilder).not.toHaveBeenCalled();
  });
});
