import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  generateDraftBuzz,
  generateDraftCommentary,
  generateDraftGrades,
  generateDraftPickPreview,
  type DraftNarrativeCurrentPick,
  type DraftNarrativePick,
  type DraftNarrativeProspect,
} from '../src/index.js';

const availableProspects: DraftNarrativeProspect[] = [
  {
    id: 'prospect-1',
    name: 'Jace Sullivan',
    position: 'SS',
    scoutingGrade: 63,
    consensusGrade: 59,
    slotValue: 3.1,
    askBonus: 3.0,
    bigBoardRank: 1,
    age: 18,
    origin: 'High School',
    background: 'high_school',
  },
  {
    id: 'prospect-2',
    name: 'Leo Mercer',
    position: 'SP',
    scoutingGrade: 60,
    consensusGrade: 58,
    slotValue: 3.0,
    askBonus: 3.6,
    bigBoardRank: 2,
    age: 21,
    origin: 'College',
    background: 'college_underclass',
  },
  {
    id: 'prospect-3',
    name: 'Tomas Velez',
    position: 'CF',
    scoutingGrade: 56,
    consensusGrade: 55,
    slotValue: 2.5,
    askBonus: 2.6,
    bigBoardRank: 5,
    age: 20,
    origin: 'College',
    background: 'college_senior',
  },
];

const visiblePicks: DraftNarrativePick[] = [
  {
    round: 1,
    pickNumber: 1,
    teamId: 'bos',
    teamName: 'Boston Noreasters',
    teamAbbreviation: 'BOS',
    playerId: 'bos-1',
    playerName: 'Mason Vale',
    position: 'SP',
    scoutingGrade: 57,
    origin: 'College',
    tone: 'division_rival',
  },
  {
    round: 1,
    pickNumber: 2,
    teamId: 'nym',
    teamName: 'New York Tycoons',
    teamAbbreviation: 'NYT',
    playerId: 'nyy-1',
    playerName: 'Eli Prospect',
    position: 'SS',
    scoutingGrade: 62,
    origin: 'High School',
    tone: 'user',
  },
  {
    round: 1,
    pickNumber: 3,
    teamId: 'orl',
    teamName: 'Orlando Thunder',
    teamAbbreviation: 'ORL',
    playerId: 'tb-1',
    playerName: 'Noah Closer',
    position: 'RP',
    scoutingGrade: 52,
    origin: 'College',
    tone: 'division_rival',
  },
];

const currentPick: DraftNarrativeCurrentPick = {
  round: 1,
  pickNumber: 4,
  totalPicks: 64,
  teamId: 'nym',
  teamName: 'New York Tycoons',
  teamAbbreviation: 'NYT',
  userOnClock: true,
};

describe('draft narrative builders', () => {
  it('generates deterministic commentary and buzz from a stable seed', () => {
    const build = () => ({
      commentary: generateDraftCommentary(new GameRNG(91), {
        totalPicks: 64,
        visiblePicks,
        currentPick,
        availableProspects,
      }),
      buzz: generateDraftBuzz(new GameRNG(91), {
        visiblePicks,
        currentPick,
        availableProspects,
      }),
    });

    const first = build();
    const second = build();

    expect(first).toEqual(second);
    expect(first.commentary.length).toBeGreaterThanOrEqual(4);
    expect(first.commentary.at(-1)?.headline).toContain('NYT');
    expect(first.buzz.some((item) => item.label === 'Value Slide' && item.summary.includes('Jace Sullivan'))).toBe(true);
  });

  it('builds previews and post-draft grades deterministically', () => {
    const preview = generateDraftPickPreview(new GameRNG(44), {
      prospect: availableProspects[0]!,
      currentPick,
      teamName: 'New York Tycoons',
    });

    expect(preview.playerId).toBe('prospect-1');
    expect(preview.summary).toContain('Jace Sullivan');
    expect(preview.recommendation).toBe('hover');
    expect(preview.signability).toContain('$3.00M');

    const grades = generateDraftGrades(new GameRNG(44), {
      completedPicks: [
        ...visiblePicks,
        {
          round: 2,
          pickNumber: 34,
          teamId: 'nym',
          teamName: 'New York Tycoons',
          teamAbbreviation: 'NYT',
          playerId: 'nyy-2',
          playerName: 'Drew Calder',
          position: 'C',
          scoutingGrade: 58,
          origin: 'College',
          tone: 'user',
        },
        {
          round: 2,
          pickNumber: 33,
          teamId: 'bos',
          teamName: 'Boston Noreasters',
          teamAbbreviation: 'BOS',
          playerId: 'bos-2',
          playerName: 'Kade Benton',
          position: '1B',
          scoutingGrade: 49,
          origin: 'College',
          tone: 'division_rival',
        },
      ],
      totalPicks: 64,
    });

    expect(grades[0]?.teamId).toBe('nym');
    expect(grades[0]?.grade).toBe('C');
    expect(grades[0]?.summary).toContain('New York Tycoons');
  });
});
