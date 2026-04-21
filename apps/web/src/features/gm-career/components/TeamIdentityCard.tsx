import { useMemo, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger } from '@mbd/ui';
import type { SignatureMoment } from '@mbd/contracts';
import { GameRNG, formatMomentDescription, getTeamById } from '@mbd/sim-core';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';

function roundLabel(value: NonNullable<SignatureMoment['round']>): string {
  switch (value) {
    case 'WC':
      return 'Wild Card';
    case 'DS':
      return 'Division Series';
    case 'CS':
      return 'Championship Series';
    case 'WS':
      return 'World Series';
  }
}

function teamDisplayName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

function momentTypeLabel(type: string): string {
  switch (type) {
    case 'deadline_buyer':
      return 'Deadline Buyer';
    case 'deadline_seller':
      return 'Deadline Seller';
    case 'championship_run':
      return 'Championship Run';
    case 'contention_collapse':
      return 'Contention Collapse';
    default:
      return type
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

export default function TeamIdentityCard({
  teamId,
  moments,
}: {
  teamId: string;
  moments: SignatureMoment[];
}) {
  const teamName = teamDisplayName(teamId);
  const [seasonFilter, setSeasonFilter] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const seasonOptions = useMemo(() => {
    const values = new Set<number>();
    for (const moment of moments) values.add(moment.season);
    return Array.from(values).sort((a, b) => b - a);
  }, [moments]);

  const typeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const moment of moments) values.add(moment.type);
    return Array.from(values).sort();
  }, [moments]);

  const filteredMoments = useMemo(
    () => moments.filter((moment) =>
      (seasonFilter === 'all' || moment.season === seasonFilter)
      && (typeFilter === 'all' || moment.type === typeFilter),
    ),
    [moments, seasonFilter, typeFilter],
  );

  const showSeasonFilters = seasonOptions.length > 1;
  const showTypeFilters = typeOptions.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
          <TeamLogo teamId={teamId} size="sm" />
          {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {moments.length === 0 ? (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
            No team identity moments yet. Deadline seller/buyer beats will appear here after your first trade deadline.
          </div>
        ) : (
          <>
            {showSeasonFilters ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="shrink-0 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                  Season
                </div>
                <Tabs
                  value={String(seasonFilter)}
                  onValueChange={(value) => setSeasonFilter(value === 'all' ? 'all' : Number(value))}
                >
                  <div className="overflow-x-auto">
                    <TabsList className="min-w-max gap-2 border-none">
                      <TabsTrigger
                        value="all"
                        onClick={() => setSeasonFilter('all')}
                        className="rounded-lg border border-dynasty-border bg-dynasty-elevated data-[state=active]:border-accent-primary data-[state=active]:bg-accent-primary/10"
                      >
                        All
                      </TabsTrigger>
                      {seasonOptions.map((season) => (
                        <TabsTrigger
                          key={season}
                          value={String(season)}
                          onClick={() => setSeasonFilter(season)}
                          className="rounded-lg border border-dynasty-border bg-dynasty-elevated data-[state=active]:border-accent-primary data-[state=active]:bg-accent-primary/10"
                        >
                          Season {season}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </Tabs>
              </div>
            ) : null}

            {showTypeFilters ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="shrink-0 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                  Type
                </div>
                <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                  <div className="overflow-x-auto">
                    <TabsList className="min-w-max gap-2 border-none">
                      <TabsTrigger
                        value="all"
                        onClick={() => setTypeFilter('all')}
                        className="rounded-lg border border-dynasty-border bg-dynasty-elevated data-[state=active]:border-accent-primary data-[state=active]:bg-accent-primary/10"
                      >
                        All
                      </TabsTrigger>
                      {typeOptions.map((type) => (
                        <TabsTrigger
                          key={type}
                          value={type}
                          onClick={() => setTypeFilter(type)}
                          className="rounded-lg border border-dynasty-border bg-dynasty-elevated data-[state=active]:border-accent-primary data-[state=active]:bg-accent-primary/10"
                        >
                          {momentTypeLabel(type)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </Tabs>
              </div>
            ) : null}

            {filteredMoments.length === 0 ? (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
                No moments match the current filters.
              </div>
            ) : (
              filteredMoments.map((moment, index) => {
                const positive = moment.impact >= 0;
                const fallbackDescription = formatMomentDescription(
                  moment,
                  teamName,
                  new GameRNG((moment.season * 1000) + (moment.day ?? index + 1)),
                );

                return (
                  <div
                    key={`${moment.type}-${moment.season}-${moment.day ?? index}-${moment.timestamp ?? index}`}
                    className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-2 ${positive ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-danger/10 text-accent-danger'}`}>
                          {positive ? <Sparkles className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-heading text-sm text-dynasty-textBright">
                            {moment.description || fallbackDescription}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">
                              {momentTypeLabel(moment.type)}
                            </Badge>
                            <Badge variant={positive ? 'success' : 'warning'}>
                              Impact {moment.impact > 0 ? `+${moment.impact}` : moment.impact}
                            </Badge>
                            <Badge variant="outline">
                              Relevance {moment.relevance.toFixed(2)}
                            </Badge>
                            <Badge variant="outline">
                              Season {moment.season}
                            </Badge>
                            {moment.day != null ? (
                              <Badge variant="outline">Day {moment.day}</Badge>
                            ) : null}
                            {moment.round ? (
                              <Badge variant="info">{roundLabel(moment.round)}</Badge>
                            ) : null}
                            {moment.worldSeriesClincher ? (
                              <Badge variant="warning">World Series Clincher</Badge>
                            ) : null}
                            {moment.isEliminationGame ? (
                              <Badge variant="warning">Elimination Game</Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
