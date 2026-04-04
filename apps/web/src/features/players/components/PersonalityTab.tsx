import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import type { PlayerProfileView } from './playerProfileShared';
import {
  labelize,
  moraleTone,
} from './playerProfileShared';

function PersonalityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3 text-center">
      <div className="font-heading text-[10px] uppercase text-dynasty-muted">{label}</div>
      <div className="mt-1 font-data text-2xl font-bold text-dynasty-text">{value}</div>
    </div>
  );
}

export default function PersonalityTab({
  view,
}: {
  view: PlayerProfileView;
}) {
  if (!view.player) {
    return null;
  }

  const { player, personalityProfile } = view;

  return (
    <div className="space-y-6">
      {personalityProfile ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Personality Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="info">{labelize(personalityProfile.archetype)}</Badge>
              <div className={`font-data text-lg font-bold ${moraleTone(personalityProfile.morale.score)}`}>
                Morale {personalityProfile.morale.score}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <PersonalityStat label="Work Ethic" value={personalityProfile.personality.workEthic} />
              <PersonalityStat label="Toughness" value={personalityProfile.personality.mentalToughness} />
              <PersonalityStat label="Leadership" value={personalityProfile.personality.leadership} />
              <PersonalityStat label="Compete" value={personalityProfile.personality.competitiveness} />
            </div>
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-heading text-xs uppercase text-dynasty-muted">Read</div>
              <div className="mt-1 font-heading text-sm text-dynasty-text">
                {personalityProfile.summary}
              </div>
              <div className="mt-3 font-data text-xs text-dynasty-muted">
                {personalityProfile.morale.trend.toUpperCase()} · Updated {personalityProfile.morale.lastUpdated}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center font-heading text-sm text-dynasty-muted">
            Personality telemetry is not available for this player right now.
          </CardContent>
        </Card>
      )}

      {player.personalityTraits?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Traits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {player.personalityTraits.map((trait) => (
                <Badge key={trait} variant="outline">{trait}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
