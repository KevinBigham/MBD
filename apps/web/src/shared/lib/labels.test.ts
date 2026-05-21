import { describe, expect, it } from 'vitest';
import {
  categoryLabel,
  divisionLabel,
  humanizeLabel,
  minorLevelLabel,
  momentTypeLabel,
  phaseLabel,
  sourceLabel,
} from './labels';

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

  it('uses curated sports labels for common enum values', () => {
    expect(humanizeLabel('AL_EAST')).toBe('AL East');
    expect(humanizeLabel('AAA')).toBe('AAA');
    expect(humanizeLabel('AA')).toBe('AA');
    expect(humanizeLabel('A_PLUS')).toBe('A+');
    expect(humanizeLabel('league_wire')).toBe('League Wire');
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

describe('domain label helpers', () => {
  it('formats divisions, levels, phases, sources, and categories', () => {
    expect(divisionLabel('AL_EAST')).toBe('AL East');
    expect(minorLevelLabel('A_PLUS')).toBe('A+');
    expect(phaseLabel('spring_training')).toBe('Spring Training');
    expect(sourceLabel('press_conference')).toBe('Press Conference');
    expect(categoryLabel('qualifying_offer')).toBe('Qualifying Offer');
  });
});
