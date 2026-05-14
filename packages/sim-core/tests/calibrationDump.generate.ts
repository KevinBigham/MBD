// @vitest-environment node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  runSeasonCalibration,
  summarizeSeasonCalibration,
} from '../src/index.js';

const DEFAULT_SEED = 44_001;
const DEFAULT_SEASONS = 1;
const DEFAULT_OUT = 'playtest-output/calibration.md';

function pickEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function formatRow(label: string, value: number | string): string {
  return `| ${label} | ${typeof value === 'number' ? value.toFixed(3) : value} |`;
}

function buildMarkdown(seed: number, seasons: number): string {
  const result = runSeasonCalibration({ seed, seasonCount: seasons });
  const summary = summarizeSeasonCalibration(result);

  const lines: string[] = [];
  lines.push(`# Calibration Dump — seed ${seed}, ${seasons} season${seasons === 1 ? '' : 's'}`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(formatRow('Total games', summary.totalGames));
  lines.push(formatRow('Avg runs per game', summary.averageRunsPerGame));
  lines.push(formatRow('Avg team wins', summary.averageTeamWins));
  lines.push(formatRow('Team win spread', summary.teamWinSpread));
  lines.push(formatRow('Avg total MLB payroll ($M)', summary.averageTotalMlbPayroll));
  lines.push(formatRow('Avg MLB salary ($M)', summary.averageMlbSalary));
  lines.push(formatRow('League batting average', summary.battingAverage));
  lines.push(formatRow('League OBP', summary.onBasePercentage));
  lines.push(formatRow('League SLG', summary.sluggingPercentage));
  lines.push(formatRow('League OPS', summary.ops));
  lines.push('');
  lines.push('## Seasons');
  lines.push('');
  lines.push('| Season | Games | R/G | Avg Wins | Spread | Payroll ($M) | Avg Salary ($M) |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const season of summary.seasons) {
    lines.push(`| ${season.season} | ${season.gamesPlayed} | ${season.averageRunsPerGame.toFixed(3)} | ${season.averageTeamWins.toFixed(2)} | ${season.teamWinSpread} | ${season.totalMlbPayroll.toFixed(0)} | ${season.averageMlbSalary.toFixed(2)} |`);
  }
  lines.push('');

  return lines.join('\n');
}

describe('calibration dump', () => {
  it('writes a calibration summary when MBD_PLAYTEST_DUMP is set', async () => {
    const seed = Number(pickEnv('PLAYTEST_SEED', String(DEFAULT_SEED)));
    const seasons = Number(pickEnv('PLAYTEST_YEARS', String(DEFAULT_SEASONS)));
    const out = pickEnv('PLAYTEST_OUT', DEFAULT_OUT);

    const markdown = buildMarkdown(seed, seasons);
    const path = resolve(process.cwd(), out);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, markdown, 'utf8');

    expect(markdown).toContain('Calibration Dump');
    expect(markdown).toContain('Total games');
  }, 60_000);
});
