import { describe, expect, it } from 'vitest';
import type { AwardHistoryEntry, PlayerOrigin } from '@mbd/contracts';
import {
  GameRNG,
  createProspectBond,
  generatePlayer,
  getProspectLoyaltyModifier,
  updateProspectBonds,
} from '../src/index.js';

describe('prospect bonds', () => {
  it('creates bonds with a baseline loyalty modifier', () => {
    const bond = createProspectBond('prospect-1', 5, 'A', 'Drafted Round 1, 2025');

    expect(bond).toMatchObject({
      prospectId: 'prospect-1',
      draftedSeason: 5,
      currentLevel: 'A',
      bondStrength: 10,
      loyaltyModifier: 0.1,
    });
  });

  it('increments bond strength for a season in the system and records an mlb debut', () => {
    const player = generatePlayer(new GameRNG(41), 'CF', 'nyy', 'MLB');
    player.id = 'prospect-2';
    const bonds = updateProspectBonds({
      season: 6,
      players: [player],
      prospectBonds: [{
        prospectId: player.id,
        draftedSeason: 5,
        debutSeason: null,
        currentLevel: 'AAA',
        bondStrength: 24,
        milestones: ['Drafted Round 1, 2025'],
        loyaltyModifier: 0.24,
      }],
      seasonStats: new Map([[player.id, { pa: 24 }]]),
      playerOrigins: new Map<string, PlayerOrigin>([[
        player.id,
        {
          playerId: player.id,
          originTeamId: 'nyy',
          acquisitionType: 'draft',
          acquiredSeason: 5,
          draftSeason: 5,
          draftRound: 1,
          draftPickNumber: 8,
          originalGrade: 62,
          bonusAmount: 4.5,
        },
      ]]),
    });

    expect(bonds[0]).toMatchObject({
      debutSeason: 6,
      currentLevel: 'MLB',
      bondStrength: 39,
      loyaltyModifier: 0.39,
    });
    expect(bonds[0]?.milestones).toContain('MLB Debut, 6');
  });

  it('adds all-star loyalty for the original organization only once', () => {
    const player = generatePlayer(new GameRNG(42), 'CF', 'nyy', 'MLB');
    player.id = 'prospect-3';
    const awardHistory: AwardHistoryEntry[] = [
      { season: 7, award: 'All-Star', league: 'MLB', playerId: player.id, teamId: 'nyy', summary: 'All-Star.' },
    ];

    const origin: PlayerOrigin = {
      playerId: player.id,
      originTeamId: 'nyy',
      acquisitionType: 'draft',
      acquiredSeason: 4,
      draftSeason: 4,
      draftRound: 2,
      draftPickNumber: 44,
      originalGrade: 58,
      bonusAmount: 1.9,
    };
    const first = updateProspectBonds({
      season: 7,
      players: [player],
      prospectBonds: [{
        prospectId: player.id,
        draftedSeason: 4,
        debutSeason: 6,
        currentLevel: 'MLB',
        bondStrength: 60,
        milestones: ['MLB Debut, 6'],
        loyaltyModifier: 0.6,
      }],
      awardHistory,
      playerOrigins: new Map([[player.id, origin]]),
    });
    const second = updateProspectBonds({
      season: 7,
      players: [player],
      prospectBonds: first,
      awardHistory,
      playerOrigins: new Map([[player.id, origin]]),
    });

    expect(first[0]?.bondStrength).toBe(70);
    expect(second[0]?.bondStrength).toBe(70);
    expect(getProspectLoyaltyModifier(second[0]!)).toBe(0.7);
  });
});
