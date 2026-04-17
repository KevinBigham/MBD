export interface RegularSeasonMonth {
  month: number;
  key: 'APRIL' | 'MAY' | 'JUNE' | 'JULY' | 'AUGUST' | 'SEPTEMBER';
  label: string;
  startDay: number;
  endDay: number;
}

export const REGULAR_SEASON_DAYS = 186;

export const REGULAR_SEASON_MONTHS: readonly RegularSeasonMonth[] = [
  { month: 4, key: 'APRIL', label: 'April', startDay: 1, endDay: 30 },
  { month: 5, key: 'MAY', label: 'May', startDay: 31, endDay: 61 },
  { month: 6, key: 'JUNE', label: 'June', startDay: 62, endDay: 91 },
  { month: 7, key: 'JULY', label: 'July', startDay: 92, endDay: 122 },
  { month: 8, key: 'AUGUST', label: 'August', startDay: 123, endDay: 153 },
  { month: 9, key: 'SEPTEMBER', label: 'September', startDay: 154, endDay: 186 },
] as const;

const JULY_MONTH = REGULAR_SEASON_MONTHS.find((entry) => entry.key === 'JULY')!;
const MONTHLY_OFF_DAY_ORDINALS = [7, 14, 21, 28] as const;
const REGULAR_SEASON_OFF_DAY_SET = new Set<number>(
  REGULAR_SEASON_MONTHS.flatMap((month) =>
    MONTHLY_OFF_DAY_ORDINALS
      .map((ordinal) => month.startDay + ordinal - 1)
      .filter((day) => day <= month.endDay),
  ),
);
const REGULAR_SEASON_GAME_DAY_LIST = Array.from(
  { length: REGULAR_SEASON_DAYS },
  (_, index) => index + 1,
).filter((day) => !REGULAR_SEASON_OFF_DAY_SET.has(day));

export function getRegularSeasonMonthForDay(day: number): RegularSeasonMonth {
  const normalizedDay = Math.max(1, Math.min(REGULAR_SEASON_DAYS, day));
  return REGULAR_SEASON_MONTHS.find((entry) => normalizedDay >= entry.startDay && normalizedDay <= entry.endDay)
    ?? REGULAR_SEASON_MONTHS[REGULAR_SEASON_MONTHS.length - 1]!;
}

export function getNextMonthStartDay(day: number): number {
  const currentMonth = getRegularSeasonMonthForDay(day);
  return Math.min(REGULAR_SEASON_DAYS + 1, currentMonth.endDay + 1);
}

export function getRegularSeasonGameDays(): number[] {
  return [...REGULAR_SEASON_GAME_DAY_LIST];
}

export function getTradeDeadlineDay(candidateGameDays?: readonly number[]): number {
  if (!candidateGameDays || candidateGameDays.length === 0) {
    return JULY_MONTH.endDay;
  }

  let closestDay = candidateGameDays[0]!;
  let closestDistance = Math.abs(closestDay - JULY_MONTH.endDay);

  for (const day of candidateGameDays) {
    const distance = Math.abs(day - JULY_MONTH.endDay);
    if (distance < closestDistance || (distance === closestDistance && day < closestDay)) {
      closestDay = day;
      closestDistance = distance;
    }
  }

  return closestDay;
}

export function getDaysUntilTradeDeadline(day: number, candidateGameDays?: readonly number[]): number {
  return Math.max(0, getTradeDeadlineDay(candidateGameDays) - day);
}

export function isTradeDeadlineModeDay(day: number): boolean {
  const normalizedDay = Math.max(1, Math.min(REGULAR_SEASON_DAYS, day));
  return normalizedDay >= JULY_MONTH.startDay && normalizedDay <= JULY_MONTH.endDay;
}
