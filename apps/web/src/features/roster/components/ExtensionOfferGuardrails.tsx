import { Badge, Card, CardContent, CardHeader, CardTitle, StatLine } from '@mbd/ui';
import { ShieldCheck } from 'lucide-react';
import type { ExtensionCandidateView } from './ExtensionCommandCenter';

interface ExtensionOfferGuardrailsProps {
  candidate: ExtensionCandidateView;
  years: number;
  annualSalary: number;
  signingBonus: number;
  noTradeClause: boolean;
  optOut: boolean;
}

function moneyLabel(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function demandMultiplier(candidate: ExtensionCandidateView): number {
  return candidate.demandMultiplier ?? 1;
}

function walkAwayThreshold(candidate: ExtensionCandidateView): number {
  return candidate.walkAwayThreshold ?? 0.12;
}

function structureLabel(noTradeClause: boolean, optOut: boolean): string {
  if (noTradeClause && optOut) {
    return 'NTC + opt-out';
  }
  if (noTradeClause) {
    return 'NTC concession';
  }
  if (optOut) {
    return 'Opt-out concession';
  }
  return 'Cash-only';
}

function controlRunwayLabel(yearsRemaining: number): string {
  const years = Math.max(0, yearsRemaining);
  return `${years} ${years === 1 ? 'year' : 'years'} control`;
}

function payrollDeltaLabel(delta: number): string {
  if (Math.abs(delta) < 0.05) {
    return 'No payroll lift';
  }
  if (delta > 0) {
    return `Adds ${moneyLabel(delta)}/year`;
  }
  return `Cuts ${moneyLabel(Math.abs(delta))}/year`;
}

function targetGapLabel(effectiveAav: number, targetAav: number): string {
  const gap = targetAav - effectiveAav;
  if (Math.abs(gap) < 0.05) {
    return 'On target';
  }
  if (gap > 0) {
    return `Short ${moneyLabel(gap)}/year`;
  }
  return `Above target ${moneyLabel(Math.abs(gap))}/year`;
}

function guardrailStatus(effectiveAav: number, targetAav: number, walkAwayAav: number): {
  label: string;
  variant: 'success' | 'warning' | 'danger';
} {
  if (effectiveAav > walkAwayAav) {
    return { label: 'Over walk-away line', variant: 'danger' };
  }
  if (effectiveAav < targetAav * 0.98) {
    return { label: 'Below player target', variant: 'warning' };
  }
  return { label: 'Inside negotiation lane', variant: 'success' };
}

export function ExtensionOfferGuardrails({
  candidate,
  years,
  annualSalary,
  signingBonus,
  noTradeClause,
  optOut,
}: ExtensionOfferGuardrailsProps) {
  const safeYears = Math.max(1, years);
  const safeAnnualSalary = Number.isFinite(annualSalary) ? annualSalary : candidate.currentSalary;
  const safeSigningBonus = Number.isFinite(signingBonus) ? Math.max(0, signingBonus) : 0;
  const effectiveAav = safeAnnualSalary + (safeSigningBonus / safeYears);
  const targetAav = candidate.currentSalary * demandMultiplier(candidate);
  const walkAwayAav = targetAav * (1 + walkAwayThreshold(candidate));
  const status = guardrailStatus(effectiveAav, targetAav, walkAwayAav);
  const payrollDelta = effectiveAav - candidate.currentSalary;

  return (
    <Card className="border-dynasty-border/60 bg-dynasty-elevated/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-accent-info" />
          Offer Guardrails
        </CardTitle>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatLine
          stats={[
            { label: 'Effective AAV', value: moneyLabel(effectiveAav) },
            { label: 'Target', value: moneyLabel(targetAav) },
            { label: 'Walk-Away', value: moneyLabel(walkAwayAav) },
          ]}
        />
        <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
          <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
            Structure
          </div>
          <div className="mt-1 font-heading text-sm text-dynasty-text">
            {structureLabel(noTradeClause, optOut)}
          </div>
        </div>
        <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
          <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
            Payroll Runway
          </div>
          <StatLine
            className="mt-2"
            stats={[
              { label: 'Control', value: controlRunwayLabel(candidate.yearsRemaining) },
              { label: 'Payroll Lift', value: payrollDeltaLabel(payrollDelta) },
              { label: 'Target Gap', value: targetGapLabel(effectiveAav, targetAav) },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
