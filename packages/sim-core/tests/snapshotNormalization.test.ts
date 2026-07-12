import { describe, expect, it } from 'vitest';
import { parseGameSnapshot } from '@mbd/contracts';
import snapshotFixture from '../../contracts/tests/fixtures/save/v34/core.json';
import {
  materializeSimulationImportDefaults,
  TEAMS,
} from '../src/index.js';

describe('simulation import snapshot materialization', () => {
  it('adds only the deterministic career and neutral relationship defaults', () => {
    const accepted = parseGameSnapshot(snapshotFixture);
    const materialized = materializeSimulationImportDefaults(accepted);

    expect(materialized.narrative.gmCareer).toBeDefined();
    expect(materialized.narrative.gmRelationships).toHaveLength(TEAMS.length - 1);
    expect(materialized.narrative.gmRelationships.map(([teamId]) => teamId))
      .toEqual(TEAMS.filter((team) => team.id !== accepted.userTeamId).map((team) => team.id));
    expect(materialized).toEqual({
      ...accepted,
      narrative: {
        ...accepted.narrative,
        gmCareer: materialized.narrative.gmCareer,
        gmRelationships: materialized.narrative.gmRelationships,
      },
    });
    expect(materialized.rng).toEqual(accepted.rng);
  });

  it('preserves present facts and is idempotent', () => {
    const first = materializeSimulationImportDefaults(parseGameSnapshot(snapshotFixture));
    const career = { ...first.narrative.gmCareer!, reputation: 73 };
    const relationships = [[
      'bos',
      { targetTeamId: 'bos', score: 18, tradeHistory: [], lastInteractionSeason: 2 },
    ]] as typeof first.narrative.gmRelationships;
    const populated = parseGameSnapshot({
      ...first,
      narrative: { ...first.narrative, gmCareer: career, gmRelationships: relationships },
    });

    const materialized = materializeSimulationImportDefaults(populated);
    expect(materialized.narrative.gmCareer).toEqual(career);
    expect(materialized.narrative.gmRelationships).toEqual(relationships);
    expect(materializeSimulationImportDefaults(materialized)).toEqual(materialized);
  });
});
