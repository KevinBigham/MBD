import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GitCompareArrows, Search } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { TeamLogo } from '@/shared/components/TeamLogo';

interface PlayerDTO {
  id: string;
  name: string;
  position: string;
  age: number;
  teamId: string;
}

interface AttributeComparison {
  attribute: string;
  label: string;
  playerAValue: number;
  playerBValue: number;
  advantage: 'playerA' | 'playerB' | 'even';
  differenceDisplay: number;
  significantGap: boolean;
}

interface RankedAttribute {
  attribute: string;
  label: string;
  displayRating: number;
  letterGrade: string;
}

interface StatComparison {
  statName: string;
  playerAValue: string;
  playerBValue: string;
  advantage: 'playerA' | 'playerB' | 'even';
}

interface ComparisonData {
  comparison: {
    attributeComparison: AttributeComparison[];
    overallAdvantage: 'playerA' | 'playerB' | 'even';
    advantageMargin: number;
    headToHeadSummary: string;
  };
  statComparison: StatComparison[];
  summary: string;
  rankedA: RankedAttribute[];
  rankedB: RankedAttribute[];
  playerA: PlayerDTO;
  playerB: PlayerDTO;
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  teamId: string;
}

function advantageColor(advantage: string, side: 'A' | 'B'): string {
  if (advantage === 'even') return 'text-dynasty-muted';
  if ((advantage === 'playerA' && side === 'A') || (advantage === 'playerB' && side === 'B')) {
    return 'text-accent-success';
  }
  return 'text-dynasty-muted';
}

function AttributeBar({ attr }: { attr: AttributeComparison }) {
  const maxVal = 80;
  const pctA = Math.min(100, (attr.playerAValue / maxVal) * 100);
  const pctB = Math.min(100, (attr.playerBValue / maxVal) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-heading text-xs text-dynasty-muted">
        <span className={advantageColor(attr.advantage, 'A')}>{attr.playerAValue}</span>
        <span className="font-semibold text-dynasty-text">{attr.label}</span>
        <span className={advantageColor(attr.advantage, 'B')}>{attr.playerBValue}</span>
      </div>
      <div className="flex gap-1">
        <div className="flex h-2 flex-1 justify-end overflow-hidden rounded-l-full bg-dynasty-border/50">
          <div
            className={`h-full rounded-l-full transition-all ${attr.advantage === 'playerA' ? 'bg-accent-success' : 'bg-accent-info/60'}`}
            style={{ width: `${pctA}%` }}
          />
        </div>
        <div className="flex h-2 flex-1 overflow-hidden rounded-r-full bg-dynasty-border/50">
          <div
            className={`h-full rounded-r-full transition-all ${attr.advantage === 'playerB' ? 'bg-accent-success' : 'bg-accent-info/60'}`}
            style={{ width: `${pctB}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PlayerSearchPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: PlayerDTO | null;
  onSelect: (id: string) => void;
}) {
  const worker = useWorker();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2 || !worker.isReady) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const data = await worker.searchPlayers(query, 10);
      setResults((data ?? []) as SearchResult[]);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, worker]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
        <TeamLogo teamId={selected.teamId} size="md" />
        <div className="flex-1">
          <div className="font-heading text-sm text-dynasty-textBright">{selected.name}</div>
          <div className="font-data text-xs text-dynasty-muted">{selected.position} · Age {selected.age}</div>
        </div>
        <button
          type="button"
          onClick={() => onSelect('')}
          className="font-heading text-xs text-accent-danger hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="relative mt-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dynasty-muted" />
        <input
          type="text"
          placeholder="Search players..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-lg border border-dynasty-border bg-dynasty-surface py-2 pl-10 pr-3 font-heading text-sm text-dynasty-text placeholder:text-dynasty-muted/50 focus:border-accent-primary focus:outline-none"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-dynasty-border bg-dynasty-surface shadow-lg">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onSelect(r.id); setQuery(''); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-heading text-sm text-dynasty-text hover:bg-dynasty-elevated"
            >
              <TeamLogo teamId={r.teamId} size="sm" />
              <span>{r.firstName} {r.lastName}</span>
              <span className="ml-auto font-data text-xs text-dynasty-muted">{r.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayerComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const worker = useWorker();
  const { isInitialized } = useGameStore();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  const playerIdA = searchParams.get('a') ?? '';
  const playerIdB = searchParams.get('b') ?? '';

  const fetchComparison = useCallback(async () => {
    if (!isInitialized || !worker.isReady || !playerIdA || !playerIdB) return;
    setLoading(true);
    const result = await worker.getPlayerComparison(playerIdA, playerIdB);
    setData(result as ComparisonData | null);
    setLoading(false);
  }, [isInitialized, worker, playerIdA, playerIdB]);

  useEffect(() => {
    void fetchComparison();
  }, [fetchComparison]);

  const setPlayer = useCallback((side: 'a' | 'b', id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id) {
      next.set(side, id);
    } else {
      next.delete(side);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const playerA = data?.playerA ?? null;
  const playerB = data?.playerB ?? null;

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/players"
            className="inline-flex items-center gap-1 font-heading text-sm text-dynasty-muted hover:text-accent-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Players
          </Link>
          <span className="text-dynasty-border">/</span>
          <h1 className="font-brand text-2xl tracking-wide text-dynasty-textBright">Compare Players</h1>
        </div>

        {/* Player pickers */}
        <div className="grid gap-4 md:grid-cols-2">
          <PlayerSearchPicker
            label="Player A"
            selected={playerA}
            onSelect={(id) => setPlayer('a', id)}
          />
          <PlayerSearchPicker
            label="Player B"
            selected={playerB}
            onSelect={(id) => setPlayer('b', id)}
          />
        </div>

        {loading && (
          <div className="py-12 text-center font-data text-sm text-dynasty-muted">
            Comparing players...
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <GitCompareArrows className="h-5 w-5 text-accent-info" />
                  <p className="font-heading text-sm leading-relaxed text-dynasty-text">
                    {data.summary}
                  </p>
                </div>
                {data.comparison.overallAdvantage !== 'even' && (
                  <Badge
                    className="mt-2"
                    variant={data.comparison.overallAdvantage === 'playerA' ? 'success' : 'info'}
                  >
                    Edge: {data.comparison.overallAdvantage === 'playerA' ? data.playerA.name : data.playerB.name} (+{data.comparison.advantageMargin.toFixed(1)}%)
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Attribute comparison */}
            {data.comparison.attributeComparison.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-dynasty-text">Attribute Comparison</CardTitle>
                    <div className="flex gap-6 font-data text-xs text-dynasty-muted">
                      <span>{data.playerA.name}</span>
                      <span>{data.playerB.name}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.comparison.attributeComparison.map((attr) => (
                    <AttributeBar key={attr.attribute} attr={attr} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Stat comparison */}
            {data.statComparison.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-dynasty-text">Season Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                          <th className="px-3 py-2 text-left font-heading">{data.playerA.name}</th>
                          <th className="px-3 py-2 text-center font-heading">Stat</th>
                          <th className="px-3 py-2 text-right font-heading">{data.playerB.name}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.statComparison.map((sc) => (
                          <tr key={sc.statName} className="border-b border-dynasty-border/30">
                            <td className={`px-3 py-2 text-left font-data text-sm ${advantageColor(sc.advantage, 'A')}`}>
                              {sc.playerAValue}
                            </td>
                            <td className="px-3 py-2 text-center font-heading text-xs text-dynasty-muted">
                              {sc.statName}
                            </td>
                            <td className={`px-3 py-2 text-right font-data text-sm ${advantageColor(sc.advantage, 'B')}`}>
                              {sc.playerBValue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ranked attributes side by side */}
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: data.playerA.name, ranked: data.rankedA },
                { label: data.playerB.name, ranked: data.rankedB },
              ].map(({ label, ranked }) => (
                <Card key={label}>
                  <CardHeader>
                    <CardTitle className="font-heading text-sm text-dynasty-text">{label} - Tool Grades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {ranked.map((r) => (
                        <div key={r.attribute} className="flex items-center justify-between rounded-lg border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                          <span className="font-heading text-xs text-dynasty-muted">{r.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-data text-sm text-dynasty-text">{r.displayRating}</span>
                            <Badge variant="outline" className="font-data text-[10px]">{r.letterGrade}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!data && !loading && playerIdA && playerIdB && (
          <div className="py-12 text-center font-heading text-sm text-dynasty-muted">
            Could not compare these players. They may not exist in the current save.
          </div>
        )}

        {!playerIdA && !playerIdB && (
          <div className="py-12 text-center">
            <GitCompareArrows className="mx-auto h-12 w-12 text-dynasty-border" />
            <p className="mt-4 font-heading text-sm text-dynasty-muted">
              Search for two players to compare their attributes, stats, and grades side by side.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
