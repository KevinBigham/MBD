/**
 * Dev-only logger. All output is silenced in production builds.
 * Vite statically replaces import.meta.env.DEV, so dead-code
 * elimination removes the log calls entirely from the bundle.
 */

const IS_DEV = (import.meta as unknown as { env: { DEV: boolean } }).env.DEV;

/* eslint-disable no-console */

export const logger = {
  error(...args: unknown[]): void {
    if (IS_DEV) console.error(...args);
  },
  warn(...args: unknown[]): void {
    if (IS_DEV) console.warn(...args);
  },
  info(...args: unknown[]): void {
    if (IS_DEV) console.info(...args);
  },
} as const;
