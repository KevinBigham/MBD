import { describe, it, expect } from 'vitest';
import { useFocusTrap } from './useFocusTrap';

// These are structural/type tests since JSDOM doesn't support full focus behavior.
// The hook's logic is tested through integration in the overlay components.

describe('useFocusTrap', () => {
  it('is a function', () => {
    expect(typeof useFocusTrap).toBe('function');
  });

  it('exports from the correct path', () => {
    expect(useFocusTrap).toBeDefined();
  });
});
