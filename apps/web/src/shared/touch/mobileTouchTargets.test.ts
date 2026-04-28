// Vitest executes this CSS contract in Node, while the app tsconfig intentionally
// omits Node globals for runtime code.
// @ts-ignore
import { readFileSync } from 'node:fs';
// @ts-ignore
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

declare const process: { cwd(): string };

const css = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');

describe('mobile touch target CSS contract', () => {
  it('enforces 44px mobile tap targets without disabling zoom', () => {
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toMatch(/min-width:\s*44px/);
    expect(css).toMatch(/touch-action:\s*manipulation/);
    expect(css).not.toContain('user-scalable=no');
  });

  it('keeps form controls at the iOS-safe 16px font floor on mobile', () => {
    expect(css).toMatch(/input:not\(\[type='range'\]\),\s+select:enabled,\s+textarea:enabled/);
    expect(css).toMatch(/font-size:\s*16px/);
  });
});
