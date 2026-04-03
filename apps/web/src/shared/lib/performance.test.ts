import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearPerformanceMetrics,
  getLatestPerformanceMetric,
  measureAsyncOperation,
} from './performance';

describe('performance helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearPerformanceMetrics();
  });

  it('records the latest duration for an async operation', async () => {
    const nowSpy = vi.spyOn(globalThis.performance, 'now');
    nowSpy.mockReturnValueOnce(10).mockReturnValueOnce(35);

    await measureAsyncOperation('worker.simMonth', async () => 'ok');

    expect(getLatestPerformanceMetric('worker.simMonth')).toEqual({
      durationMs: 25,
      budgetMs: null,
      overBudget: false,
    });
  });

  it('warns when an async operation exceeds its budget', async () => {
    const nowSpy = vi.spyOn(globalThis.performance, 'now');
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(615);
    const warn = vi.fn();

    await measureAsyncOperation('save.write', async () => 'ok', {
      budgetMs: 500,
      logger: { warn },
    });

    expect(warn).toHaveBeenCalledWith(
      '[performance] save.write took 615ms (budget 500ms)',
    );
    expect(getLatestPerformanceMetric('save.write')).toEqual({
      durationMs: 615,
      budgetMs: 500,
      overBudget: true,
    });
  });
});
