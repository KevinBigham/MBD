import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsSection from './SettingsSection';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('SettingsSection', () => {
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

  it('renders an expanded settings section and delegates collapse toggles', async () => {
    const onToggle = vi.fn();

    await act(async () => {
      root.render(
        <SettingsSection
          title="Data / Install"
          description="Manage save data."
          open={true}
          onToggle={onToggle}
        >
          <p>Save controls</p>
        </SettingsSection>,
      );
    });

    const toggle = container.querySelector('button');
    expect(container.textContent).toContain('Data / Install');
    expect(container.textContent).toContain('Manage save data.');
    expect(container.textContent).toContain('Save controls');
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('hides section body content when collapsed', async () => {
    await act(async () => {
      root.render(
        <SettingsSection
          title="Diagnostics"
          description="Runtime diagnostics."
          open={false}
          onToggle={() => undefined}
        >
          <p>Hidden diagnostics</p>
        </SettingsSection>,
      );
    });

    const toggle = container.querySelector('button');
    expect(container.textContent).toContain('Diagnostics');
    expect(container.textContent).not.toContain('Hidden diagnostics');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
  });
});
