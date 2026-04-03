export const SIM_MONTH_BENCHMARK_MS = 2_000;
export const SAVE_IO_BUDGET_MS = 500;

export interface PerformanceMetric {
  durationMs: number;
  budgetMs: number | null;
  overBudget: boolean;
}

const latestMetrics = new Map<string, PerformanceMetric>();

function getNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

export async function measureAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>,
  options: {
    budgetMs?: number;
    logger?: Pick<Console, 'warn'>;
  } = {},
): Promise<T> {
  const { budgetMs, logger = console } = options;
  const start = getNow();

  try {
    return await operation();
  } finally {
    const durationMs = Number((getNow() - start).toFixed(2));
    const overBudget = budgetMs != null && durationMs > budgetMs;

    latestMetrics.set(name, {
      durationMs,
      budgetMs: budgetMs ?? null,
      overBudget,
    });

    if (overBudget) {
      logger.warn(
        `[performance] ${name} took ${durationMs}ms (budget ${budgetMs}ms)`,
      );
    }
  }
}

export function getLatestPerformanceMetric(name: string): PerformanceMetric | null {
  return latestMetrics.get(name) ?? null;
}

export function clearPerformanceMetrics(): void {
  latestMetrics.clear();
}
