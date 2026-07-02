import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DeadlineEventRow, { type DeadlineEvent } from './DeadlineEventRow';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DeadlineEventRow', () => {
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

  async function renderRow(event: DeadlineEvent) {
    await act(async () => {
      root.render(<DeadlineEventRow event={event} />);
    });
  }

  it('renders deadline event label, day, urgency, and description', async () => {
    await renderRow({
      id: 'event-1',
      type: 'buzzer_beater_trade',
      day: 104,
      description: 'Boston completed a buzzer-beater deal for a closer.',
      involvedTeamIds: ['bos', 'sea'],
      involvedPlayerIds: ['player-1'],
      urgency: 5,
      isPublic: true,
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Buzzer Beater');
    expect(text).toContain('Day 104');
    expect(text).toContain('Boston completed a buzzer-beater deal');
    expect(text).toContain('5/5');
    expect(container.innerHTML).toContain('text-accent-success');
  });
});
