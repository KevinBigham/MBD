import { describe, expect, it } from 'vitest';
import type { DayOneOpeningPlan } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import {
  buildBullpenPlanFromDepth,
  buildDepthChartGroups,
  buildDepthPlanFromRosterPlan,
  orderPlayersByPlan,
} from './rosterPlanTransforms';

function player(id: string, position: string, displayRating: number): PlayerDTO {
  return {
    id,
    firstName: id,
    lastName: 'Player',
    position,
    displayRating,
    letterGrade: 'B',
  } as PlayerDTO;
}

describe('rosterPlanTransforms', () => {
  it('orders planned players first and keeps remaining players rating-sorted', () => {
    const ordered = orderPlayersByPlan(
      [
        player('low', 'SS', 55),
        player('top', 'SS', 80),
        player('mid', 'SS', 70),
      ],
      ['mid'],
    );

    expect(ordered.map((item) => item.id)).toEqual(['mid', 'top', 'low']);
  });

  it('projects roster plan pitching assignments into depth-plan groups', () => {
    const plan = {
      rotationPlayerIds: ['sp-1', 'sp-2'],
      bullpen: {
        closerId: 'cl-1',
        setupIds: ['rp-setup-1', 'rp-setup-2'],
        longReliefId: 'rp-long',
      },
    } as DayOneOpeningPlan;

    expect(buildDepthPlanFromRosterPlan(plan)).toEqual({
      SP: ['sp-1', 'sp-2'],
      RP: ['rp-long', 'rp-setup-1', 'rp-setup-2'],
      CL: ['cl-1'],
    });
    expect(buildDepthPlanFromRosterPlan(null)).toEqual({});
  });

  it('builds bullpen roles from depth-plan order without reusing rotation arms', () => {
    const roster = [
      player('sp-1', 'SP', 80),
      player('sp-6', 'SP', 74),
      player('cl-1', 'CL', 78),
      player('rp-setup-1', 'RP', 76),
      player('rp-setup-2', 'RP', 75),
      player('rp-depth', 'RP', 60),
    ];

    expect(buildBullpenPlanFromDepth(roster, {
      SP: ['sp-1', 'sp-6'],
      RP: ['rp-setup-2', 'rp-setup-1', 'rp-depth'],
      CL: ['cl-1'],
    }, ['sp-1'])).toEqual({
      closerId: 'cl-1',
      setupIds: ['rp-setup-2', 'rp-setup-1'],
      longReliefId: 'sp-6',
    });
  });

  it('builds display-ready depth chart groups in stable baseball order', () => {
    const groups = buildDepthChartGroups(
      [
        player('rf-1', 'RF', 72),
        player('ss-1', 'SS', 78),
        player('ss-2', 'SS', 80),
        player('sp-1', 'SP', 90),
      ],
      { SS: ['ss-1'] },
    );

    expect(groups.map((group) => group.position)).toEqual(['SS', 'RF', 'SP']);
    expect(groups[0]?.players.map((item) => item.id)).toEqual(['ss-1', 'ss-2']);
    expect(groups[0]?.players[0]).toEqual({
      id: 'ss-1',
      firstName: 'ss-1',
      lastName: 'Player',
      position: 'SS',
      displayRating: 78,
      letterGrade: 'B',
    });
  });
});
