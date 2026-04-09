import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import { Users } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { TeamLogo } from '@/shared/components/TeamLogo';

interface SimilarPlayer {
  playerId: string;
  playerName: string;
  similarityScore: number;
  sharedStrengths: string[];
  primaryDifference: string;
  position: string;
  teamId: string;
  age: number;
}

interface PlayerArchetype {
  archetype: string;
  description: string;
}

interface SimilarityData {
  archetype: PlayerArchetype;
  similarPlayers: SimilarPlayer[];
}

function similarityColor(score: number): string {
  if (score >= 85) return 'text-accent-success';
  if (score >= 70) return 'text-accent-info';
  if (score >= 55) return 'text-accent-warning';
  return 'text-dynasty-muted';
}

export default function SimilarPlayersPanel({ playerId }: { playerId: string }) {
  const worker = useWorker();
  const { isInitialized } = useGameStore();
  const [data, setData] = useState<SimilarityData | null>(null);

  useEffect(() => {
    if (!isInitialized || !worker.isReady || !playerId) return;
    void (async () => {
      const result = await worker.getPlayerSimilarity(playerId);
      setData(result as SimilarityData | null);
    })();
  }, [isInitialized, worker.isReady, playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  const { archetype, similarPlayers } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent-info" />
          <CardTitle className="font-heading text-dynasty-text">Player Profile</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Archetype badge */}
        <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-accent-primary/20 text-accent-primary">
              {archetype.archetype}
            </Badge>
          </div>
          <p className="mt-2 font-heading text-sm text-dynasty-muted">
            {archetype.description}
          </p>
        </div>

        {/* Similar players */}
        {similarPlayers.length > 0 && (
          <div className="space-y-2">
            <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
              Similar Players
            </div>
            {similarPlayers.map((sp) => (
              <Link
                key={sp.playerId}
                to={`/players/${sp.playerId}`}
                className="flex items-center gap-3 rounded-lg border border-dynasty-border bg-dynasty-elevated p-3 transition-colors hover:border-accent-primary/30"
              >
                <TeamLogo teamId={sp.teamId} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-sm text-dynasty-text">{sp.playerName}</div>
                  <div className="font-data text-xs text-dynasty-muted">
                    {sp.position} · Age {sp.age}
                  </div>
                  {sp.sharedStrengths.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sp.sharedStrengths.map((s) => (
                        <Badge key={s} variant="outline" className="font-data text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`font-data text-lg font-bold ${similarityColor(sp.similarityScore)}`}>
                    {sp.similarityScore}
                  </div>
                  <div className="font-data text-[10px] text-dynasty-muted">match</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {similarPlayers.length === 0 && (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 text-center font-heading text-sm text-dynasty-muted">
            No similar players found in the league.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
