import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestBrowserDownload } from './browserDownload';

describe('requestBrowserDownload', () => {
  let anchor: HTMLAnchorElement;
  let click: ReturnType<typeof vi.fn>;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let originalCreateObjectURL: PropertyDescriptor | undefined;
  let originalRevokeObjectURL: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalCreateObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'createObjectURL');
    originalRevokeObjectURL = Object.getOwnPropertyDescriptor(window.URL, 'revokeObjectURL');
    anchor = document.createElement('a');
    click = vi.fn();
    anchor.click = click;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    createObjectURL = vi.fn(() => 'blob:active-save-backup');
    revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCreateObjectURL) {
      Object.defineProperty(window.URL, 'createObjectURL', originalCreateObjectURL);
    } else {
      Reflect.deleteProperty(window.URL, 'createObjectURL');
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(window.URL, 'revokeObjectURL', originalRevokeObjectURL);
    } else {
      Reflect.deleteProperty(window.URL, 'revokeObjectURL');
    }
  });

  it('dispatches one explicit JSON download request with the requested filename', () => {
    requestBrowserDownload({
      filename: 'mbd-save-slot-1-pending-2.json',
      payload: '{"kind":"mbd-save-export"}',
    });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe('application/json');
    expect(blob.size).toBeGreaterThan(0);
    expect(anchor.href).toBe('blob:active-save-backup');
    expect(anchor.download).toBe('mbd-save-slot-1-pending-2.json');
    expect(anchor.rel).toBe('noopener');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:active-save-backup');
  });

  it('revokes the object URL and preserves the click error when the request cannot start', () => {
    click.mockImplementation(() => {
      throw new Error('Download blocked');
    });

    expect(() => requestBrowserDownload({
      filename: 'backup.json',
      payload: '{}',
    })).toThrow('Download blocked');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:active-save-backup');
  });

  it('fails honestly when the browser download API is unavailable', () => {
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: undefined,
    });

    expect(() => requestBrowserDownload({
      filename: 'backup.json',
      payload: '{}',
    })).toThrow('Browser downloads are unavailable');
    expect(click).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});
