import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AttentionDesk, { type AttentionDeskItem } from './AttentionDesk';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const attentionItems: AttentionDeskItem[] = [
  {
    id: 'roster-health',
    title: 'Roster health needs attention',
    detail: '2 injured, 1 fatigue flag.',
    to: '/roster',
    tone: 'warning',
  },
  {
    id: 'trade-inbox',
    title: 'Trade inbox is active',
    detail: '3 offers waiting for a front-office call.',
    to: '/trade',
    tone: 'info',
  },
];

describe('AttentionDesk', () => {
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

  it('renders decision items with destination links and count badge', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AttentionDesk items={attentionItems} />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Decision Desk');
    expect(container.textContent).toContain('What needs attention');
    expect(container.textContent).toContain('Top 2');
    expect(container.textContent).toContain('Roster health needs attention');
    expect(container.textContent).toContain('2 injured, 1 fatigue flag.');
    expect(container.textContent).toContain('Trade inbox is active');
    expect(container.textContent).toContain('3 offers waiting for a front-office call.');

    const links = Array.from(container.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/roster', '/trade']);
  });

  it('applies tone classes to attention cards', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AttentionDesk items={attentionItems} />
        </MemoryRouter>,
      );
    });

    const links = Array.from(container.querySelectorAll('a'));
    expect(links[0]?.className).toContain('border-accent-warning/40');
    expect(links[0]?.className).toContain('text-accent-warning');
    expect(links[1]?.className).toContain('border-accent-info/40');
    expect(links[1]?.className).toContain('text-accent-info');
  });
});
