import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useSettingsInstallPrompt } from './useSettingsInstallPrompt';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useSettingsInstallPrompt>[0];
type HookResult = ReturnType<typeof useSettingsInstallPrompt>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useSettingsInstallPrompt(options));
  return null;
}

function createInstallPromptEvent(
  outcome: 'accepted' | 'dismissed',
  prompt = vi.fn().mockResolvedValue(undefined),
): Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
} {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  });
}

describe('useSettingsInstallPrompt', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;
  let onStatusChange: ReturnType<typeof vi.fn>;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    onStatusChange = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: false }),
      configurable: true,
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    Object.defineProperty(window, 'matchMedia', {
      value: originalMatchMedia,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  async function renderHook(options: HookOptions = { onStatusChange }) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  it('captures a browser install prompt and accepts it with status copy', async () => {
    await renderHook();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = createInstallPromptEvent('accepted', prompt);

    await act(async () => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);

    await act(async () => {
      await latestResult?.handleInstallApp();
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(latestResult?.installed).toBe(true);
    expect(onStatusChange).toHaveBeenCalledWith('Install prompt accepted.');
  });

  it('reports unavailable and already-installed states without a prompt', async () => {
    await renderHook();

    await act(async () => {
      await latestResult?.handleInstallApp();
    });

    expect(onStatusChange).toHaveBeenCalledWith('Install prompt not available in this browser yet.');

    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(latestResult?.installed).toBe(true);

    await act(async () => {
      await latestResult?.handleInstallApp();
    });

    expect(onStatusChange).toHaveBeenCalledWith('The app is already installed.');
  });

  it('keeps the app installable when the prompt is dismissed', async () => {
    await renderHook();
    const prompt = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      window.dispatchEvent(createInstallPromptEvent('dismissed', prompt));
    });

    await act(async () => {
      await latestResult?.handleInstallApp();
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(latestResult?.installed).toBe(false);
    expect(onStatusChange).toHaveBeenCalledWith('Install prompt dismissed.');
  });
});
