import { Badge, StatLine } from '@mbd/ui';
import { Handshake } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface FrontOfficeMentorshipPairingView {
  mentorId: string;
  protegeeId: string;
  mentorName: string;
  protegeeName: string;
  quality: number;
  compatibilityFactors: string[];
  developmentBonus: number;
  status?: 'active' | 'recommended';
}

export interface FrontOfficeClubhouseLeaderView {
  playerId: string;
  playerName: string;
  position: string;
  role: string;
  leadership: number;
  score?: number;
  summary: string;
  traits: string[];
}

export interface FrontOfficeClubhouseConflictRiskView {
  playerId: string;
  playerName: string;
  position: string;
  severity: 'low' | 'medium' | 'high';
  riskScore: number;
  reason: string;
  mitigation: string;
}

export interface FrontOfficeMentorshipView {
  mentorCount: number;
  protegeeCount: number;
  activePairingCount?: number;
  recommendedPairingCount?: number;
  leaders?: FrontOfficeClubhouseLeaderView[];
  conflictRisks?: FrontOfficeClubhouseConflictRiskView[];
  pairings: FrontOfficeMentorshipPairingView[];
}

function mentorshipStatusRank(pairing: FrontOfficeMentorshipPairingView): number {
  return pairing.status === 'active' ? 0 : 1;
}

function topPairing(mentorship: FrontOfficeMentorshipView): FrontOfficeMentorshipPairingView | null {
  return [...mentorship.pairings]
    .sort((left, right) =>
      mentorshipStatusRank(left) - mentorshipStatusRank(right)
      || right.quality - left.quality
      || left.mentorName.localeCompare(right.mentorName)
      || left.protegeeName.localeCompare(right.protegeeName),
    )[0] ?? null;
}

function topLeader(mentorship: FrontOfficeMentorshipView): FrontOfficeClubhouseLeaderView | null {
  return [...(mentorship.leaders ?? [])]
    .sort((left, right) =>
      (right.score ?? right.leadership) - (left.score ?? left.leadership)
      || right.leadership - left.leadership
      || left.playerName.localeCompare(right.playerName),
    )[0] ?? null;
}

function topConflictRisk(mentorship: FrontOfficeMentorshipView): FrontOfficeClubhouseConflictRiskView | null {
  return [...(mentorship.conflictRisks ?? [])]
    .sort((left, right) =>
      right.riskScore - left.riskScore
      || left.playerName.localeCompare(right.playerName),
    )[0] ?? null;
}

function severityVariant(severity: FrontOfficeClubhouseConflictRiskView['severity']): 'danger' | 'warning' | 'outline' {
  if (severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  return 'outline';
}

export function FrontOfficeClubhouseWebCard({
  mentorship,
}: {
  mentorship: FrontOfficeMentorshipView;
}) {
  const pairing = topPairing(mentorship);
  const leader = topLeader(mentorship);
  const conflictRisk = topConflictRisk(mentorship);

  return (
    <DensePanel
      title="Clubhouse Web"
      icon={<Handshake className="h-4 w-4 text-accent-primary" />}
      bodyClassName="space-y-4"
    >
      <StatLine
        stats={[
          { label: 'Mentors', value: mentorship.mentorCount },
          { label: 'Protegees', value: mentorship.protegeeCount },
          { label: 'At Risk', value: mentorship.conflictRisks?.length ?? 0 },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
          <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">Mentor Lane</div>
          {pairing ? (
            <div className="mt-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-heading text-sm text-dynasty-textBright">{pairing.mentorName}</div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">mentoring {pairing.protegeeName}</div>
                </div>
                <Badge variant={pairing.quality >= 80 ? 'success' : pairing.quality >= 60 ? 'warning' : 'outline'}>
                  {pairing.quality}
                </Badge>
              </div>
              <div className="mt-3 rounded border border-accent-success/30 bg-accent-success/5 px-3 py-2">
                <div className="font-heading text-[10px] uppercase tracking-wide text-accent-success">Development impact</div>
                <div className="mt-1 font-heading text-sm text-dynasty-text">
                  {Math.round(pairing.developmentBonus * 100)}% lift
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 font-heading text-xs text-dynasty-muted">No active mentor lane.</div>
          )}
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
          <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">Room Captain</div>
          {leader ? (
            <div className="mt-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-heading text-sm text-dynasty-textBright">{leader.playerName}</div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">{leader.position} · {leader.role}</div>
                </div>
                <Badge variant="success">{leader.leadership}</Badge>
              </div>
              <div className="mt-2 font-heading text-xs text-dynasty-muted">{leader.summary}</div>
            </div>
          ) : (
            <div className="mt-3 font-heading text-xs text-dynasty-muted">No clear clubhouse captain.</div>
          )}
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
          <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">Conflict Watch</div>
          {conflictRisk ? (
            <div className="mt-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-heading text-sm text-dynasty-textBright">{conflictRisk.playerName}</div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">{conflictRisk.position}</div>
                </div>
                <Badge variant={severityVariant(conflictRisk.severity)}>{conflictRisk.severity}</Badge>
              </div>
              <div className="mt-2 font-heading text-xs text-dynasty-muted">{conflictRisk.reason}</div>
              <div className="mt-2 rounded border border-accent-warning/30 bg-accent-warning/5 px-2 py-1 font-heading text-xs text-dynasty-text">
                {conflictRisk.mitigation}
              </div>
            </div>
          ) : (
            <div className="mt-3 font-heading text-xs text-dynasty-muted">No acute conflict risk.</div>
          )}
        </div>
      </div>
    </DensePanel>
  );
}
