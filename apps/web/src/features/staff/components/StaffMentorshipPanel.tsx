import { Badge, StatLine } from '@mbd/ui';
import { Handshake } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface MentorshipPairingView {
  mentorId: string;
  protegeeId: string;
  mentorName: string;
  protegeeName: string;
  quality: number;
  compatibilityFactors: string[];
  developmentBonus: number;
  status?: 'active' | 'recommended';
  startedSeason?: number | null;
  summary?: string | null;
}

export interface ClubhouseLeaderView {
  playerId: string;
  playerName: string;
  position: string;
  role: string;
  leadership: number;
  score?: number;
  summary: string;
  traits: string[];
}

export interface ClubhouseConflictRiskView {
  playerId: string;
  playerName: string;
  position: string;
  severity: 'low' | 'medium' | 'high';
  riskScore: number;
  reason: string;
  mitigation: string;
}

export interface MentorshipView {
  mentorCount: number;
  protegeeCount: number;
  activePairingCount?: number;
  recommendedPairingCount?: number;
  leaders?: ClubhouseLeaderView[];
  conflictRisks?: ClubhouseConflictRiskView[];
  pairings: MentorshipPairingView[];
}

function topClubhouseLeaders(mentorship: MentorshipView): ClubhouseLeaderView[] {
  return [...(mentorship.leaders ?? [])]
    .sort((left, right) =>
      (right.score ?? right.leadership) - (left.score ?? left.leadership)
      || right.leadership - left.leadership
      || left.playerName.localeCompare(right.playerName),
    )
    .slice(0, 3);
}

function topConflictRisks(mentorship: MentorshipView): ClubhouseConflictRiskView[] {
  return [...(mentorship.conflictRisks ?? [])]
    .sort((left, right) =>
      right.riskScore - left.riskScore
      || left.playerName.localeCompare(right.playerName),
    )
    .slice(0, 3);
}

function topMentorships(mentorship: MentorshipView): MentorshipPairingView[] {
  return [...mentorship.pairings]
    .sort((left, right) =>
      mentorshipStatusRank(left) - mentorshipStatusRank(right)
      || (right.quality - left.quality)
      || left.mentorName.localeCompare(right.mentorName)
      || left.protegeeName.localeCompare(right.protegeeName),
    )
    .slice(0, 3);
}

function mentorshipStatusRank(pairing: MentorshipPairingView): number {
  return pairing.status === 'active' ? 0 : 1;
}

function mentorshipStatusLabel(pairing: MentorshipPairingView): string {
  return pairing.status === 'active' ? 'Active' : 'Recommended';
}

function mentorshipStatusVariant(pairing: MentorshipPairingView): 'success' | 'outline' {
  return pairing.status === 'active' ? 'success' : 'outline';
}

function activeMentorshipCount(mentorship: MentorshipView): number {
  return mentorship.activePairingCount
    ?? mentorship.pairings.filter((pairing) => pairing.status === 'active').length;
}

function recommendedMentorshipCount(mentorship: MentorshipView): number {
  return mentorship.recommendedPairingCount
    ?? mentorship.pairings.filter((pairing) => pairing.status !== 'active').length;
}

function mentorshipLaneSummary(pairing: MentorshipPairingView): string | null {
  return pairing.status === 'active' ? pairing.summary ?? null : null;
}

export function StaffMentorshipPanel({ mentorship }: { mentorship: MentorshipView }): JSX.Element {
  const leaders = topClubhouseLeaders(mentorship);
  const conflictRisks = topConflictRisks(mentorship);
  const pairings = topMentorships(mentorship);

  return (
    <DensePanel
      title="Clubhouse Mentorship"
      icon={<Handshake className="h-4 w-4 text-accent-primary" />}
      bodyClassName="space-y-4"
    >
        <StatLine
          stats={[
            { label: 'Mentors', value: mentorship.mentorCount },
            { label: 'Protegees', value: mentorship.protegeeCount },
            { label: 'Active Lanes', value: activeMentorshipCount(mentorship) },
            { label: 'Recommended', value: recommendedMentorshipCount(mentorship) },
            { label: 'Pairings', value: mentorship.pairings.length },
          ]}
        />

        {(leaders.length > 0 || conflictRisks.length > 0) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {leaders.length > 0 && (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
                <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">Clubhouse Leaders</div>
                <div className="mt-3 space-y-2">
                  {leaders.map((leader) => (
                    <div key={leader.playerId} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-heading text-sm text-dynasty-textBright">{leader.playerName}</div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">
                            {leader.position} · {leader.role}
                          </div>
                        </div>
                        <Badge variant="success">{leader.leadership} leadership</Badge>
                      </div>
                      <div className="mt-2 font-heading text-xs text-dynasty-muted">{leader.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {conflictRisks.length > 0 && (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
                <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">Conflict Watch</div>
                <div className="mt-3 space-y-2">
                  {conflictRisks.map((risk) => (
                    <div key={risk.playerId} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-heading text-sm text-dynasty-textBright">{risk.playerName}</div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">{risk.position}</div>
                        </div>
                        <Badge variant={risk.severity === 'high' ? 'danger' : risk.severity === 'medium' ? 'warning' : 'outline'}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <div className="mt-2 font-heading text-xs text-dynasty-muted">{risk.reason}</div>
                      <div className="mt-2 rounded border border-accent-warning/30 bg-accent-warning/5 px-2 py-1 font-heading text-xs text-dynasty-text">
                        {risk.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {pairings.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {pairings.map((pairing) => {
              const summary = mentorshipLaneSummary(pairing);
              return (
                <div
                  key={`${pairing.mentorId}-${pairing.protegeeId}`}
                  className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-heading text-sm text-dynasty-textBright">{pairing.mentorName}</div>
                      <div className="mt-1 font-heading text-xs text-dynasty-muted">
                        mentoring {pairing.protegeeName}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={mentorshipStatusVariant(pairing)}>
                        {mentorshipStatusLabel(pairing)}
                      </Badge>
                      <Badge variant={pairing.quality >= 80 ? 'success' : pairing.quality >= 60 ? 'warning' : 'outline'}>
                        {pairing.quality} quality
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 rounded border border-accent-success/30 bg-accent-success/5 px-3 py-2">
                    <div className="font-heading text-[10px] uppercase tracking-wide text-accent-success">Development impact</div>
                    <div className="mt-1 font-heading text-sm text-dynasty-text">
                      {Math.round(pairing.developmentBonus * 100)}% lift
                    </div>
                  </div>
                  {summary ? (
                    <div className="mt-3 font-heading text-xs text-dynasty-muted">{summary}</div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {pairing.compatibilityFactors.slice(0, 2).map((factor) => (
                      <Badge key={factor} variant="outline" className="text-[10px]">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-4 font-heading text-sm text-dynasty-muted">
            No active mentor lanes are available from the current roster mix.
          </div>
        )}
    </DensePanel>
  );
}
