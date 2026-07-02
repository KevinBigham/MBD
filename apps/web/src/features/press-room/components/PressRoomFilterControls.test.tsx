import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import PressRoomFilterControls from './PressRoomFilterControls';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('PressRoomFilterControls', () => {
  it('renders filter options and delegates mark-read/filter changes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onMarkAllRead = vi.fn();
    const onSelectTeam = vi.fn();
    const onSelectCategory = vi.fn();
    const onSelectTag = vi.fn();

    await act(async () => {
      root.render(
        <PressRoomFilterControls
          categoryOptions={['trade', 'owner']}
          onMarkAllRead={onMarkAllRead}
          onSelectCategory={onSelectCategory}
          onSelectTag={onSelectTag}
          onSelectTeam={onSelectTeam}
          selectedCategory="all"
          selectedTag="all"
          selectedTeam="all"
          teamOptions={['nym', 'bos']}
        />,
      );
    });

    expect(container.textContent).toContain('Mark All Read');
    expect(container.textContent).toContain('All teams');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('Trade');
    expect(container.textContent).toContain('Owner');
    expect(container.textContent).toContain('BREAKING');

    const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
    const markAllReadButton = container.querySelector('button')!;

    await act(async () => {
      markAllReadButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      selects[0]!.value = 'bos';
      selects[0]!.dispatchEvent(new Event('change', { bubbles: true }));
      selects[1]!.value = 'trade';
      selects[1]!.dispatchEvent(new Event('change', { bubbles: true }));
      selects[2]!.value = 'WATCH';
      selects[2]!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(onSelectTeam).toHaveBeenCalledWith('bos');
    expect(onSelectCategory).toHaveBeenCalledWith('trade');
    expect(onSelectTag).toHaveBeenCalledWith('WATCH');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
