import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import PressRoomSummaryCards from './PressRoomSummaryCards';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('PressRoomSummaryCards', () => {
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

  it('renders archive, unread, and scouting counts without route hooks', async () => {
    await act(async () => {
      root.render(
        <PressRoomSummaryCards
          feedCount={12}
          scoutingCount={4}
          unreadCount={3}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Archive Size');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('Unread Queue');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Scouting Desk');
    expect(container.textContent).toContain('4');
  });
});
