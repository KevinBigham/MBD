import type { GameSnapshot } from '@mbd/contracts';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fallbackGMCareer(snapshot: GameSnapshot): NonNullable<GameSnapshot['narrative']['gmCareer']> {
  return snapshot.narrative.gmCareer ?? {
    careerHistory: [],
    currentTeamId: snapshot.franchise.teamId,
    reputation: 50,
    overallRecord: { wins: 0, losses: 0 },
    championships: 0,
    hiredSeason: snapshot.season,
    firedSeasons: [],
    careerAchievements: [],
    jobSearchActive: false,
    lastFiredReason: null,
  };
}

function winPct(snapshot: GameSnapshot): number {
  const record = fallbackGMCareer(snapshot).overallRecord;
  const total = record.wins + record.losses;
  return total > 0 ? record.wins / total : 0.5;
}

export function calculateDynastyLeaderboardScore(snapshot: GameSnapshot): number {
  const gmCareer = fallbackGMCareer(snapshot);
  const championships = gmCareer.championships;
  const seasons = gmCareer.careerHistory.reduce((sum, entry) => sum + entry.seasons, 0);
  const achievements = snapshot.achievements.unlocked.length;
  const reputation = gmCareer.reputation;
  const score = (
    championships * 40
    + (winPct(snapshot) * 100) * 0.2
    + seasons * 1.5
    + achievements * 6
    + reputation * 0.1
  );
  return clamp(Math.round(score), 1, 9999);
}
