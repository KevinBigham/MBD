/**
 * TEMPORARY DEEP-AUDIT SCRIPT (not a release gate).
 * Generates a real league through buildNewGameState — the exact path the app
 * uses on New Game — and dumps a Day 1 roster audit to output/roster-day1-audit/.
 * Run: cd apps/web && MBD_ROSTER_AUDIT=1 npx vitest run src/workers/rosterDayOneAudit.audit.test.ts
 */
import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  AFFILIATE_LEVELS,
  buildRosterState,
  runInvariantChecks,
  toDisplayRating,
  validateRoster,
  TEAMS,
} from '@mbd/sim-core';
import type { GeneratedPlayer } from '@mbd/sim-core';
import { buildNewGameState } from './sim.worker.setup.js';
import { getMinorLeaguePlayerGenerationContent } from './content/minorLeagueContent.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, '../../../../output/roster-day1-audit');

const PITCHER_POS = new Set(['SP', 'RP', 'CL']);
const LEVELS = ['MLB', 'AAA', 'AA', 'A_PLUS', 'A', 'ROOKIE', 'INTERNATIONAL'] as const;
type Level = (typeof LEVELS)[number];

const isPitcher = (p: GeneratedPlayer) => PITCHER_POS.has(p.position);
const levelOf = (p: GeneratedPlayer): Level => (p.rosterStatus === 'MLB' ? 'MLB' : (p.rosterStatus as Level));

interface LevelLine {
  total: number;
  pitchers: number;
  hitters: number;
  sp: number;
  relievers: number;
  catchers: number;
  avgOvr: number;
  minOvr: number;
  maxOvr: number;
  avgAge: number;
  worthless: number; // display OVR <= 28
  gems: number; // display OVR <= 42 && display ceiling >= 58
  missingPositions: string[];
}

function analyzeLevel(players: GeneratedPlayer[]): LevelLine {
  const pitchers = players.filter(isPitcher);
  const hitters = players.filter((p) => !isPitcher(p));
  const ovrs = players.map((p) => toDisplayRating(p.overallRating));
  const required = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const have = new Set(players.map((p) => p.position));
  return {
    total: players.length,
    pitchers: pitchers.length,
    hitters: hitters.length,
    sp: players.filter((p) => p.position === 'SP').length,
    relievers: players.filter((p) => p.position === 'RP' || p.position === 'CL').length,
    catchers: players.filter((p) => p.position === 'C').length,
    avgOvr: avg(ovrs),
    minOvr: Math.min(...ovrs),
    maxOvr: Math.max(...ovrs),
    avgAge: avg(players.map((p) => p.age)),
    worthless: ovrs.filter((o) => o <= 28).length,
    gems: players.filter(
      (p) => toDisplayRating(p.overallRating) <= 42 && toDisplayRating(p.ceiling ?? p.overallRating) >= 58,
    ).length,
    missingPositions: required.filter((pos) => !have.has(pos)),
  };
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

describe('Day 1 roster deep audit', () => {
  it.skipIf(!process.env.MBD_ROSTER_AUDIT)('generates a league and dumps the audit report', { timeout: 300_000 }, () => {
    const seed = 1234;
    const state = buildNewGameState({
      seed,
      userTeamId: 'kc',
      gmName: 'Audit GM',
      difficulty: 'standard',
      saveSlot: 99,
      dayOneExperience: 'quick',
    });
    const players = state.players as GeneratedPlayer[];
    const teamIds = TEAMS.map((t) => t.id);

    const lines: string[] = [];
    const say = (s: string) => lines.push(s);

    say(`# MBD Day 1 Roster Deep Audit`);
    say(``);
    say(`Seed ${seed} · generated through \`buildNewGameState\` (the real New Game path) · ${new Date().toISOString().slice(0, 10)}`);
    say(``);

    // ---- League totals ----
    const byLevelAll = new Map<string, GeneratedPlayer[]>();
    for (const p of players) {
      const key = levelOf(p);
      byLevelAll.set(key, [...(byLevelAll.get(key) ?? []), p]);
    }
    say(`## League totals`);
    say(``);
    say(`Total players: **${players.length}** across ${teamIds.length} orgs`);
    say(``);
    say(`| Level | Players | Pitchers | Hitters | P% | Avg OVR | Min | Max | Avg Age | OVR<=28 | Gems |`);
    say(`|---|---|---|---|---|---|---|---|---|---|---|`);
    for (const level of LEVELS) {
      const ps = byLevelAll.get(level) ?? [];
      if (!ps.length) continue;
      const a = analyzeLevel(ps);
      say(
        `| ${level} | ${a.total} | ${a.pitchers} | ${a.hitters} | ${Math.round((a.pitchers / a.total) * 100)}% | ${a.avgOvr} | ${a.minOvr} | ${a.maxOvr} | ${a.avgAge} | ${a.worthless} | ${a.gems} |`,
      );
    }
    say(``);

    // ---- Duplicate IDs ----
    const idCounts = new Map<string, number>();
    for (const p of players) idCounts.set(p.id, (idCounts.get(p.id) ?? 0) + 1);
    const dupes = [...idCounts.entries()].filter(([, n]) => n > 1);
    say(`Duplicate player IDs: **${dupes.length}**`);
    say(``);

    // ---- Per-team audit ----
    say(`## Per-team audit`);
    say(``);
    say(
      `| Team | Total | 26-man | 40-man | AAA | AA | A+ | A | RK | INTL | Val errors | Val warnings |`,
    );
    say(`|---|---|---|---|---|---|---|---|---|---|---|---|`);

    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const balanceIssues: string[] = [];
    const coverageIssues: string[] = [];

    for (const teamId of teamIds) {
      const teamPlayers = players.filter((p) => p.teamId === teamId);
      const rosterState = buildRosterState(teamId, teamPlayers);
      const validation = validateRoster(rosterState, teamPlayers);
      const byLevel = (lvl: Level) => teamPlayers.filter((p) => levelOf(p) === lvl);
      const counts = Object.fromEntries(LEVELS.map((l) => [l, byLevel(l).length]));

      say(
        `| ${teamId} | ${teamPlayers.length} | ${rosterState.mlbRoster.length} | ${rosterState.fortyManRoster.length} | ${counts.AAA} | ${counts.AA} | ${counts.A_PLUS} | ${counts.A} | ${counts.ROOKIE} | ${counts.INTERNATIONAL} | ${validation.errors.length} | ${validation.warnings.length} |`,
      );
      for (const e of validation.errors) allErrors.push(`${teamId}: ${e}`);
      for (const w of validation.warnings) allWarnings.push(`${teamId}: ${w}`);

      for (const level of ['MLB', ...AFFILIATE_LEVELS] as Level[]) {
        const ps = byLevel(level);
        if (!ps.length) continue;
        const a = analyzeLevel(ps);
        if (a.pitchers < Math.floor(a.total * 0.4)) {
          balanceIssues.push(
            `${teamId} ${level}: ${a.pitchers}P / ${a.hitters}H of ${a.total} (${Math.round((a.pitchers / a.total) * 100)}% pitchers)`,
          );
        }
        if (a.missingPositions.length || a.sp < 4 || a.catchers < 2) {
          coverageIssues.push(
            `${teamId} ${level}: missing [${a.missingPositions.join(', ')}] · SP=${a.sp} · C=${a.catchers}`,
          );
        }
      }
    }
    say(``);

    // ---- Invariant checks (engine's own checker) ----
    const invariants = runInvariantChecks({
      players,
      rosterStates: [...state.rosterStates.values()],
      standingsRecords: [],
    });
    say(`## Engine invariant checker`);
    say(``);
    say(`Summary: ${invariants.summary}`);
    const violationCounts = new Map<string, number>();
    for (const v of invariants.violations) {
      violationCounts.set(v.type, (violationCounts.get(v.type) ?? 0) + 1);
    }
    for (const [type, n] of violationCounts) say(`- ${type}: ${n}`);
    say(``);

    // ---- Validation detail ----
    say(`## validateRoster errors (${allErrors.length})`);
    say(``);
    for (const e of allErrors.slice(0, 40)) say(`- ${e}`);
    if (allErrors.length > 40) say(`- …and ${allErrors.length - 40} more`);
    say(``);
    say(`## validateRoster warnings (${allWarnings.length})`);
    say(``);
    for (const w of allWarnings.slice(0, 40)) say(`- ${w}`);
    if (allWarnings.length > 40) say(`- …and ${allWarnings.length - 40} more`);
    say(``);

    // ---- Pitcher/hitter balance ----
    say(`## Pitcher/hitter balance issues (<40% pitchers at a level) — ${balanceIssues.length}`);
    say(``);
    for (const b of balanceIssues.slice(0, 40)) say(`- ${b}`);
    if (balanceIssues.length > 40) say(`- …and ${balanceIssues.length - 40} more`);
    say(``);

    // ---- Position coverage ----
    say(`## Position coverage issues (missing required pos, SP<4, or C<2) — ${coverageIssues.length}`);
    say(``);
    for (const c of coverageIssues.slice(0, 40)) say(`- ${c}`);
    if (coverageIssues.length > 40) say(`- …and ${coverageIssues.length - 40} more`);
    say(``);

    // ---- Contracts ----
    const minors = players.filter((p) => p.rosterStatus !== 'MLB');
    const contractYears = new Map<number, number>();
    for (const p of minors) contractYears.set(p.contract.years, (contractYears.get(p.contract.years) ?? 0) + 1);
    say(`## Contracts`);
    say(``);
    say(`Minor leaguer contract years distribution:`);
    for (const [years, n] of [...contractYears.entries()].sort((a, b) => a[0] - b[0])) {
      say(`- ${years} years: ${n} players`);
    }
    const mlb = players.filter((p) => p.rosterStatus === 'MLB');
    const svcAnomalies = mlb.filter((p) => p.serviceTimeDays / 172 > p.age - 18).length;
    say(``);
    say(`MLB players whose service years exceed (age - 18): **${svcAnomalies}** of ${mlb.length}`);
    say(``);

    // ---- Veteran depth in AAA (MiLB-FA-style players) ----
    const aaa = players.filter((p) => levelOf(p) === 'AAA');
    const aaaVets = aaa.filter((p) => p.age >= 28);
    say(`## AAA veteran depth (age >= 28, the "MiLB FA on a 1-yr deal" archetype)`);
    say(``);
    say(`AAA players age >= 28: **${aaaVets.length}** of ${aaa.length} league-wide (${Math.round((aaaVets.length / Math.max(1, aaa.length)) * 100)}%)`);
    say(``);

    // ---- Diamonds in the rough per team ----
    say(`## Diamond-in-the-rough coverage (display OVR <= 42, ceiling >= 58)`);
    say(``);
    say(`| Team | Gems (all minors) | Best gem (OVR -> ceiling) |`);
    say(`|---|---|---|`);
    for (const teamId of teamIds) {
      const gems = players.filter(
        (p) =>
          p.teamId === teamId &&
          p.rosterStatus !== 'MLB' &&
          toDisplayRating(p.overallRating) <= 42 &&
          toDisplayRating(p.ceiling ?? p.overallRating) >= 58,
      );
      const best = gems.sort(
        (a, b) => (b.ceiling ?? b.overallRating) - (a.ceiling ?? a.overallRating),
      )[0];
      say(
        `| ${teamId} | ${gems.length} | ${best ? `${best.firstName} ${best.lastName} ${toDisplayRating(best.overallRating)} -> ${toDisplayRating(best.ceiling ?? best.overallRating)}` : '—'} |`,
      );
    }
    say(``);

    // ---- Authored content coverage ----
    const authored = getMinorLeaguePlayerGenerationContent();
    let authoredTotal = 0;
    const authoredPerTeam: string[] = [];
    for (const teamId of teamIds) {
      const rows = authored.get(teamId) ?? [];
      authoredTotal += rows.length;
      authoredPerTeam.push(`${teamId}=${rows.length}`);
    }
    say(`## Authored content coverage`);
    say(``);
    say(`Authored roster rows passed to generation: **${authoredTotal}** total`);
    say(`Per team: ${authoredPerTeam.join(', ')}`);
    say(``);

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(path.join(OUT_DIR, 'report.md'), lines.join('\n'));
    writeFileSync(
      path.join(OUT_DIR, 'summary.json'),
      JSON.stringify(
        {
          seed,
          totalPlayers: players.length,
          duplicateIds: dupes.length,
          validationErrors: allErrors.length,
          validationWarnings: allWarnings.length,
          balanceIssues: balanceIssues.length,
          coverageIssues: coverageIssues.length,
          invariantSummary: invariants.summary,
        },
        null,
        2,
      ),
    );
    // eslint-disable-next-line no-console
    console.log(`[audit] wrote ${path.join(OUT_DIR, 'report.md')}`);
  });
});
