import { describe, expect, it } from 'vitest';
import { humanizeLabel, momentTypeLabel } from './labels';

describe('humanizeLabel', () => {
  it('title-cases a single word', () => {
    expect(humanizeLabel('pennant')).toBe('Pennant');
  });

  it('splits on underscores and title-cases each segment', () => {
    expect(humanizeLabel('playoff_berth')).toBe('Playoff Berth');
  });

  it('drops empty segments from consecutive underscores', () => {
    expect(humanizeLabel('foo__bar')).toBe('Foo Bar');
  });

  it('returns empty string for empty input', () => {
    expect(humanizeLabel('')).toBe('');
  });

  it('lowercases the tail of each segment for uppercase inputs', () => {
    expect(humanizeLabel('HOF_INDUCTION')).toBe('Hof Induction');
  });
});

describe('momentTypeLabel', () => {
  it('returns the curated label for deadline_buyer', () => {
    expect(momentTypeLabel('deadline_buyer')).toBe('Deadline Buyer');
  });

  it('returns the curated label for deadline_seller', () => {
    expect(momentTypeLabel('deadline_seller')).toBe('Deadline Seller');
  });

  it('returns the curated label for championship_run', () => {
    expect(momentTypeLabel('championship_run')).toBe('Championship Run');
  });

  it('returns the curated label for contention_collapse', () => {
    expect(momentTypeLabel('contention_collapse')).toBe('Contention Collapse');
  });

  it('falls back to humanizeLabel for unknown moment types', () => {
    expect(momentTypeLabel('breakout_season')).toBe('Breakout Season');
  });

  it('handles empty input via humanize fallback', () => {
    expect(momentTypeLabel('')).toBe('');
  });
});
