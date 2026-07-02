import { ArrowLeftRight } from 'lucide-react';
import { Badge } from '@mbd/ui';
import {
  dialogueUrgencyClass,
  modeBadgeClass,
  modeLabel,
  type TradeDialogueView,
} from './tradePresentation';

export interface RelationshipView {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  score: number;
  tier: 'hostile' | 'strained' | 'neutral' | 'friendly' | 'trusted';
  tooltip: string;
  lastInteractionSeason: number;
  lastEventLabel: string;
  latestMemoryDescription: string | null;
}

interface TeamOption {
  id: string;
  name: string;
  abbr: string;
}

interface TradeBuilderContextPanelProps {
  activeCounterOfferId: string | null;
  disabledReason: string;
  gmDialogue: TradeDialogueView | null;
  onOpenMultiTeamBuilder: () => void;
  onSelectTeam: (teamId: string) => void;
  otherTeams: TeamOption[];
  relationshipsByTeamId: Map<string, RelationshipView>;
  selectedRelationship: RelationshipView | null;
  selectedTeam: string;
  tradeMarketOpen: boolean;
}

function relationshipTone(tier: RelationshipView['tier']): string {
  switch (tier) {
    case 'hostile':
      return 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger';
    case 'strained':
      return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
    case 'friendly':
      return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
    case 'trusted':
      return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
    case 'neutral':
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function relationshipLabel(tier: RelationshipView['tier']): string {
  switch (tier) {
    case 'hostile':
      return 'Hostile';
    case 'strained':
      return 'Strained';
    case 'friendly':
      return 'Friendly';
    case 'trusted':
      return 'Trusted';
    case 'neutral':
    default:
      return 'Neutral';
  }
}

export default function TradeBuilderContextPanel({
  activeCounterOfferId,
  disabledReason,
  gmDialogue,
  onOpenMultiTeamBuilder,
  onSelectTeam,
  otherTeams,
  relationshipsByTeamId,
  selectedRelationship,
  selectedTeam,
  tradeMarketOpen,
}: TradeBuilderContextPanelProps) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold text-dynasty-text">
            {activeCounterOfferId ? 'Counter Offer Builder' : 'Trade Builder'}
          </h2>
          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {activeCounterOfferId ? 'Loaded from trade inbox' : 'Direct proposal to another front office'}
          </p>
          {selectedRelationship ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                {selectedRelationship.teamAbbreviation}
              </span>
              <Badge className={relationshipTone(selectedRelationship.tier)} title={selectedRelationship.tooltip}>
                {relationshipLabel(selectedRelationship.tier)}
              </Badge>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={onOpenMultiTeamBuilder}
            disabled={!tradeMarketOpen}
            title={!tradeMarketOpen ? disabledReason : 'Build a three- or four-team framework'}
            className="focus-ring inline-flex items-center gap-2 rounded-md border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-accent-info transition-colors hover:bg-accent-info/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftRight className="h-4 w-4" />
            3+ Team Trade
          </button>
          <select
            value={selectedTeam}
            onChange={(event) => onSelectTeam(event.target.value)}
            className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-sm text-dynasty-text focus:border-accent-primary focus:outline-none"
          >
            <option value="">Select a team...</option>
            {otherTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.abbr} - {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 grid gap-2 lg:grid-cols-2">
        {otherTeams.map((team) => {
          const relationship = relationshipsByTeamId.get(team.id) ?? null;
          const active = selectedTeam === team.id;

          return (
            <button
              key={team.id}
              type="button"
              onClick={() => onSelectTeam(team.id)}
              className={[
                'focus-ring flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                active
                  ? 'border-accent-primary/40 bg-accent-primary/10'
                  : 'border-dynasty-border bg-dynasty-elevated hover:border-accent-primary/30 hover:bg-dynasty-surface',
              ].join(' ')}
              title={relationship?.tooltip ?? `${team.abbr} - ${team.name}`}
            >
              <div className="min-w-0">
                <div className="font-heading text-sm text-dynasty-textBright">
                  {team.abbr} · {team.name}
                </div>
                <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {relationship?.latestMemoryDescription ?? 'No trade memory logged'}
                </div>
              </div>
              <Badge className={relationshipTone(relationship?.tier ?? 'neutral')}>
                {relationshipLabel(relationship?.tier ?? 'neutral')}
              </Badge>
            </button>
          );
        })}
      </div>

      {selectedRelationship ? (
        <div className="mb-4 rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">GM personality and memory</div>
              <div className="mt-2 font-heading text-sm text-dynasty-textBright">
                {selectedRelationship.teamName} front office: {relationshipLabel(selectedRelationship.tier)} room
              </div>
              <div className="mt-1 font-heading text-xs text-dynasty-muted">
                {selectedRelationship.latestMemoryDescription ?? 'No prior trade memory is influencing this call yet.'}
              </div>
            </div>
            <div className="grid gap-2 text-right">
              <div className="font-data text-lg text-dynasty-textBright">{selectedRelationship.score}</div>
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                {selectedRelationship.lastEventLabel} · S{selectedRelationship.lastInteractionSeason}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {gmDialogue ? (
        <div className={`mb-4 rounded-lg border px-4 py-3 ${dialogueUrgencyClass(gmDialogue.urgency)}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">Negotiation Flow</span>
            <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(gmDialogue.mode)}`}>
              {modeLabel(gmDialogue.mode)}
            </span>
          </div>
          <p className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">{gmDialogue.headline}</p>
          <div className="mt-3 space-y-2">
            {gmDialogue.lines.map((line) => (
              <p key={line} className="rounded border border-dynasty-border bg-dynasty-surface/70 px-3 py-2 font-heading text-xs text-dynasty-text">
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
