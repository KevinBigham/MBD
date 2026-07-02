const INTERNAL_RATING_MIN = 0;
const INTERNAL_RATING_MAX = 550;
const DISPLAY_RATING_MIN = 20;
const DISPLAY_RATING_MAX = 80;

export function normalizeProspectReadinessGrade(readiness: number): number {
  const value = Number.isFinite(readiness) ? readiness : DISPLAY_RATING_MIN;

  if (value > 100) {
    const clamped = Math.max(INTERNAL_RATING_MIN, Math.min(INTERNAL_RATING_MAX, value));
    return Math.round(
      DISPLAY_RATING_MIN
      + (clamped / INTERNAL_RATING_MAX) * (DISPLAY_RATING_MAX - DISPLAY_RATING_MIN),
    );
  }

  return Math.max(DISPLAY_RATING_MIN, Math.min(DISPLAY_RATING_MAX, Math.round(value)));
}
