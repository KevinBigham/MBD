import type { GMCareer, JobMarket, SignatureMoment } from '@mbd/contracts';
import { Badge, GradeBar, StatLine } from '@mbd/ui';
import { Award, Briefcase, Clock, MapPin, Trophy } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { DensePanel } from '@/shared/components/DensePanel';
import { TeamLogo } from '@/shared/components/TeamLogo';
import TeamIdentityCard from './TeamIdentityCard';

interface GMCareerContentPanelProps {
  career: GMCareer;
  gmName: string;
  jobMarket: JobMarket | null;
  teamMoments: SignatureMoment[];
}

function teamDisplayName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

function teamAbbreviation(teamId: string): string {
  const team = getTeamById(teamId);
  return team?.abbreviation ?? teamId.toUpperCase().slice(0, 3);
}

function winPct(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return '.000';
  return (wins / total).toFixed(3).replace(/^0/, '');
}

export function GMCareerContentPanel({
  career,
  gmName,
  jobMarket,
  teamMoments,
}: GMCareerContentPanelProps) {
  const totalGames = career.overallRecord.wins + career.overallRecord.losses;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">GM Career Hub</h1>
          <p className="font-data text-sm text-dynasty-muted">
            Your managerial journey, career record, and franchise legacy.
          </p>
        </div>
        {career.jobSearchActive && (
          <Badge variant="warning" className="uppercase">Job Search Active</Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DensePanel
          title="GM Profile"
          icon={<Briefcase className="h-4 w-4 text-accent-primary" />}
          bodyClassName="space-y-4"
        >
            <div>
              <div className="font-heading text-xl font-bold text-dynasty-text">{gmName}</div>
              <div className="mt-1 flex items-center gap-2 font-data text-sm text-dynasty-muted">
                <MapPin className="h-3.5 w-3.5" />
                {teamDisplayName(career.currentTeamId)}
              </div>
            </div>

            <div>
              <div className="mb-1 font-data text-xs uppercase tracking-wider text-dynasty-muted">
                Reputation
              </div>
              <GradeBar label="Rep" grade={career.reputation} />
            </div>

            {career.careerAchievements.length > 0 && (
              <div>
                <div className="mb-1 font-data text-xs uppercase tracking-wider text-dynasty-muted">
                  Achievements
                </div>
                <div className="space-y-1">
                  {career.careerAchievements.map((achievement, i) => (
                    <div key={i} className="font-data text-xs text-dynasty-text">{achievement}</div>
                  ))}
                </div>
              </div>
            )}
        </DensePanel>

        <DensePanel
          title="Career Record"
          icon={<Award className="h-4 w-4 text-accent-warning" />}
          bodyClassName="space-y-4"
        >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-data text-2xl font-bold text-dynasty-text">
                  {career.overallRecord.wins}
                </div>
                <div className="font-data text-xs uppercase tracking-wider text-dynasty-muted">Wins</div>
              </div>
              <div>
                <div className="font-data text-2xl font-bold text-dynasty-text">
                  {career.overallRecord.losses}
                </div>
                <div className="font-data text-xs uppercase tracking-wider text-dynasty-muted">Losses</div>
              </div>
              <div>
                <div className="font-data text-2xl font-bold text-dynasty-text">
                  {winPct(career.overallRecord.wins, career.overallRecord.losses)}
                </div>
                <div className="font-data text-xs uppercase tracking-wider text-dynasty-muted">Win %</div>
              </div>
            </div>

            <StatLine
              stats={[
                { label: 'Games', value: totalGames.toString() },
                { label: 'Hired', value: `Season ${career.hiredSeason}` },
              ]}
            />

            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/40 p-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-accent-warning" />
                <span className="font-data text-3xl font-bold text-accent-warning">
                  {career.championships}
                </span>
              </div>
              <div className="mt-1 font-data text-xs uppercase tracking-wider text-dynasty-muted">
                Championship{career.championships !== 1 ? 's' : ''}
              </div>
            </div>
        </DensePanel>
      </div>

      <DensePanel
        title="Career Timeline"
        icon={<Clock className="h-4 w-4 text-accent-info" />}
      >
          <div className="relative space-y-0">
            {career.careerHistory.map((entry, i) => {
              const isActive = entry.firedSeason === null;
              const isLast = i === career.careerHistory.length - 1;

              return (
                <div key={`${entry.teamId}-${entry.hiredSeason}`} className="relative flex gap-4 pb-6">
                  {!isLast && (
                    <div className="absolute left-[11px] top-6 h-full w-px bg-dynasty-border" />
                  )}

                  <div
                    className={[
                      'relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2',
                      isActive
                        ? 'border-accent-success bg-accent-success/20'
                        : 'border-dynasty-muted bg-dynasty-elevated',
                    ].join(' ')}
                  />

                  <div className="flex-1 rounded-lg border border-dynasty-border bg-dynasty-elevated/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-text">
                          <TeamLogo teamId={entry.teamId} size="sm" />
                          {teamDisplayName(entry.teamId)}
                        </div>
                        <div className="mt-0.5 font-data text-xs text-dynasty-muted">
                          Season {entry.hiredSeason}
                          {entry.firedSeason ? ` - Season ${entry.firedSeason}` : ' - Present'}
                          {' '}({entry.seasons} season{entry.seasons !== 1 ? 's' : ''})
                        </div>
                      </div>
                      <Badge
                        variant={isActive ? 'success' : entry.firedReason ? 'danger' : 'outline'}
                        className="text-[10px] uppercase"
                      >
                        {isActive ? 'Active' : entry.firedReason ? 'Fired' : 'Resigned'}
                      </Badge>
                    </div>

                    <StatLine
                      className="mt-2"
                      stats={[
                        { label: 'Record', value: `${entry.record.wins}-${entry.record.losses}` },
                        { label: 'Win %', value: winPct(entry.record.wins, entry.record.losses) },
                        { label: 'Titles', value: entry.championships.toString() },
                        { label: teamAbbreviation(entry.teamId), value: `Rep ${Math.round(entry.reputation)}` },
                      ]}
                    />

                    {entry.firedReason && (
                      <div className="mt-2 font-data text-xs text-accent-danger">
                        Reason: {entry.firedReason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      </DensePanel>

      {career.jobSearchActive && jobMarket && jobMarket.availableJobs.length > 0 && (
        <DensePanel
          title="Job Market"
          icon={<Briefcase className="h-4 w-4 text-accent-warning" />}
        >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {jobMarket.availableJobs.map((job) => (
                <div
                  key={job.teamId}
                  className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-text">
                      <TeamLogo teamId={job.teamId} size="sm" />
                      {teamDisplayName(job.teamId)}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{job.difficulty}</Badge>
                  </div>
                  <StatLine
                    className="mt-2"
                    stats={[
                      { label: 'Budget', value: job.budget },
                      { label: 'Owner', value: job.ownerArchetype },
                    ]}
                  />
                  <div className="mt-2 font-data text-xs text-dynasty-muted">
                    {job.expectations}
                  </div>
                  <div className="mt-2">
                    <GradeBar label="Appeal" grade={Math.round(job.attractiveness * 100)} />
                  </div>
                </div>
              ))}
            </div>
            {jobMarket.applicationDeadlineSeason && (
              <div className="mt-3 font-data text-xs text-dynasty-muted">
                Application deadline: Season {jobMarket.applicationDeadlineSeason}
              </div>
            )}
        </DensePanel>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-dynasty-text">Team Identity</h2>
          <p className="font-data text-sm text-dynasty-muted">
            Deadline turns and franchise posture shifts accumulate here across your tenure.
          </p>
        </div>
        <TeamIdentityCard teamId={career.currentTeamId} moments={teamMoments} />
      </section>
    </div>
  );
}
