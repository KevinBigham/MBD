export const SKIP_SMOKE_GATE_ENV = 'MBD_SKIP_SMOKE_GATE';

export function shouldSkipSmokeGate(env: Readonly<Record<string, string | undefined>>): boolean {
  return env[SKIP_SMOKE_GATE_ENV] === '1';
}

export function shouldCaptureSeasonBoundarySnapshot(
  options: Readonly<{ validateInvariants: boolean }>,
  boundary: Readonly<{ seasonIndex: number; totalSeasons: number }>,
): boolean {
  if (boundary.totalSeasons <= 0) {
    return false;
  }

  return options.validateInvariants || boundary.seasonIndex === boundary.totalSeasons - 1;
}
