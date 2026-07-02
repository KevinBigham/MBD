import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PlayerProfileActionsPanel, { type PendingProfileRosterAction } from './PlayerProfileActionsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type PlayerProfileActionsProps = Parameters<typeof PlayerProfileActionsPanel>[0];

const basePlayer: PlayerProfileActionsProps['player'] = {
  id: 'player-1',
  historical: false,
  position: 'SS',
  rosterStatus: 'AA',
  minorLeagueLevel: 'AA',
  optionYearsUsed: 1,
  isOutOfOptions: false,
};

describe('PlayerProfileActionsPanel', () => {
  let container: HTMLDivElement;
  let root: Root;
  let props: PlayerProfileActionsProps;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    props = {
      player: basePlayer,
      isUserTeamPlayer: true,
      canPromote: true,
      canDemote: false,
      canDfa: true,
      busyAction: null,
      actionState: null,
      pendingRosterAction: null,
      onExtend: vi.fn(),
      onRequestRosterAction: vi.fn(),
      onCancelRosterAction: vi.fn(),
      onConfirmRosterAction: vi.fn(),
    };
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderPanel(overrides: Partial<PlayerProfileActionsProps> = {}) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PlayerProfileActionsPanel {...props} {...overrides} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
  }

  function getButton(label: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes(label));
    expect(button).toBeTruthy();
    return button as HTMLButtonElement;
  }

  it('renders live player actions and delegates user-team callbacks', async () => {
    await renderPanel();

    expect(container.querySelector('a[href="/players/compare?a=player-1"]')).toBeTruthy();
    const shopLink = Array.from(container.querySelectorAll('a')).find((link) => {
      const href = link.getAttribute('href') ?? '';
      return href.includes('/trade?playerId=player-1') && href.includes('mode=quick');
    });
    expect(shopLink).toBeTruthy();
    expect(container.textContent).toContain('Shop Player');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(getButton('Option to Minors').disabled).toBe(true);

    await act(async () => {
      getButton('Extend Contract').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      getButton('Promote to MLB').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      getButton('Designate for Assignment').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onExtend).toHaveBeenCalledTimes(1);
    expect(props.onRequestRosterAction).toHaveBeenCalledWith('promote');
    expect(props.onRequestRosterAction).toHaveBeenCalledWith('dfa');
  });

  it('renders pending roster-action confirmation controls', async () => {
    const pendingRosterAction: PendingProfileRosterAction = {
      action: 'dfa',
      title: 'Designate for Assignment',
      detail: 'SS | MLB | Options used 3 | Out of options',
      consequence: 'This removes the player from your roster picture.',
    };

    await renderPanel({ pendingRosterAction });

    expect(container.textContent).toContain('Confirm Designate for Assignment');
    expect(container.textContent).toContain('This removes the player from your roster picture.');

    await act(async () => {
      getButton('Cancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      getButton('Confirm').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(props.onCancelRosterAction).toHaveBeenCalledTimes(1);
    expect(props.onConfirmRosterAction).toHaveBeenCalledTimes(1);
  });

  it('keeps non-user and historical players read-only', async () => {
    await renderPanel({ isUserTeamPlayer: false });

    expect(container.textContent).toContain('Quick actions are only available for live players on your active club.');
    expect(container.querySelector('a[href="/players/compare?a=player-1"]')).toBeTruthy();
    expect(Array.from(container.querySelectorAll('a')).some((link) => {
      const href = link.getAttribute('href') ?? '';
      return href.includes('/trade?playerId=player-1') && href.includes('mode=quick');
    })).toBe(false);

    await renderPanel({
      isUserTeamPlayer: false,
      player: {
        ...basePlayer,
        id: 'historic-1',
        historical: true,
      },
    });

    expect(container.querySelector('a[href="/players/compare?a=historic-1"]')).toBeFalsy();
    expect(container.textContent).toContain('Quick actions are only available for live players on your active club.');
  });

  it('renders action feedback with the selected tone copy', async () => {
    await renderPanel({
      actionState: {
        tone: 'info',
        message: 'Counteroffer received from the player camp.',
      },
    });

    expect(container.textContent).toContain('Counteroffer received from the player camp.');
    expect(container.querySelector('.text-accent-info')).toBeTruthy();
  });
});
