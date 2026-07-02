import { GitCompareArrows } from 'lucide-react';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import type { AttributeComparison, PlayerComparisonData } from '../hooks/usePlayerComparisonRouteData';

interface PlayerComparisonResultsPanelProps {
  data: PlayerComparisonData;
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

export function PlayerComparisonResultsPanel({ data }: PlayerComparisonResultsPanelProps) {
  return (
    <div className="space-y-6">
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
                  {data.statComparison.map((statComparison) => (
                    <tr key={statComparison.statName} className="border-b border-dynasty-border/30">
                      <td className={`px-3 py-2 text-left font-data text-sm ${advantageColor(statComparison.advantage, 'A')}`}>
                        {statComparison.playerAValue}
                      </td>
                      <td className="px-3 py-2 text-center font-heading text-xs text-dynasty-muted">
                        {statComparison.statName}
                      </td>
                      <td className={`px-3 py-2 text-right font-data text-sm ${advantageColor(statComparison.advantage, 'B')}`}>
                        {statComparison.playerBValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                {ranked.map((rankedAttribute) => (
                  <div key={rankedAttribute.attribute} className="flex items-center justify-between rounded-lg border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                    <span className="font-heading text-xs text-dynasty-muted">{rankedAttribute.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-data text-sm text-dynasty-text">{rankedAttribute.displayRating}</span>
                      <Badge variant="outline" className="font-data text-[10px]">{rankedAttribute.letterGrade}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
