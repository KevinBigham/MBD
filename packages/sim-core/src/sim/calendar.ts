export interface RegularSeasonMonth {
  month: number;
  key: 'APRIL' | 'MAY' | 'JUNE' | 'JULY' | 'AUGUST' | 'SEPTEMBER';
  label: string;
  startDay: number;
  endDay: number;
}

export const REGULAR_SEASON_MONTHS: readonly RegularSeasonMonth[] = [
  { month: 4, key: 'APRIL', label: 'April', startDay: 1, endDay: 30 },
  { month: 5, key: 'MAY', label: 'May', startDay: 31, endDay: 61 },
  { month: 6, key: 'JUNE', label: 'June', startDay: 62, endDay: 91 },
  { month: 7, key: 'JULY', label: 'July', startDay: 92, endDay: 122 },
  { month: 8, key: 'AUGUST', label: 'August', startDay: 123, endDay: 153 },
  { month: 9, key: 'SEPTEMBER', label: 'September', startDay: 154, endDay: 162 },
] as const;

export function getRegularSeasonMonthForDay(day: number): RegularSeasonMonth {
  const normalizedDay = Math.max(1, Math.min(162, day));
  return REGULAR_SEASON_MONTHS.find((entry) => normalizedDay >= entry.startDay && normalizedDay <= entry.endDay)
    ?? REGULAR_SEASON_MONTHS[REGULAR_SEASON_MONTHS.length - 1]!;
}

export function getNextMonthStartDay(day: number): number {
  const currentMonth = getRegularSeasonMonthForDay(day);
  return Math.min(163, currentMonth.endDay + 1);
}
