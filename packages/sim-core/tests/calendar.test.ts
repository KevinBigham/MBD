import { describe, expect, it } from 'vitest';
import {
  getDaysUntilTradeDeadline,
  getTradeDeadlineDay,
  isTradeDeadlineModeDay,
} from '../src/index.js';

describe('trade deadline calendar helpers', () => {
  it('anchors the deadline to the final day of July', () => {
    expect(getTradeDeadlineDay()).toBe(122);
  });

  it('treats July as the active deadline mode window', () => {
    expect(isTradeDeadlineModeDay(91)).toBe(false);
    expect(isTradeDeadlineModeDay(92)).toBe(true);
    expect(isTradeDeadlineModeDay(122)).toBe(true);
    expect(isTradeDeadlineModeDay(123)).toBe(false);
  });

  it('counts down to the deadline and clamps after it passes', () => {
    expect(getDaysUntilTradeDeadline(118)).toBe(4);
    expect(getDaysUntilTradeDeadline(122)).toBe(0);
    expect(getDaysUntilTradeDeadline(130)).toBe(0);
  });
});
