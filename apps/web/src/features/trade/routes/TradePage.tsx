import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TradeAsset, TradeCondition } from '@mbd/contracts';
import { TEAMS } from '@mbd/sim-core';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Check,
  Inbox,
  RotateCcw,
  Scale,
  X,
} from 'lucide-react';
import { Badge, Skeleton } from '@mbd/ui';
import { useSearchParams } from 'react-router-dom';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import { PageShell } from '@/shared/components/PageShell';
import { ProgressFill } from '@/shared/components/ProgressFill';
import { useWorker } from '@/shared/hooks/useWorker';
import { PageHelp } from '@/shared/components/PageHelp';
import DeadlineDramaPanel from '../components/DeadlineDramaPanel';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine } from '@/shared/lib/audio';
import { gradeBadgeColor } from '@/shared/lib/grade';
import { logger } from '@/shared/lib/logger';
import { loadGameById, saveGameById, scheduleAutoSave } from '@/shared/lib/saveSystem';
import { humanizeLabel } from '@/shared/lib/labels';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type {
  TradeAssetView,
  TradeOfferView,
  TradeHistoryView,
  TradeDeadlineRecapView,
  TradeDeadlineStateView,
  TradeAssetInventoryView,
  TradeNegotiationView,
  TradeNegotiationActionResult,
  MultiTeamFairnessView,
} from '@/workers/sim.worker.trade';

interface HotTradeOfferView extends TradeOfferView {
  urgencyTag: 'ACTIVE' | 'EXPIRING SOON' | 'FINAL OFFER';
  bidderCount: number;
  biddingSummary: string | null;
  dialogue: TradeDialogueView;
}

interface TradeTickerItem {
  id: string;
  summary: string;
  timestamp: string;
}

interface TradeDialogueView {
  mode: 'buyer' | 'seller' | 'standing_pat';
  urgency: 'low' | 'medium' | 'high';
  headline: string;
  lines: string[];
}

interface TradeChatterItem {
  id: string;
  headline: string;
  detail: string;
  mode: 'buyer' | 'seller' | 'standing_pat';
  teamId: string | null;
}

interface TradeInventoryPickView {
  key: string;
  label: string;
  detail: string;
  asset: Extract<TradeAsset, { type: 'draft_pick' }>;
}

type DraftPickAsset = Extract<TradeAsset, { type: 'draft_pick' }>;

interface TradeResult {
  status: 'accepted' | 'rejected' | 'counter' | 'declined';
  message: string;
}

interface RelationshipView {
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

type MultiTeamRole = 'initiator' | 'partner' | 'facilitator';
type AssetFilter = 'all' | 'mlb' | 'prospects' | 'pitchers' | 'hitters' | 'selected';

interface MultiTeamLaneState {
  laneId: string;
  teamId: string;
  role: MultiTeamRole;
  outgoing: Array<{
    playerId: string;
    destinationTeamId: string;
  }>;
}

interface MultiTeamProposalPayload {
  teams: Array<{
    teamId: string;
    role: MultiTeamRole;
    sendingPlayerIds: string[];
    receivingPlayerIds: string[];
  }>;
  conditions: TradeCondition[];
}

interface MultiTeamTradeProposalResult {
  success: boolean;
  accepted: boolean;
  message: string;
  narrative: string;
  fairness: MultiTeamFairnessView | null;
  blockingTeamId?: string;
  blockReason?: string;
}

interface MultiTeamTradeExecutionResult {
  success: boolean;
  accepted: boolean;
  message: string;
  narrative: string;
  fairness: MultiTeamFairnessView | null;
  cascadeEvents: Array<{
    triggeredTradeId: string;
    reason: string;
    affectedTeamIds: string[];
  }>;
  pendingTrades: Array<{
    id: string;
    requiredPlayerId?: string;
    triggerCondition: string;
  }>;
}

interface ConditionalClauseResult {
  success: boolean;
  message: string;
  condition: TradeCondition | null;
}

const EMPTY_TRADE_ASSET_INVENTORY: TradeAssetInventoryView = {
  draftPicks: [],
  ifaRemaining: 0,
};

const ALL_TEAMS = TEAMS.map((t) => ({ id: t.id, name: t.name, abbr: t.abbreviation }));
const MULTI_TEAM_ROLE_ORDER: MultiTeamRole[] = ['initiator', 'partner', 'facilitator', 'facilitator'];

function normalizeMultiTeamRoles(lanes: MultiTeamLaneState[]): MultiTeamLaneState[] {
  return lanes.map((lane, index) => ({
    ...lane,
    role: MULTI_TEAM_ROLE_ORDER[index] ?? 'facilitator',
  }));
}

function buildInitialMultiTeamLanes(
  userTeamId: string,
  selectedTeam: string,
): MultiTeamLaneState[] {
  const candidateTeamIds = ALL_TEAMS
    .map((team) => team.id)
    .filter((teamId) => teamId !== userTeamId);
  const secondTeamId = selectedTeam || candidateTeamIds[0] || '';
  const thirdTeamId = candidateTeamIds.find((teamId) => teamId !== secondTeamId) ?? '';

  return normalizeMultiTeamRoles([
    { laneId: 'lane-1', teamId: userTeamId, role: 'initiator', outgoing: [] },
    { laneId: 'lane-2', teamId: secondTeamId, role: 'partner', outgoing: [] },
    { laneId: 'lane-3', teamId: thirdTeamId, role: 'facilitator', outgoing: [] },
  ]);
}

function sortPlayerList(players: PlayerDTO[]): PlayerDTO[] {
  return [...players].sort((left, right) =>
    right.displayRating - left.displayRating
    || left.lastName.localeCompare(right.lastName)
    || left.firstName.localeCompare(right.firstName)
    || left.id.localeCompare(right.id),
  );
}

function teamDisplayName(teamId: string): string {
  const team = ALL_TEAMS.find((candidate) => candidate.id === teamId);
  return team ? `${team.abbr} - ${team.name}` : teamId.toUpperCase();
}

function multiTeamRoleLabel(role: MultiTeamRole): string {
  switch (role) {
    case 'initiator':
      return 'Initiator';
    case 'partner':
      return 'Partner';
    case 'facilitator':
    default:
      return 'Facilitator';
  }
}

function multiTeamProposalFromLanes(
  lanes: MultiTeamLaneState[],
  conditions: TradeCondition[],
): MultiTeamProposalPayload {
  return {
    teams: lanes
      .filter((lane) => lane.teamId)
      .map((lane) => ({
        teamId: lane.teamId,
        role: lane.role,
        sendingPlayerIds: [...new Set(lane.outgoing.map((assignment) => assignment.playerId))].sort(),
        receivingPlayerIds: [...new Set(
          lanes.flatMap((candidate) =>
            candidate.outgoing
              .filter((assignment) => assignment.destinationTeamId === lane.teamId)
              .map((assignment) => assignment.playerId),
          ),
        )].sort(),
      })),
    conditions: [...conditions],
  };
}

function estimateValue(player: PlayerDTO): number {
  const ageFactor = Math.max(0, 1 - (player.age - 24) * 0.04);
  return player.overallRating * (0.6 + ageFactor * 0.4);
}

function fairnessRatio(offerValue: number, requestValue: number): number {
  const total = offerValue + requestValue;
  if (total === 0) return 0.5;
  return offerValue / total;
}

function fairnessLabel(ratio: number): { text: string; color: string } {
  if (ratio < 0.3) return { text: 'Heavily favors you', color: 'text-accent-danger' };
  if (ratio < 0.45) return { text: 'Slightly favors you', color: 'text-accent-warning' };
  if (ratio <= 0.55) return { text: 'Fair trade', color: 'text-accent-success' };
  if (ratio <= 0.7) return { text: 'Slightly favors them', color: 'text-accent-warning' };
  return { text: 'Heavily favors them', color: 'text-accent-danger' };
}

function fairnessText(score: number, fromTeam: string, toTeam: string): string {
  if (Math.abs(score) <= 10) return 'Balanced';
  return score > 0 ? `Favored ${fromTeam}` : `Favored ${toTeam}`;
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

function assetFilterLabel(filter: AssetFilter): string {
  switch (filter) {
    case 'mlb':
      return 'MLB';
    case 'prospects':
      return 'Prospects';
    case 'pitchers':
      return 'Pitchers';
    case 'hitters':
      return 'Hitters';
    case 'selected':
      return 'Selected';
    case 'all':
      return 'All';
  }
}

function playerMatchesAssetFilter(player: PlayerDTO, filter: AssetFilter, selectedIds: string[]): boolean {
  switch (filter) {
    case 'mlb':
      return player.rosterStatus === 'MLB';
    case 'prospects':
      return player.age <= 25 || ((player.ceiling ?? player.displayRating) - player.displayRating >= 8);
    case 'pitchers':
      return player.position === 'SP' || player.position === 'RP' || player.position === 'CL';
    case 'hitters':
      return player.position !== 'SP' && player.position !== 'RP' && player.position !== 'CL';
    case 'selected':
      return selectedIds.includes(player.id);
    case 'all':
      return true;
  }
}

function buildMarketPhaseCopy(
  currentPhase: string,
  deadlineState: TradeDeadlineStateView | null,
  tradeMarketOpen: boolean,
): { headline: string; detail: string; disabledReason: string } {
  if (tradeMarketOpen) {
    const days = deadlineState?.daysUntilDeadline ?? 0;
    return {
      headline: `${days} days until trade deadline`,
      detail: deadlineState?.deadlineMode
        ? 'Phones are hot. Formal proposals, counters, and multi-team frameworks are available.'
        : 'Regular-season trade calls are open. Shape a package or resume an active talk.',
      disabledReason: '',
    };
  }

  if (currentPhase === 'spring_training') {
    return {
      headline: 'Spring Training trade desk',
      detail: 'Clubs are listening and scouting fits. Formal trade proposals unlock on Opening Day.',
      disabledReason: 'Formal offers unlock on Opening Day.',
    };
  }

  if (currentPhase === 'offseason') {
    return {
      headline: 'Offseason roster market',
      detail: 'Use free agency and offseason tools now. Regular-season trade calls open after camp.',
      disabledReason: 'Use offseason roster tools until the regular-season trade market opens.',
    };
  }

  if (currentPhase === 'playoffs') {
    return {
      headline: 'Postseason roster freeze',
      detail: 'The postseason locks trade activity. Review history and prepare offseason targets.',
      disabledReason: 'Postseason trade activity is frozen.',
    };
  }

  return {
    headline: 'Deadline has passed',
    detail: 'The regular-season trade deadline has passed. Talks reopen after the season.',
    disabledReason: 'The trade deadline has passed.',
  };
}

function modeBadgeClass(mode: TradeDialogueView['mode'] | TradeChatterItem['mode']): string {
  switch (mode) {
    case 'buyer':
      return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
    case 'seller':
      return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function modeLabel(mode: TradeDialogueView['mode'] | TradeChatterItem['mode']): string {
  switch (mode) {
    case 'buyer':
      return 'Buyer';
    case 'seller':
      return 'Seller';
    default:
      return 'Standing Pat';
  }
}

function dialogueUrgencyClass(urgency: TradeDialogueView['urgency']): string {
  switch (urgency) {
    case 'high':
      return 'border-accent-danger/30 bg-accent-danger/10';
    case 'medium':
      return 'border-accent-warning/30 bg-accent-warning/10';
    default:
      return 'border-dynasty-border bg-dynasty-elevated';
  }
}

function playerAsset(playerId: string): TradeAsset {
  return {
    type: 'player',
    playerId,
  };
}

function draftPickValue(asset: DraftPickAsset, currentSeason: number): number {
  return Math.max(2, 24 - asset.round) * (asset.season === currentSeason ? 3 : 2.5);
}

function draftPickKey(asset: DraftPickAsset): string {
  return `draft:${asset.season}:${asset.round}:${asset.originalTeamId}`;
}

function parsePoolAmount(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Number(amount.toFixed(2));
}

function poolAsset(amount: number): Extract<TradeAsset, { type: 'ifa_pool_space' }> {
  return {
    type: 'ifa_pool_space',
    amount: Number(amount.toFixed(2)),
  };
}

function toggleDraftPickAsset(current: DraftPickAsset[], asset: DraftPickAsset): DraftPickAsset[] {
  const key = draftPickKey(asset);
  if (current.some((candidate) => draftPickKey(candidate) === key)) {
    return current.filter((candidate) => draftPickKey(candidate) !== key);
  }
  return [...current, asset];
}

function buildTradeAssetLabel(
  asset: TradeAsset,
  resolvePlayer: (playerId: string) => PlayerDTO | undefined,
): string {
  switch (asset.type) {
    case 'player': {
      const player = resolvePlayer(asset.playerId);
      if (!player) {
        return asset.playerId;
      }
      return `${player.firstName[0]}. ${player.lastName} · ${player.position}`;
    }
    case 'draft_pick':
      return `R${asset.round} ${asset.season} · ${asset.originalTeamId.toUpperCase()} original`;
    case 'ifa_pool_space':
      return `IFA Pool · $${asset.amount.toFixed(2)}M`;
  }
}

function tradeAssetValue(
  asset: TradeAsset,
  currentSeason: number,
  resolvePlayer: (playerId: string) => PlayerDTO | undefined,
): number {
  switch (asset.type) {
    case 'player': {
      const player = resolvePlayer(asset.playerId);
      return player ? estimateValue(player) : 0;
    }
    case 'draft_pick':
      return draftPickValue(asset, currentSeason);
    case 'ifa_pool_space':
      return asset.amount * 8;
  }
}

function playerIdsFromAssetViews(assets: TradeAssetView[]): string[] {
  return assets.flatMap((asset) =>
    asset.asset.type === 'player' ? [asset.asset.playerId] : [],
  );
}

function draftPickAssetsFromViews(assets: TradeAssetView[]): DraftPickAsset[] {
  return assets.flatMap((asset) =>
    asset.asset.type === 'draft_pick' ? [asset.asset] : [],
  );
}

function ifaAmountFromViews(assets: TradeAssetView[]): string {
  const amount = assets.reduce(
    (sum, asset) => sum + (asset.asset.type === 'ifa_pool_space' ? asset.asset.amount : 0),
    0,
  );
  return amount > 0 ? amount.toFixed(2) : '';
}

function playerIdsFromAssets(assets: TradeAsset[]): string[] {
  return assets.flatMap((asset) => asset.type === 'player' ? [asset.playerId] : []);
}

function draftPickAssetsFromAssets(assets: TradeAsset[]): DraftPickAsset[] {
  return assets.flatMap((asset) => asset.type === 'draft_pick' ? [asset] : []);
}

function ifaAmountFromAssets(assets: TradeAsset[]): string {
  const amount = assets.reduce(
    (sum, asset) => sum + (asset.type === 'ifa_pool_space' ? asset.amount : 0),
    0,
  );
  return amount > 0 ? amount.toFixed(2) : '';
}

function PlayerRow({
  player,
  selected,
  disabled,
  onClick,
}: {
  player: PlayerDTO;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={() => {
        if (!disabled) onClick();
      }}
      className={`border-b border-dynasty-border/50 text-sm transition-colors ${
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer'
      } ${selected ? 'bg-accent-primary/15' : disabled ? '' : 'hover:bg-dynasty-elevated'}`}
    >
      <td className="px-3 py-1.5 font-heading font-medium text-dynasty-text">
        {player.firstName} {player.lastName}
      </td>
      <td className="px-2 py-1.5 font-data text-dynasty-muted">{player.position}</td>
      <td className="px-2 py-1.5 text-right font-data text-dynasty-text">{player.displayRating}</td>
      <td className="px-2 py-1.5 text-center">
        <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeBadgeColor(player.letterGrade)}`}>
          {player.letterGrade}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right font-data text-dynasty-muted">{player.age}</td>
    </tr>
  );
}

function AssetFilterBar({
  value,
  onChange,
  selectedCount,
}: {
  value: AssetFilter;
  onChange: (filter: AssetFilter) => void;
  selectedCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['all', 'mlb', 'prospects', 'pitchers', 'hitters', 'selected'] as AssetFilter[]).map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide transition-colors ${
            value === filter
              ? 'border-accent-info/50 bg-accent-info/10 text-accent-info'
              : 'border-dynasty-border text-dynasty-muted hover:border-accent-info/40 hover:text-accent-info'
          }`}
        >
          {assetFilterLabel(filter)}
          {filter === 'selected' ? ` · ${selectedCount}` : ''}
        </button>
      ))}
    </div>
  );
}

function MultiTeamLaneCard({
  lane,
  roster,
  teamOptions,
  destinationOptions,
  teamSelectionLocked,
  disabled,
  onChangeTeam,
  onTogglePlayer,
  onChangeDestination,
}: {
  lane: MultiTeamLaneState;
  roster: PlayerDTO[];
  teamOptions: Array<{ id: string; label: string; disabled: boolean }>;
  destinationOptions: Array<{ id: string; label: string }>;
  teamSelectionLocked: boolean;
  disabled: boolean;
  onChangeTeam: (teamId: string) => void;
  onTogglePlayer: (playerId: string) => void;
  onChangeDestination: (playerId: string, destinationTeamId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">
            {multiTeamRoleLabel(lane.role)}
          </div>
          <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            Build outgoing assignments for this lane
          </div>
        </div>
        <select
          value={lane.teamId}
          onChange={(event) => onChangeTeam(event.target.value)}
          disabled={disabled || teamSelectionLocked}
          className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {teamOptions.map((team) => (
            <option key={team.id} value={team.id} disabled={team.disabled}>
              {team.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
        {roster.length === 0 ? (
          <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-4 font-heading text-xs text-dynasty-muted">
            No roster loaded for this lane yet.
          </div>
        ) : (
          roster.map((player) => {
            const assignment = lane.outgoing.find((candidate) => candidate.playerId === player.id) ?? null;
            return (
              <div
                key={player.id}
                className={`rounded border px-3 py-2 ${
                  assignment
                    ? 'border-accent-primary/40 bg-accent-primary/10'
                    : 'border-dynasty-border bg-dynasty-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onTogglePlayer(player.id)}
                    disabled={disabled}
                    className="focus-ring flex-1 text-left"
                  >
                    <div className="font-heading text-sm text-dynasty-text">
                      {player.firstName} {player.lastName}
                    </div>
                    <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      {player.position} · {player.displayRating} OVR · Age {player.age}
                    </div>
                  </button>
                  <Badge className={assignment ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary' : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted'}>
                    {assignment ? 'In Framework' : 'Available'}
                  </Badge>
                </div>

                {assignment ? (
                  <div className="mt-3">
                    <label className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      Destination Club
                    </label>
                    <select
                      value={assignment.destinationTeamId}
                      onChange={(event) => onChangeDestination(player.id, event.target.value)}
                      disabled={disabled}
                      className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {destinationOptions.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  onAccept,
  onCounter,
  onDecline,
}: {
  offer: HotTradeOfferView;
  onAccept: () => void;
  onCounter: () => void;
  onDecline: () => void;
}) {
  const evaluation = fairnessText(-offer.fairnessScore, 'Them', 'You');
  const urgencyTone = offer.urgencyTag === 'FINAL OFFER'
    ? 'border-accent-danger/50 bg-accent-danger/10 text-accent-danger'
    : offer.urgencyTag === 'EXPIRING SOON'
      ? 'border-accent-warning/50 bg-accent-warning/10 text-accent-warning'
      : 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-sm font-semibold text-dynasty-textBright">{offer.fromTeamName}</p>
          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {offer.createdAt} · {evaluation}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${urgencyTone}`}>
            {offer.urgencyTag}
          </span>
          <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(offer.dialogue.mode)}`}>
            {modeLabel(offer.dialogue.mode)}
          </span>
          <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {offer.fromTeamAbbreviation}
          </span>
        </div>
      </div>

      <p className="mt-3 font-heading text-sm text-dynasty-text">{offer.message}</p>
      {offer.biddingSummary ? (
        <p className="mt-2 rounded border border-accent-warning/30 bg-accent-warning/10 px-3 py-2 font-heading text-xs text-accent-warning">
          {offer.biddingSummary}
        </p>
      ) : null}
      <div className={`mt-3 rounded border px-3 py-3 ${dialogueUrgencyClass(offer.dialogue.urgency)}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">GM Dialogue</p>
          <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(offer.dialogue.mode)}`}>
            {humanizeLabel(offer.dialogue.urgency)}
          </span>
        </div>
        <p className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">{offer.dialogue.headline}</p>
        <div className="mt-2 space-y-2">
          {offer.dialogue.lines.map((line) => (
            <p key={`${offer.id}-${line}`} className="rounded border border-dynasty-border bg-dynasty-surface/70 px-3 py-2 font-heading text-xs text-dynasty-text">
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
          <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-accent-success">They Offer</p>
          <div className="mt-2 space-y-1">
            {offer.offeringAssets.map((asset) => (
              <p key={asset.key} className="font-data text-xs text-dynasty-text">
                {asset.label} · {asset.detail}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
          <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-accent-warning">They Want</p>
          <div className="mt-2 space-y-1">
            {offer.requestingAssets.map((asset) => (
              <p key={asset.key} className="font-data text-xs text-dynasty-text">
                {asset.label} · {asset.detail}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onAccept}
          className="inline-flex items-center gap-2 rounded-md bg-accent-success px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-success/80"
        >
          <Check className="h-4 w-4" /> Accept
        </button>
        <button
          onClick={onCounter}
          className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info"
        >
          <ArrowLeftRight className="h-4 w-4" /> Counter
        </button>
        <button
          onClick={onDecline}
          className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-muted transition-colors hover:border-accent-danger hover:text-accent-danger"
        >
          <X className="h-4 w-4" /> Decline
        </button>
      </div>
    </div>
  );
}

function DeadlineTheatreCard({ deadlineState }: { deadlineState: TradeDeadlineStateView | null }) {
  if (!deadlineState) {
    return null;
  }

  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {deadlineState.countdownLabel}
            </span>
            <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(deadlineState.teamMode)}`}>
              {modeLabel(deadlineState.teamMode)}
            </span>
          </div>
          <h2 className="mt-3 font-heading text-lg font-semibold text-dynasty-textBright">Trade Deadline Theatre</h2>
          <p className="mt-2 max-w-2xl font-heading text-sm text-dynasty-muted">{deadlineState.modeSummary}</p>
        </div>
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-3">
          <p className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Market State</p>
          <p className="mt-1 font-heading text-sm text-dynasty-text">
            {deadlineState.deadlineMode ? 'Phones are hot and the market is in deadline mode.' : 'The market is operating outside the final frenzy window.'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {deadlineState.chatter.map((item) => (
          <div key={item.id} className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-sm font-semibold text-dynasty-textBright">{item.headline}</p>
              <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(item.mode)}`}>
                {modeLabel(item.mode)}
              </span>
            </div>
            <p className="mt-2 font-heading text-xs text-dynasty-muted">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TradeSkeleton() {
  return (
    <div className="space-y-4" data-testid="trade-loading">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-16 rounded-lg" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Skeleton className="h-[32rem] rounded-lg xl:col-span-4" />
        <Skeleton className="h-[32rem] rounded-lg xl:col-span-8" />
      </div>
    </div>
  );
}

function HistoryCard({ trade }: { trade: TradeHistoryView }) {
  const evaluation = fairnessText(trade.fairnessScore, trade.fromTeamAbbreviation, trade.toTeamAbbreviation);
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-sm font-semibold text-dynasty-textBright">
            {trade.fromTeamAbbreviation} ↔ {trade.toTeamAbbreviation}
          </p>
          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {trade.timestamp} · {evaluation}
          </p>
        </div>
        <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
          {trade.offeringAssets.length + trade.requestingAssets.length} assets
        </span>
      </div>
      <p className="mt-3 font-heading text-sm text-dynasty-text">{trade.summary}</p>
    </div>
  );
}

function NegotiationSummaryCard({
  active,
  negotiation,
  onResume,
  playerById,
}: {
  active: boolean;
  negotiation: TradeNegotiationView;
  onResume: () => void;
  playerById: (id: string) => PlayerDTO | undefined;
}) {
  const lastLine = negotiation.dialogue.at(-1)?.text ?? 'The front office is waiting on your next move.';
  const offeringLabels = negotiation.proposal.offeringAssets
    .map((asset) => buildTradeAssetLabel(asset, playerById))
    .slice(0, 3);
  const requestingLabels = negotiation.proposal.requestingAssets
    .map((asset) => buildTradeAssetLabel(asset, playerById))
    .slice(0, 3);

  return (
    <div
      className={[
        'rounded-lg border px-3 py-3 transition-colors',
        active
          ? 'border-accent-info/50 bg-accent-info/10'
          : 'border-dynasty-border bg-dynasty-elevated',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">
            {negotiation.teamAbbreviation} · Round {Math.max(1, negotiation.roundsCompleted)}
          </div>
          <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {humanizeLabel(negotiation.phase)} · expires D{negotiation.expiresAtDay}
          </div>
        </div>
        <Badge className={active ? 'border-accent-info/40 bg-accent-info/10 text-accent-info' : 'border-dynasty-border text-dynasty-muted'}>
          {active ? 'Loaded' : 'Open'}
        </Badge>
      </div>

      <p className="mt-3 font-heading text-xs text-dynasty-text">{lastLine}</p>

      <div className="mt-3 grid gap-2">
        <div className="rounded border border-dynasty-border/70 bg-dynasty-surface/70 px-2 py-2">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">You Send</div>
          <div className="mt-1 font-heading text-xs text-dynasty-text">
            {offeringLabels.join(', ') || 'No outgoing assets'}
          </div>
        </div>
        <div className="rounded border border-dynasty-border/70 bg-dynasty-surface/70 px-2 py-2">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">You Receive</div>
          <div className="mt-1 font-heading text-xs text-dynasty-text">
            {requestingLabels.join(', ') || 'No incoming assets'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onResume}
        className="focus-ring mt-3 w-full rounded-md border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-accent-info transition-colors hover:bg-accent-info/20"
      >
        Resume Talk
      </button>
    </div>
  );
}

export default function TradePage() {
  const worker = useWorker();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    getTeamRoster,
    getTradeHistory,
    getTradeDeadlineState,
    getTradeDialogue,
    getTradeAssetInventory,
    getRelationships,
    getOpenNegotiations,
    evaluateMultiTeamFairness,
    generateConditionalClause,
    startNegotiation,
    advanceNegotiation,
    resolveNegotiation,
    proposeMultiTeam,
    executeMultiTeamTrade,
    proposeTrade,
    respondToTradeOffer,
    exportSnapshot,
    getSeasonFlowState,
  } = worker;
  const {
    userTeamId,
    isInitialized,
    day,
    season,
    phase,
    activeSaveId,
    activeSaveSlot,
    gmName,
    teamName,
  } = useGameStore();

  const [selectedTeam, setSelectedTeam] = useState('');
  const [yourRoster, setYourRoster] = useState<PlayerDTO[]>([]);
  const [targetRoster, setTargetRoster] = useState<PlayerDTO[]>([]);
  const [yourInventory, setYourInventory] = useState<TradeAssetInventoryView>(EMPTY_TRADE_ASSET_INVENTORY);
  const [targetInventory, setTargetInventory] = useState<TradeAssetInventoryView>(EMPTY_TRADE_ASSET_INVENTORY);
  const [offering, setOffering] = useState<string[]>([]);
  const [requesting, setRequesting] = useState<string[]>([]);
  const [offeringPicks, setOfferingPicks] = useState<DraftPickAsset[]>([]);
  const [requestingPicks, setRequestingPicks] = useState<DraftPickAsset[]>([]);
  const [offeringIFAAmount, setOfferingIFAAmount] = useState('');
  const [requestingIFAAmount, setRequestingIFAAmount] = useState('');
  const [incomingOffers, setIncomingOffers] = useState<HotTradeOfferView[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryView[]>([]);
  const [openNegotiations, setOpenNegotiations] = useState<TradeNegotiationView[]>([]);
  const [openNegotiationsLoading, setOpenNegotiationsLoading] = useState(false);
  const [deadlineState, setDeadlineState] = useState<TradeDeadlineStateView | null>(null);
  const [seasonFlowStatus, setSeasonFlowStatus] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<RelationshipView[]>([]);
  const [gmDialogue, setGmDialogue] = useState<TradeDialogueView | null>(null);
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [activeNegotiation, setActiveNegotiation] = useState<TradeNegotiationView | null>(null);
  const [multiTeamOpen, setMultiTeamOpen] = useState(false);
  const [multiTeamLanes, setMultiTeamLanes] = useState<MultiTeamLaneState[]>([]);
  const [multiTeamRosters, setMultiTeamRosters] = useState<Record<string, PlayerDTO[]>>({});
  const [multiTeamConditions, setMultiTeamConditions] = useState<TradeCondition[]>([]);
  const [multiTeamConditionPlayerId, setMultiTeamConditionPlayerId] = useState('');
  const [multiTeamFairness, setMultiTeamFairness] = useState<MultiTeamFairnessView | null>(null);
  const [multiTeamProposalResult, setMultiTeamProposalResult] = useState<MultiTeamTradeProposalResult | null>(null);
  const [multiTeamExecutionResult, setMultiTeamExecutionResult] = useState<MultiTeamTradeExecutionResult | null>(null);
  const [multiTeamMessage, setMultiTeamMessage] = useState<string | null>(null);
  const [multiTeamSubmitting, setMultiTeamSubmitting] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [activeCounterOfferId, setActiveCounterOfferId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [yourAssetFilter, setYourAssetFilter] = useState<AssetFilter>('all');
  const [targetAssetFilter, setTargetAssetFilter] = useState<AssetFilter>('all');

  const workerReady = worker.isReady;
  const preselectedPlayerId = searchParams.get('playerId');
  const linkedNegotiationId = searchParams.get('negotiationId');
  const otherTeams = ALL_TEAMS.filter((team) => team.id !== userTeamId);
  const effectivePhase = seasonFlowStatus === 'preseason' ? 'spring_training' : (deadlineState?.currentPhase ?? phase);
  const tradeMarketOpen = effectivePhase === 'regular' && (
    (deadlineState?.deadlineMode ?? false) || ((deadlineState?.daysUntilDeadline ?? -1) > 0)
  );
  const marketCopy = useMemo(
    () => buildMarketPhaseCopy(effectivePhase, deadlineState, tradeMarketOpen),
    [deadlineState, effectivePhase, tradeMarketOpen],
  );
  const relationshipsByTeamId = useMemo(
    () => new Map(relationships.map((relationship) => [relationship.teamId, relationship])),
    [relationships],
  );
  const selectedRelationship = selectedTeam ? (relationshipsByTeamId.get(selectedTeam) ?? null) : null;
  const filteredYourRoster = useMemo(
    () => yourRoster.filter((player) => playerMatchesAssetFilter(player, yourAssetFilter, offering)),
    [offering, yourAssetFilter, yourRoster],
  );
  const filteredTargetRoster = useMemo(
    () => targetRoster.filter((player) => playerMatchesAssetFilter(player, targetAssetFilter, requesting)),
    [requesting, targetAssetFilter, targetRoster],
  );
  const multiTeamProposal = useMemo(
    () => multiTeamProposalFromLanes(multiTeamLanes, multiTeamConditions),
    [multiTeamConditions, multiTeamLanes],
  );
  const multiTeamMovedPlayers = useMemo(
    () => {
      const byPlayerId = new Map<string, { playerId: string; label: string }>();
      for (const lane of multiTeamLanes) {
        for (const assignment of lane.outgoing) {
          const player = multiTeamRosters[lane.teamId]?.find((candidate) => candidate.id === assignment.playerId);
          byPlayerId.set(assignment.playerId, {
            playerId: assignment.playerId,
            label: player
              ? `${player.firstName} ${player.lastName} (${teamDisplayName(lane.teamId)})`
              : assignment.playerId,
          });
        }
      }
      return [...byPlayerId.values()];
    },
    [multiTeamLanes, multiTeamRosters],
  );

  const loadUserRoster = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getTeamRoster(userTeamId);
    setYourRoster((data as PlayerDTO[]) ?? []);
  }, [getTeamRoster, isInitialized, userTeamId, workerReady]);

  const loadUserInventory = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getTradeAssetInventory(userTeamId);
    setYourInventory((data as TradeAssetInventoryView) ?? EMPTY_TRADE_ASSET_INVENTORY);
  }, [getTradeAssetInventory, isInitialized, userTeamId, workerReady]);

  const loadTargetRoster = useCallback(async () => {
    if (!selectedTeam || !isInitialized || !workerReady) {
      setTargetRoster([]);
      return;
    }
    const data = await getTeamRoster(selectedTeam);
    setTargetRoster((data as PlayerDTO[]) ?? []);
  }, [getTeamRoster, isInitialized, selectedTeam, workerReady]);

  const loadTargetInventory = useCallback(async () => {
    if (!selectedTeam || !isInitialized || !workerReady) {
      setTargetInventory(EMPTY_TRADE_ASSET_INVENTORY);
      return;
    }
    const data = await getTradeAssetInventory(selectedTeam);
    setTargetInventory((data as TradeAssetInventoryView) ?? EMPTY_TRADE_ASSET_INVENTORY);
  }, [getTradeAssetInventory, isInitialized, selectedTeam, workerReady]);

  const loadTradeActivity = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    try {
      const [history, deadline, flow] = await Promise.all([
        getTradeHistory(),
        getTradeDeadlineState(),
        getSeasonFlowState?.() ?? Promise.resolve(null),
      ]);
      setTradeHistory((history as TradeHistoryView[]) ?? []);
      setDeadlineState((deadline as TradeDeadlineStateView) ?? null);
      setSeasonFlowStatus((flow as { status?: string } | null)?.status ?? null);
      setIncomingOffers(((deadline as TradeDeadlineStateView | null)?.hotOffers ?? []) as HotTradeOfferView[]);
    } finally {
      setLoading(false);
    }
  }, [getSeasonFlowState, getTradeDeadlineState, getTradeHistory, isInitialized, workerReady]);

  const loadRelationshipData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const data = await getRelationships();
    setRelationships((data as RelationshipView[]) ?? []);
  }, [getRelationships, isInitialized, workerReady]);

  const loadOpenNegotiations = useCallback(async () => {
    if (!isInitialized || !workerReady) {
      setOpenNegotiations([]);
      return;
    }
    setOpenNegotiationsLoading(true);
    try {
      const data = await getOpenNegotiations();
      setOpenNegotiations((data as TradeNegotiationView[]) ?? []);
    } finally {
      setOpenNegotiationsLoading(false);
    }
  }, [getOpenNegotiations, isInitialized, workerReady]);

  const persistTradeSnapshot = useCallback(async () => {
    if (!activeSaveId) {
      return;
    }

    try {
      const snapshot = await exportSnapshot();
      const saveName = `${gmName || 'General Manager'} • ${teamName || 'Franchise'} • Season ${season}`;

      if (activeSaveSlot != null) {
        await scheduleAutoSave(activeSaveSlot, saveName, snapshot);
        return;
      }

      const existing = await loadGameById(activeSaveId);
      await saveGameById(activeSaveId, saveName, snapshot, {
        slotNumber: existing?.slotNumber ?? null,
        parentSaveId: existing?.parentSaveId ?? null,
        isRootSave: existing?.isRootSave ?? false,
        branchMeta: existing?.branchMeta ?? null,
      });
    } catch (error) {
      logger.error('Failed to autosave trade negotiation state:', error);
    }
  }, [activeSaveId, activeSaveSlot, exportSnapshot, gmName, season, teamName]);

  useEffect(() => {
    void loadUserRoster();
  }, [loadUserRoster, day, season, phase]);

  useEffect(() => {
    void loadUserInventory();
  }, [loadUserInventory, day, season, phase]);

  useEffect(() => {
    void loadTargetRoster();
  }, [loadTargetRoster, day, season, phase]);

  useEffect(() => {
    void loadTargetInventory();
  }, [loadTargetInventory, day, season, phase]);

  useEffect(() => {
    void loadTradeActivity();
  }, [loadTradeActivity, day, season, phase]);

  useEffect(() => {
    void loadRelationshipData();
  }, [loadRelationshipData, day, season, phase]);

  useEffect(() => {
    void loadOpenNegotiations();
  }, [loadOpenNegotiations, day, season, phase]);

  useEffect(() => {
    if (!multiTeamOpen || !isInitialized || !workerReady) {
      return;
    }

    const distinctTeamIds = [...new Set(multiTeamLanes.map((lane) => lane.teamId).filter(Boolean))];
    const missingTeamIds = distinctTeamIds.filter((teamId) => multiTeamRosters[teamId] == null);
    if (missingTeamIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadRosters = async () => {
      const entries = await Promise.all(
        missingTeamIds.map(async (teamId) => {
          const roster = await getTeamRoster(teamId);
          return [teamId, sortPlayerList((roster as PlayerDTO[]) ?? [])] as const;
        }),
      );

      if (cancelled) {
        return;
      }

      setMultiTeamRosters((current) => {
        const next = { ...current };
        for (const [teamId, roster] of entries) {
          next[teamId] = roster;
        }
        return next;
      });
    };

    void loadRosters();

    return () => {
      cancelled = true;
    };
  }, [getTeamRoster, isInitialized, multiTeamLanes, multiTeamOpen, multiTeamRosters, workerReady]);

  const resetMultiTeamBuilder = useCallback(() => {
    setMultiTeamOpen(false);
    setMultiTeamConditions([]);
    setMultiTeamConditionPlayerId('');
    setMultiTeamFairness(null);
    setMultiTeamProposalResult(null);
    setMultiTeamExecutionResult(null);
    setMultiTeamMessage(null);
    setMultiTeamSubmitting(false);
    setMultiTeamLanes([]);
    setMultiTeamRosters({});
  }, []);

  const openMultiTeamBuilder = useCallback(() => {
    const nextLanes = buildInitialMultiTeamLanes(userTeamId, selectedTeam);
    const nextRosters: Record<string, PlayerDTO[]> = {};
    nextRosters[userTeamId] = sortPlayerList(yourRoster);
    if (selectedTeam) {
      nextRosters[selectedTeam] = sortPlayerList(targetRoster);
    }

    setMultiTeamLanes(nextLanes);
    setMultiTeamRosters(nextRosters);
    setMultiTeamConditions([]);
    setMultiTeamConditionPlayerId('');
    setMultiTeamFairness(null);
    setMultiTeamProposalResult(null);
    setMultiTeamExecutionResult(null);
    setMultiTeamMessage(null);
    setMultiTeamOpen(true);
  }, [selectedTeam, targetRoster, userTeamId, yourRoster]);

  const setMultiTeamLaneTeam = useCallback((laneId: string, teamId: string) => {
    setMultiTeamFairness(null);
    setMultiTeamProposalResult(null);
    setMultiTeamExecutionResult(null);
    setMultiTeamMessage(null);
    setMultiTeamLanes((current) => {
      const replacedTeamId = current.find((entry) => entry.laneId === laneId)?.teamId ?? '';
      return normalizeMultiTeamRoles(current.map((lane) => (
        lane.laneId === laneId
          ? {
            ...lane,
            teamId,
            outgoing: [],
          }
          : {
            ...lane,
            outgoing: lane.outgoing.filter((assignment) => assignment.destinationTeamId !== replacedTeamId),
          }
      )));
    });
  }, []);

  const toggleMultiTeamPlayer = useCallback((laneId: string, playerId: string) => {
    setMultiTeamFairness(null);
    setMultiTeamProposalResult(null);
    setMultiTeamExecutionResult(null);
    setMultiTeamMessage(null);
    setMultiTeamLanes((current) => current.map((lane) => {
      if (lane.laneId !== laneId) {
        return lane;
      }

      const existing = lane.outgoing.find((assignment) => assignment.playerId === playerId);
      if (existing) {
        return {
          ...lane,
          outgoing: lane.outgoing.filter((assignment) => assignment.playerId !== playerId),
        };
      }

      const destinationTeamId = current
        .map((candidate) => candidate.teamId)
        .find((teamId) => teamId && teamId !== lane.teamId) ?? '';

      return {
        ...lane,
        outgoing: [...lane.outgoing, { playerId, destinationTeamId }],
      };
    }));
  }, []);

  const updateMultiTeamDestination = useCallback((laneId: string, playerId: string, destinationTeamId: string) => {
    setMultiTeamFairness(null);
    setMultiTeamProposalResult(null);
    setMultiTeamExecutionResult(null);
    setMultiTeamMessage(null);
    setMultiTeamLanes((current) => current.map((lane) => (
      lane.laneId === laneId
        ? {
          ...lane,
          outgoing: lane.outgoing.map((assignment) => (
            assignment.playerId === playerId
              ? { ...assignment, destinationTeamId }
              : assignment
          )),
        }
        : lane
    )));
  }, []);

  const addMultiTeamLane = useCallback(() => {
    setMultiTeamFairness(null);
    setMultiTeamProposalResult(null);
    setMultiTeamExecutionResult(null);
    setMultiTeamMessage(null);
    setMultiTeamLanes((current) => {
      if (current.length >= 4) {
        return current;
      }
      const usedTeamIds = new Set(current.map((lane) => lane.teamId));
      const nextTeamId = ALL_TEAMS
        .map((team) => team.id)
        .find((teamId) => !usedTeamIds.has(teamId) && teamId !== userTeamId) ?? '';
      return normalizeMultiTeamRoles([
        ...current,
        {
          laneId: `lane-${current.length + 1}`,
          teamId: nextTeamId,
          role: 'facilitator',
          outgoing: [],
        },
      ]);
    });
  }, [userTeamId]);

  const removeMultiTeamLane = useCallback((laneId: string) => {
    setMultiTeamFairness(null);
    setMultiTeamProposalResult(null);
    setMultiTeamExecutionResult(null);
    setMultiTeamMessage(null);
    setMultiTeamLanes((current) => {
      const removedTeamId = current.find((lane) => lane.laneId === laneId)?.teamId;
      return normalizeMultiTeamRoles(
        current
          .filter((lane) => lane.laneId !== laneId)
          .map((lane) => ({
            ...lane,
            outgoing: lane.outgoing.filter((assignment) => assignment.destinationTeamId !== removedTeamId),
          })),
      );
    });
  }, []);

  const evaluateCurrentMultiTeamFramework = useCallback(async () => {
    setMultiTeamSubmitting(true);
    try {
      const result = await evaluateMultiTeamFairness(multiTeamProposal) as {
        success: boolean;
        message: string;
        fairness: MultiTeamFairnessView | null;
      };
      setMultiTeamFairness(result.fairness ?? null);
      setMultiTeamMessage(result.message);
    } finally {
      setMultiTeamSubmitting(false);
    }
  }, [evaluateMultiTeamFairness, multiTeamProposal]);

  const handleAddConditionalClause = useCallback(async () => {
    const targetPlayerId = multiTeamConditionPlayerId || multiTeamMovedPlayers[0]?.playerId;
    if (!targetPlayerId) {
      setMultiTeamMessage('Select at least one moved player before adding a condition.');
      return;
    }

    setMultiTeamSubmitting(true);
    try {
      const result = await generateConditionalClause(targetPlayerId) as ConditionalClauseResult;
      setMultiTeamMessage(result.message);
      if (result.success && result.condition) {
        setMultiTeamConditions((current) => [...current, result.condition!]);
        setMultiTeamConditionPlayerId(result.condition.playerId);
      }
    } finally {
      setMultiTeamSubmitting(false);
    }
  }, [generateConditionalClause, multiTeamConditionPlayerId, multiTeamMovedPlayers]);

  const handleProposeMultiTeamFramework = useCallback(async () => {
    setMultiTeamSubmitting(true);
    try {
      const result = await proposeMultiTeam(multiTeamProposal) as MultiTeamTradeProposalResult;
      setMultiTeamProposalResult(result);
      setMultiTeamFairness(result.fairness ?? null);
      setMultiTeamMessage(result.message);
    } finally {
      setMultiTeamSubmitting(false);
    }
  }, [multiTeamProposal, proposeMultiTeam]);

  const handleExecuteMultiTeamFramework = useCallback(async () => {
    setMultiTeamSubmitting(true);
    try {
      const result = await executeMultiTeamTrade(multiTeamProposal) as MultiTeamTradeExecutionResult;
      setMultiTeamExecutionResult(result);
      setMultiTeamFairness(result.fairness ?? null);
      setMultiTeamMessage(result.message);
      setTradeResult({
        status: result.accepted ? 'accepted' : 'rejected',
        message: result.message,
      });

      await Promise.all([
        loadUserRoster(),
        loadTargetRoster(),
        loadUserInventory(),
        loadTargetInventory(),
        loadTradeActivity(),
        loadRelationshipData(),
      ]);

      if (result.accepted) {
        setMultiTeamOpen(false);
      }
    } finally {
      setMultiTeamSubmitting(false);
    }
  }, [
    executeMultiTeamTrade,
    loadRelationshipData,
    loadTargetInventory,
    loadTargetRoster,
    loadTradeActivity,
    loadUserInventory,
    loadUserRoster,
    multiTeamProposal,
  ]);

  useEffect(() => {
    if (!preselectedPlayerId) {
      return;
    }
    if (!yourRoster.some((player) => player.id === preselectedPlayerId)) {
      return;
    }
    setOffering((current) => (
      current.includes(preselectedPlayerId) ? current : [preselectedPlayerId, ...current]
    ));
  }, [preselectedPlayerId, yourRoster]);

  const toggleOffer = (id: string) => {
    setTradeResult(null);
    setOffering((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleRequest = (id: string) => {
    setTradeResult(null);
    setRequesting((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const updateNegotiationDeepLink = useCallback((negotiationId: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (negotiationId) {
      nextParams.set('negotiationId', negotiationId);
    } else {
      nextParams.delete('negotiationId');
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const resetBuilder = () => {
    setOffering([]);
    setRequesting([]);
    setOfferingPicks([]);
    setRequestingPicks([]);
    setOfferingIFAAmount('');
    setRequestingIFAAmount('');
    setActiveCounterOfferId(null);
    setActiveNegotiation(null);
    updateNegotiationDeepLink(null);
  };

  const clearTrade = () => {
    resetBuilder();
    setTradeResult(null);
  };

  const playerById = useCallback(
    (id: string) => yourRoster.find((player) => player.id === id) ?? targetRoster.find((player) => player.id === id),
    [targetRoster, yourRoster],
  );

  const applyNegotiationToBuilder = useCallback((negotiation: TradeNegotiationView | null) => {
    if (!negotiation) {
      return;
    }
    setOffering(playerIdsFromAssets(negotiation.proposal.offeringAssets));
    setRequesting(playerIdsFromAssets(negotiation.proposal.requestingAssets));
    setOfferingPicks(draftPickAssetsFromAssets(negotiation.proposal.offeringAssets));
    setRequestingPicks(draftPickAssetsFromAssets(negotiation.proposal.requestingAssets));
    setOfferingIFAAmount(ifaAmountFromAssets(negotiation.proposal.offeringAssets));
    setRequestingIFAAmount(ifaAmountFromAssets(negotiation.proposal.requestingAssets));
  }, []);

  const resumeNegotiation = useCallback((negotiation: TradeNegotiationView) => {
    setSelectedTeam(negotiation.teamId);
    setActiveCounterOfferId(null);
    setActiveNegotiation(negotiation);
    setTradeResult({
      status: 'counter',
      message: `Resumed active talks with ${negotiation.teamName}. Adjust the package or use the negotiation controls.`,
    });
    applyNegotiationToBuilder(negotiation);
    updateNegotiationDeepLink(negotiation.id);
  }, [applyNegotiationToBuilder, updateNegotiationDeepLink]);

  const offeringAssets = useMemo(() => {
    const assets: TradeAsset[] = [...offering.map(playerAsset), ...offeringPicks];
    const poolAmount = parsePoolAmount(offeringIFAAmount);
    if (poolAmount > 0) {
      assets.push(poolAsset(poolAmount));
    }
    return assets;
  }, [offering, offeringIFAAmount, offeringPicks]);

  const requestingAssets = useMemo(() => {
    const assets: TradeAsset[] = [...requesting.map(playerAsset), ...requestingPicks];
    const poolAmount = parsePoolAmount(requestingIFAAmount);
    if (poolAmount > 0) {
      assets.push(poolAsset(poolAmount));
    }
    return assets;
  }, [requesting, requestingIFAAmount, requestingPicks]);

  const offeringSummary = useMemo(
    () => offeringAssets.map((asset) => ({
      key:
        asset.type === 'player'
          ? `player:${asset.playerId}`
          : asset.type === 'draft_pick'
            ? draftPickKey(asset)
            : `ifa:${asset.amount.toFixed(2)}`,
      label: buildTradeAssetLabel(asset, playerById),
    })),
    [offeringAssets, playerById],
  );

  const requestingSummary = useMemo(
    () => requestingAssets.map((asset) => ({
      key:
        asset.type === 'player'
          ? `player:${asset.playerId}`
          : asset.type === 'draft_pick'
            ? draftPickKey(asset)
            : `ifa:${asset.amount.toFixed(2)}`,
      label: buildTradeAssetLabel(asset, playerById),
    })),
    [playerById, requestingAssets],
  );

  const offerTotal = offeringAssets.reduce(
    (sum, asset) => sum + tradeAssetValue(asset, season, playerById),
    0,
  );
  const requestTotal = requestingAssets.reduce(
    (sum, asset) => sum + tradeAssetValue(asset, season, playerById),
    0,
  );
  const packageFairness = fairnessLabel(fairnessRatio(offerTotal, requestTotal));

  useEffect(() => {
    let cancelled = false;

    if (!selectedTeam || !isInitialized || !workerReady || !tradeMarketOpen) {
      setGmDialogue(null);
      return () => {
        cancelled = true;
      };
    }

    const loadDialogue = async () => {
      const dialogue = await getTradeDialogue(
        selectedTeam,
        offerTotal,
        requestTotal,
        activeCounterOfferId ? 'counter' : 'proposal',
      );

      if (!cancelled) {
        setGmDialogue((dialogue as TradeDialogueView) ?? null);
      }
    };

    void loadDialogue();

    return () => {
      cancelled = true;
    };
  }, [
    activeCounterOfferId,
    getTradeDialogue,
    isInitialized,
    offerTotal,
    requestTotal,
    selectedTeam,
    tradeMarketOpen,
    workerReady,
  ]);

  useEffect(() => {
    if (!linkedNegotiationId || openNegotiationsLoading || activeNegotiation?.id === linkedNegotiationId) {
      return;
    }
    const match = openNegotiations.find((negotiation) => negotiation.id === linkedNegotiationId);
    if (match) {
      resumeNegotiation(match);
    }
  }, [
    activeNegotiation?.id,
    linkedNegotiationId,
    openNegotiations,
    openNegotiationsLoading,
    resumeNegotiation,
  ]);

  const multiTeamConditionTargets = useMemo(
    () => [...multiTeamMovedPlayers].sort((left, right) => left.label.localeCompare(right.label) || left.playerId.localeCompare(right.playerId)),
    [multiTeamMovedPlayers],
  );

  const submitTrade = async () => {
    if (!selectedTeam || offeringAssets.length === 0 || requestingAssets.length === 0 || !tradeMarketOpen) return;
    const offeredPoolAmount = parsePoolAmount(offeringIFAAmount);
    const requestedPoolAmount = parsePoolAmount(requestingIFAAmount);

    if (offeredPoolAmount > yourInventory.ifaRemaining + 0.001) {
      setTradeResult({ status: 'rejected', message: 'You cannot offer more international pool space than you have remaining.' });
      return;
    }

    if (requestedPoolAmount > targetInventory.ifaRemaining + 0.001) {
      setTradeResult({ status: 'rejected', message: 'The target club does not have that much international pool space available.' });
      return;
    }

    setProposing(true);
    try {
      if (activeCounterOfferId) {
        const result = await respondToTradeOffer(activeCounterOfferId, 'counter', {
          offeringAssets,
          requestingAssets,
        });
        const response = result as { decision: 'accepted' | 'rejected' | 'countered' | 'declined'; message: string };
        setActiveNegotiation(null);
        setTradeResult({
          status: response.decision === 'accepted'
            ? 'accepted'
            : response.decision === 'countered'
              ? 'counter'
              : 'rejected',
          message: response.message,
        });
        resetBuilder();
      } else if (activeNegotiation) {
        const result = await advanceNegotiation(activeNegotiation.id, {
          offeringAssets,
          requestingAssets,
        }) as TradeNegotiationActionResult;
        setTradeResult({
          status: result.decision === 'accepted'
            ? 'accepted'
            : result.decision === 'countered'
              ? 'counter'
              : result.decision === 'pending'
                ? 'counter'
                : 'rejected',
          message: result.message,
        });
        setActiveNegotiation(result.negotiation);
        applyNegotiationToBuilder(result.negotiation);
        updateNegotiationDeepLink(result.negotiation?.id ?? null);
        if (result.tradeExecuted) {
          resetBuilder();
        }
      } else {
        const result = await startNegotiation(
          offeringAssets,
          requestingAssets,
          selectedTeam,
        ) as TradeNegotiationActionResult;
        setTradeResult({
          status: result.decision === 'accepted'
            ? 'accepted'
            : result.decision === 'countered'
              ? 'counter'
              : result.decision === 'pending'
                ? 'counter'
              : 'rejected',
          message: result.message,
        });
        setActiveNegotiation(result.negotiation);
        applyNegotiationToBuilder(result.negotiation);
        updateNegotiationDeepLink(result.negotiation?.id ?? null);
        if (result.tradeExecuted) {
          resetBuilder();
        }
      }

      await Promise.all([
        loadUserRoster(),
        loadTargetRoster(),
        loadUserInventory(),
        loadTargetInventory(),
        loadTradeActivity(),
        loadOpenNegotiations(),
        persistTradeSnapshot(),
      ]);
    } finally {
      setProposing(false);
    }
  };

  const handleResolveNegotiation = useCallback(async (action: 'accept' | 'reject') => {
    if (!activeNegotiation) {
      return;
    }
    setProposing(true);
    try {
      const result = await resolveNegotiation(activeNegotiation.id, action) as TradeNegotiationActionResult;
      setTradeResult({
        status: result.decision === 'accepted' ? 'accepted' : 'rejected',
        message: result.message,
      });
      setActiveNegotiation(result.negotiation);
      updateNegotiationDeepLink(result.negotiation?.id ?? null);
      if (result.tradeExecuted || action === 'reject') {
        resetBuilder();
      }
      await Promise.all([
        loadUserRoster(),
        loadTargetRoster(),
        loadUserInventory(),
        loadTargetInventory(),
        loadTradeActivity(),
        loadOpenNegotiations(),
        persistTradeSnapshot(),
      ]);
    } finally {
      setProposing(false);
    }
  }, [
    activeNegotiation,
    loadTargetInventory,
    loadTargetRoster,
    loadTradeActivity,
    loadUserInventory,
    loadUserRoster,
    loadOpenNegotiations,
    persistTradeSnapshot,
    resolveNegotiation,
    updateNegotiationDeepLink,
  ]);

  const handleAcceptOffer = async (offerId: string) => {
    setProposing(true);
    try {
      const result = await respondToTradeOffer(offerId, 'accept');
      const response = result as { decision: 'accepted' | 'rejected'; message: string };
      setTradeResult({
        status: response.decision === 'accepted' ? 'accepted' : 'rejected',
        message: response.message,
      });
      await Promise.all([
        loadUserRoster(),
        loadTargetRoster(),
        loadUserInventory(),
        loadTargetInventory(),
        loadTradeActivity(),
      ]);
    } finally {
      setProposing(false);
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    setProposing(true);
    try {
      const result = await respondToTradeOffer(offerId, 'decline');
      const response = result as { message: string };
      setTradeResult({ status: 'declined', message: response.message });
      await loadTradeActivity();
    } finally {
      setProposing(false);
    }
  };

  const handleCounterOffer = (offer: TradeOfferView) => {
    setSelectedTeam(offer.fromTeamId);
    setOffering(playerIdsFromAssetViews(offer.requestingAssets));
    setRequesting(playerIdsFromAssetViews(offer.offeringAssets));
    setOfferingPicks(draftPickAssetsFromViews(offer.requestingAssets));
    setRequestingPicks(draftPickAssetsFromViews(offer.offeringAssets));
    setOfferingIFAAmount(ifaAmountFromViews(offer.requestingAssets));
    setRequestingIFAAmount(ifaAmountFromViews(offer.offeringAssets));
    setActiveCounterOfferId(offer.id);
    setTradeResult(null);
  };

  useEffect(() => {
    if (tradeResult?.status === 'accepted') {
      getAudioEngine().playEffect('trade_completed');
    }
  }, [tradeResult]);

  return (
    <PageShell loading={loading && deadlineState == null} skeleton={<TradeSkeleton />}>
      <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Trade Center</h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            Deadline pressure, incoming offers, and every deal from around the league.
          </p>
        </div>
        <PageHelp pageKey="trade" />
      </div>

      <div className={`rounded-lg border px-4 py-3 ${
        tradeMarketOpen
          ? 'border-accent-warning/30 bg-accent-warning/10'
          : 'border-dynasty-border bg-dynasty-surface'
      }`}>
        <p className={`font-heading text-sm ${tradeMarketOpen ? 'text-accent-warning' : 'text-dynasty-text'}`}>
          {marketCopy.headline}
        </p>
        <p className="mt-1 font-heading text-xs text-dynasty-muted">{marketCopy.detail}</p>
      </div>

      <DeadlineTheatreCard deadlineState={deadlineState} />
      <DeadlineDramaPanel />

      {deadlineState?.recap ? (
        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="font-heading text-sm font-semibold text-dynasty-text">{deadlineState.recap.analysisHeadline}</h2>
              <div className="mt-3 space-y-2">
                {deadlineState.recap.yourTrades.map((item) => (
                  <div key={item.id} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 font-heading text-[10px] uppercase tracking-[0.18em] ${
                        item.outcome === 'completed'
                          ? 'border-accent-success/40 text-accent-success'
                          : 'border-accent-warning/40 text-accent-warning'
                      }`}>
                        {humanizeLabel(item.outcome)}
                      </span>
                    </div>
                    <p className="mt-2 font-heading text-sm text-dynasty-text">{item.summary}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 xl:w-[22rem]">
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Major Moves</div>
                <div className="mt-2 space-y-2">
                  {deadlineState.recap.majorMoves.map((move) => (
                    <p key={move.id} className="font-heading text-xs text-dynasty-text">{move.summary}</p>
                  ))}
                </div>
              </div>
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Winners</div>
                <p className="mt-2 font-heading text-sm text-dynasty-text">{deadlineState.recap.winners.join(', ') || 'None'}</p>
              </div>
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Losers</div>
                <p className="mt-2 font-heading text-sm text-dynasty-text">{deadlineState.recap.losers.join(', ') || 'None'}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="flex items-center gap-2 border-b border-dynasty-border px-4 py-3">
              <Inbox className="h-4 w-4 text-dynasty-muted" />
              <div>
                <h2 className="font-heading text-sm font-semibold text-dynasty-text">Hot Offers</h2>
                <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {incomingOffers.length} active conversations
                </p>
              </div>
            </div>
            <div className="space-y-3 px-3 py-3">
              {incomingOffers.length === 0 ? (
                <EmptyStatePanel
                  description="The phones are quiet right now. Sim a few days or revisit the builder to spark fresh offers."
                  title="No trade offers right now"
                />
              ) : (
                incomingOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={() => void handleAcceptOffer(offer.id)}
                    onCounter={() => handleCounterOffer(offer)}
                    onDecline={() => void handleDeclineOffer(offer.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="flex items-center gap-2 border-b border-dynasty-border px-4 py-3">
              <Scale className="h-4 w-4 text-dynasty-muted" />
              <div>
                <h2 className="font-heading text-sm font-semibold text-dynasty-text">Active Talks</h2>
                <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {openNegotiationsLoading ? 'Refreshing room' : `${openNegotiations.length} open negotiation${openNegotiations.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
            <div className="space-y-3 px-3 py-3">
              {openNegotiations.length === 0 ? (
                <EmptyStatePanel
                  description="Open multi-round talks will stay here after a reload so you can pick the call back up."
                  title="No active talks"
                />
              ) : (
                openNegotiations.map((negotiation) => (
                  <NegotiationSummaryCard
                    key={negotiation.id}
                    active={activeNegotiation?.id === negotiation.id}
                    negotiation={negotiation}
                    onResume={() => resumeNegotiation(negotiation)}
                    playerById={playerById}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="flex items-center gap-2 border-b border-dynasty-border px-4 py-3">
              <ArrowRight className="h-4 w-4 text-dynasty-muted" />
              <div>
                <h2 className="font-heading text-sm font-semibold text-dynasty-text">League Trade Ticker</h2>
                <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  Deadline wire
                </p>
              </div>
            </div>
            <div className="space-y-3 px-3 py-3">
              {(deadlineState?.ticker ?? []).length === 0 ? (
                <EmptyStatePanel
                  description="No ticker moves are active right now. Major trades will start scrolling here as the league reacts."
                  title="No ticker moves are active right now"
                />
              ) : (
                (deadlineState?.ticker ?? []).map((item) => (
                  <div key={item.id} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                    <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">{item.timestamp}</div>
                    <p className="mt-2 font-heading text-sm text-dynasty-text">{item.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="flex items-center gap-2 border-b border-dynasty-border px-4 py-3">
              <ArrowLeftRight className="h-4 w-4 text-dynasty-muted" />
              <div>
                <h2 className="font-heading text-sm font-semibold text-dynasty-text">Trade History</h2>
                <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  Season {season} ledger
                </p>
              </div>
            </div>
            <div className="space-y-3 px-3 py-3">
              {tradeHistory.length === 0 ? (
                <p className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-6 text-center font-heading text-sm text-dynasty-muted">
                  No trades completed yet this season.
                </p>
              ) : (
                tradeHistory.map((trade) => (
                  <HistoryCard key={trade.id} trade={trade} />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:col-span-8">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
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
                  onClick={openMultiTeamBuilder}
                  disabled={!tradeMarketOpen}
                  title={!tradeMarketOpen ? marketCopy.disabledReason : 'Build a three- or four-team framework'}
                  className="focus-ring inline-flex items-center gap-2 rounded-md border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-accent-info transition-colors hover:bg-accent-info/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  3+ Team Trade
                </button>
                <select
                  value={selectedTeam}
                  onChange={(event) => {
                    resetBuilder();
                    setSelectedTeam(event.target.value);
                    setTradeResult(null);
                  }}
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
                    onClick={() => {
                      resetBuilder();
                      setSelectedTeam(team.id);
                      setTradeResult(null);
                    }}
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

            {activeNegotiation ? (
              <div className="mb-4 rounded-lg border border-accent-info/30 bg-accent-info/5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
                    Negotiation Round
                  </span>
                  <Badge className="border-accent-info/40 bg-accent-info/10 text-accent-info">
                    {Math.max(1, activeNegotiation.roundsCompleted)}
                  </Badge>
                  <Badge className={modeBadgeClass(gmDialogue?.mode ?? 'buyer')}>
                    {humanizeLabel(activeNegotiation.phase)}
                  </Badge>
                </div>

                <div className="mt-3 space-y-2">
                  {activeNegotiation.dialogue.map((entry, index) => (
                    <div
                      key={`${entry.speaker}-${index}`}
                      className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2"
                    >
                      <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                        {entry.speaker === 'rival_gm' ? activeNegotiation.teamAbbreviation : 'AGM Advisor'}
                      </div>
                      <p className="mt-1 font-heading text-xs text-dynasty-text">{entry.text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-3">
                    <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">You Send</div>
                    <div className="mt-2 space-y-1">
                      {activeNegotiation.proposal.offeringAssets.map((asset) => (
                        <div key={`offer-${buildTradeAssetLabel(asset, playerById)}`} className="font-heading text-xs text-dynasty-text">
                          {buildTradeAssetLabel(asset, playerById)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-3">
                    <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">You Receive</div>
                    <div className="mt-2 space-y-1">
                      {activeNegotiation.proposal.requestingAssets.map((asset) => (
                        <div key={`request-${buildTradeAssetLabel(asset, playerById)}`} className="font-heading text-xs text-dynasty-text">
                          {buildTradeAssetLabel(asset, playerById)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleResolveNegotiation('accept')}
                    disabled={proposing || !activeNegotiation.canAccept}
                    className="focus-ring rounded-md border border-accent-success/40 bg-accent-success/10 px-3 py-2 font-heading text-xs text-accent-success transition-colors hover:bg-accent-success/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResolveNegotiation('reject')}
                    disabled={proposing || !activeNegotiation.canReject}
                    className="focus-ring rounded-md border border-accent-danger/40 bg-accent-danger/10 px-3 py-2 font-heading text-xs text-accent-danger transition-colors hover:bg-accent-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeResult({
                      status: 'counter',
                      message: 'Adjust the package below, then send the counter back through the room.',
                    })}
                    disabled={proposing || !activeNegotiation.canCounter}
                    className="focus-ring rounded-md border border-accent-warning/40 bg-accent-warning/10 px-3 py-2 font-heading text-xs text-accent-warning transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Counter
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated">
                <div className="space-y-3 border-b border-dynasty-border px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-heading text-sm font-semibold text-dynasty-text">Your Assets</h3>
                    <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                      {filteredYourRoster.length}/{yourRoster.length}
                    </div>
                  </div>
                  <AssetFilterBar
                    value={yourAssetFilter}
                    onChange={setYourAssetFilter}
                    selectedCount={offering.length}
                  />
                </div>
                <div className="max-h-[22rem] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-dynasty-elevated">
                      <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                        <th className="px-3 py-2 text-left font-heading">Player</th>
                        <th className="px-2 py-2 text-left font-heading">POS</th>
                        <th className="px-2 py-2 text-right font-data">OVR</th>
                        <th className="px-2 py-2 text-center font-heading">GRD</th>
                        <th className="px-2 py-2 text-right font-data">AGE</th>
                      </tr>
                    </thead>
                    <tbody>
                    {filteredYourRoster.map((player) => (
                        <PlayerRow
                          key={player.id}
                          player={player}
                          selected={offering.includes(player.id)}
                          disabled={!tradeMarketOpen}
                          onClick={() => toggleOffer(player.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 border-t border-dynasty-border px-4 py-3">
                  <div>
                    <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Draft Picks</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {yourInventory.draftPicks.length === 0 ? (
                        <span className="font-heading text-xs text-dynasty-muted">No current or next-year picks available.</span>
                      ) : (
                        yourInventory.draftPicks.map((pick) => {
                          const selected = offeringPicks.some((asset) => draftPickKey(asset) === pick.key);
                          return (
                            <button
                              key={pick.key}
                              onClick={() => {
                                setTradeResult(null);
                                setOfferingPicks((current) => toggleDraftPickAsset(current, pick.asset));
                              }}
                              disabled={!tradeMarketOpen}
                              title={!tradeMarketOpen ? marketCopy.disabledReason : pick.detail}
                              className={`rounded border px-2 py-1 text-left font-data text-xs transition-colors ${
                                selected
                                  ? 'border-accent-primary bg-accent-primary/15 text-accent-primary'
                                  : 'border-dynasty-border bg-dynasty-surface text-dynasty-text'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {pick.label} · {pick.detail}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">IFA Pool Space</p>
                      <span className="font-data text-[11px] text-dynasty-muted">Remaining ${yourInventory.ifaRemaining.toFixed(2)}M</span>
                    </div>
                    <input
                      name="offering-ifa-pool"
                      type="number"
                      min="0"
                      max={yourInventory.ifaRemaining.toFixed(2)}
                      step="0.1"
                      value={offeringIFAAmount}
                      disabled={!tradeMarketOpen}
                      title={!tradeMarketOpen ? marketCopy.disabledReason : 'Offer international pool space'}
                      onInput={(event) => {
                        setTradeResult(null);
                        setOfferingIFAAmount((event.target as HTMLInputElement).value);
                      }}
                      onChange={(event) => {
                        setTradeResult(null);
                        setOfferingIFAAmount(event.target.value);
                      }}
                      className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-sm text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated">
                <div className="space-y-3 border-b border-dynasty-border px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-heading text-sm font-semibold text-dynasty-text">Target Roster</h3>
                    <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                      {filteredTargetRoster.length}/{targetRoster.length}
                    </div>
                  </div>
                  <AssetFilterBar
                    value={targetAssetFilter}
                    onChange={setTargetAssetFilter}
                    selectedCount={requesting.length}
                  />
                </div>
                <div className="max-h-[22rem] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-dynasty-elevated">
                      <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                        <th className="px-3 py-2 text-left font-heading">Player</th>
                        <th className="px-2 py-2 text-left font-heading">POS</th>
                        <th className="px-2 py-2 text-right font-data">OVR</th>
                        <th className="px-2 py-2 text-center font-heading">GRD</th>
                        <th className="px-2 py-2 text-right font-data">AGE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTargetRoster.map((player) => (
                        <PlayerRow
                          key={player.id}
                          player={player}
                          selected={requesting.includes(player.id)}
                          disabled={!tradeMarketOpen}
                          onClick={() => toggleRequest(player.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 border-t border-dynasty-border px-4 py-3">
                  <div>
                    <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Draft Picks</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {!selectedTeam ? (
                        <span className="font-heading text-xs text-dynasty-muted">Select a team to inspect its pick inventory.</span>
                      ) : targetInventory.draftPicks.length === 0 ? (
                        <span className="font-heading text-xs text-dynasty-muted">No current or next-year picks available.</span>
                      ) : (
                        targetInventory.draftPicks.map((pick) => {
                          const selected = requestingPicks.some((asset) => draftPickKey(asset) === pick.key);
                          return (
                            <button
                              key={pick.key}
                              onClick={() => {
                                setTradeResult(null);
                                setRequestingPicks((current) => toggleDraftPickAsset(current, pick.asset));
                              }}
                              disabled={!tradeMarketOpen}
                              title={!tradeMarketOpen ? marketCopy.disabledReason : pick.detail}
                              className={`rounded border px-2 py-1 text-left font-data text-xs transition-colors ${
                                selected
                                  ? 'border-accent-info bg-accent-info/15 text-accent-info'
                                  : 'border-dynasty-border bg-dynasty-surface text-dynasty-text'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {pick.label} · {pick.detail}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">IFA Pool Space</p>
                      <span className="font-data text-[11px] text-dynasty-muted">Remaining ${targetInventory.ifaRemaining.toFixed(2)}M</span>
                    </div>
                    <input
                      name="requesting-ifa-pool"
                      type="number"
                      min="0"
                      max={targetInventory.ifaRemaining.toFixed(2)}
                      step="0.1"
                      value={requestingIFAAmount}
                      disabled={!tradeMarketOpen || !selectedTeam}
                      title={!tradeMarketOpen ? marketCopy.disabledReason : !selectedTeam ? 'Select a team first.' : 'Request international pool space'}
                      onInput={(event) => {
                        setTradeResult(null);
                        setRequestingIFAAmount((event.target as HTMLInputElement).value);
                      }}
                      onChange={(event) => {
                        setTradeResult(null);
                        setRequestingIFAAmount(event.target.value);
                      }}
                      className="mt-2 w-full rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-sm text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-dynasty-muted" />
                <h3 className="font-heading text-sm font-semibold text-dynasty-text">Package Evaluation</h3>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
                <div>
                  <p className="mb-2 font-heading text-[11px] uppercase tracking-[0.18em] text-accent-primary">Offering</p>
                  <div className="flex flex-wrap gap-1.5">
                    {offeringSummary.length === 0 ? (
                      <span className="font-heading text-xs text-dynasty-muted">Select players, picks, or pool space from your side</span>
                    ) : (
                      offeringSummary.map((asset) => {
                        return (
                          <span
                            key={asset.key}
                            className="rounded border border-dynasty-border bg-dynasty-surface px-2 py-1 font-data text-xs text-dynasty-text"
                          >
                            {asset.label}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="hidden items-center justify-center md:flex">
                  <ArrowRight className="h-5 w-5 text-dynasty-muted" />
                </div>

                <div>
                  <p className="mb-2 font-heading text-[11px] uppercase tracking-[0.18em] text-accent-info">Requesting</p>
                  <div className="flex flex-wrap gap-1.5">
                    {requestingSummary.length === 0 ? (
                      <span className="font-heading text-xs text-dynasty-muted">Select players, picks, or pool space from the target club</span>
                    ) : (
                      requestingSummary.map((asset) => {
                        return (
                          <span
                            key={asset.key}
                            className="rounded border border-dynasty-border bg-dynasty-surface px-2 py-1 font-data text-xs text-dynasty-text"
                          >
                            {asset.label}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {(offeringAssets.length > 0 || requestingAssets.length > 0) && (
                <div className="mt-4 space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                      <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">You Send Value</div>
                      <div className="mt-1 font-data text-lg text-dynasty-textBright">{offerTotal.toFixed(1)}</div>
                    </div>
                    <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                      <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">You Receive Value</div>
                      <div className="mt-1 font-data text-lg text-dynasty-textBright">{requestTotal.toFixed(1)}</div>
                    </div>
                  </div>
                  <ProgressFill
                    toneClassName={
                      fairnessRatio(offerTotal, requestTotal) >= 0.4 && fairnessRatio(offerTotal, requestTotal) <= 0.6
                        ? 'bg-accent-success'
                        : fairnessRatio(offerTotal, requestTotal) >= 0.3 && fairnessRatio(offerTotal, requestTotal) <= 0.7
                          ? 'bg-accent-warning'
                          : 'bg-accent-danger'
                    }
                    value={Math.round(fairnessRatio(offerTotal, requestTotal) * 100)}
                  />
                  <div className="flex items-center justify-between font-data text-xs">
                    <span className="text-dynasty-muted">Favors you</span>
                    <span className={packageFairness.color}>{packageFairness.text}</span>
                    <span className="text-dynasty-muted">Favors them</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => void submitTrade()}
                  disabled={!tradeMarketOpen || !selectedTeam || offeringAssets.length === 0 || requestingAssets.length === 0 || proposing}
                  title={!tradeMarketOpen
                    ? marketCopy.disabledReason
                    : !selectedTeam
                      ? 'Select a target club first.'
                      : offeringAssets.length === 0 || requestingAssets.length === 0
                        ? 'Select at least one outgoing and one incoming asset.'
                        : 'Send this package to the other GM.'}
                  className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRight className="h-4 w-4" />
                  {activeCounterOfferId
                    ? 'Send Counter Offer'
                    : activeNegotiation
                      ? 'Send Negotiation Counter'
                      : 'Start Negotiation'}
                </button>
                {(offeringAssets.length > 0 || requestingAssets.length > 0 || activeCounterOfferId || activeNegotiation) && (
                  <button
                    onClick={clearTrade}
                    className="inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm text-dynasty-muted transition-colors hover:text-dynasty-text"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {tradeResult && (
            <div className={`rounded-lg border p-4 ${
              tradeResult.status === 'accepted'
                ? 'border-accent-success/40 bg-accent-success/10'
                : tradeResult.status === 'counter'
                  ? 'border-accent-warning/40 bg-accent-warning/10'
                  : 'border-accent-danger/40 bg-accent-danger/10'
            }`}>
              <div className="flex items-center gap-2">
                {tradeResult.status === 'accepted' && <Check className="h-5 w-5 text-accent-success" />}
                {tradeResult.status !== 'accepted' && <AlertTriangle className="h-5 w-5 text-accent-warning" />}
                <h3 className="font-heading text-sm font-semibold text-dynasty-text">
                  {tradeResult.status === 'accepted'
                    ? 'Deal Completed'
                    : tradeResult.status === 'counter'
                      ? 'Trade Talks Continue'
                      : 'Talks Broke Down'}
                </h3>
              </div>
              <p className="mt-2 font-heading text-sm text-dynasty-text">{tradeResult.message}</p>
            </div>
          )}

          {multiTeamOpen ? (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-8">
              <div
                role="dialog"
                aria-modal="true"
                aria-label="3+ Team Trade"
                className="max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-xl border border-dynasty-border bg-dynasty-surface p-5 shadow-2xl"
              >
                <div className="flex flex-col gap-3 border-b border-dynasty-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">3+ Team Trade</h2>
                    <p className="mt-1 font-heading text-sm text-dynasty-muted">
                      Build a three- or four-club framework, add a condition, then route it through the room.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {multiTeamLanes.length < 4 ? (
                      <button
                        type="button"
                        onClick={addMultiTeamLane}
                        disabled={multiTeamSubmitting}
                        className="focus-ring rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Add Fourth Team
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={resetMultiTeamBuilder}
                      disabled={multiTeamSubmitting}
                      className="focus-ring rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted transition-colors hover:border-accent-danger hover:text-accent-danger disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  {multiTeamLanes.map((lane, index) => {
                    const teamOptions = ALL_TEAMS
                      .map((team) => ({
                        id: team.id,
                        label: `${team.abbr} - ${team.name}`,
                        disabled:
                          team.id !== lane.teamId
                          && multiTeamLanes.some((candidate) => candidate.laneId !== lane.laneId && candidate.teamId === team.id),
                      }));
                    const destinationOptions = multiTeamLanes
                      .filter((candidate) => candidate.laneId !== lane.laneId && candidate.teamId)
                      .map((candidate) => ({
                        id: candidate.teamId,
                        label: teamDisplayName(candidate.teamId),
                      }));

                    return (
                      <div key={lane.laneId} className="space-y-2">
                        <MultiTeamLaneCard
                          lane={lane}
                          roster={multiTeamRosters[lane.teamId] ?? []}
                          teamOptions={teamOptions}
                          destinationOptions={destinationOptions}
                          teamSelectionLocked={index === 0}
                          disabled={multiTeamSubmitting}
                          onChangeTeam={(teamId) => setMultiTeamLaneTeam(lane.laneId, teamId)}
                          onTogglePlayer={(playerId) => toggleMultiTeamPlayer(lane.laneId, playerId)}
                          onChangeDestination={(playerId, destinationTeamId) =>
                            updateMultiTeamDestination(lane.laneId, playerId, destinationTeamId)
                          }
                        />
                        {index >= 2 ? (
                          <button
                            type="button"
                            onClick={() => removeMultiTeamLane(lane.laneId)}
                            disabled={multiTeamSubmitting}
                            className="focus-ring rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted transition-colors hover:border-accent-danger hover:text-accent-danger disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove Lane
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-dynasty-muted" />
                      <h3 className="font-heading text-sm font-semibold text-dynasty-text">Framework Summary</h3>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {multiTeamProposal.teams.map((team) => (
                        <div key={team.teamId} className="rounded border border-dynasty-border bg-dynasty-surface p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-heading text-sm text-dynasty-textBright">{teamDisplayName(team.teamId)}</div>
                            <Badge className="border-dynasty-border bg-dynasty-elevated text-dynasty-muted">
                              {multiTeamRoleLabel(team.role)}
                            </Badge>
                          </div>
                          <div className="mt-3">
                            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-primary">Sending</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {team.sendingPlayerIds.length === 0 ? (
                                <span className="font-heading text-xs text-dynasty-muted">No players assigned.</span>
                              ) : (
                                team.sendingPlayerIds.map((playerId) => {
                                  const player = multiTeamRosters[team.teamId]?.find((candidate) => candidate.id === playerId);
                                  return (
                                    <span key={`${team.teamId}-send-${playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-xs text-dynasty-text">
                                      {player ? `${player.firstName} ${player.lastName}` : playerId}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">Receiving</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {team.receivingPlayerIds.length === 0 ? (
                                <span className="font-heading text-xs text-dynasty-muted">No inbound players yet.</span>
                              ) : (
                                team.receivingPlayerIds.map((playerId) => (
                                  <span key={`${team.teamId}-receive-${playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-xs text-dynasty-text">
                                    {multiTeamMovedPlayers.find((candidate) => candidate.playerId === playerId)?.label ?? playerId}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="font-heading text-sm font-semibold text-dynasty-text">Conditional Clauses</h3>
                          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                            Add scaffolding from the moved-player pool
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleAddConditionalClause()}
                          disabled={multiTeamSubmitting || multiTeamConditionTargets.length === 0}
                          className="focus-ring rounded-md border border-accent-warning/40 bg-accent-warning/10 px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-accent-warning transition-colors hover:bg-accent-warning/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Add Condition
                        </button>
                      </div>
                      <select
                        value={multiTeamConditionPlayerId}
                        onChange={(event) => setMultiTeamConditionPlayerId(event.target.value)}
                        disabled={multiTeamSubmitting || multiTeamConditionTargets.length === 0}
                        className="mt-3 w-full rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-sm text-dynasty-text focus:border-accent-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Choose a moved player...</option>
                        {multiTeamConditionTargets.map((player) => (
                          <option key={player.playerId} value={player.playerId}>
                            {player.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 space-y-2">
                        {multiTeamConditions.length === 0 ? (
                          <p className="font-heading text-xs text-dynasty-muted">No conditional clauses attached yet.</p>
                        ) : (
                          multiTeamConditions.map((condition, index) => (
                            <div key={`${condition.playerId}-${condition.type}-${index}`} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                                {humanizeLabel(condition.type)} · Deadline {condition.deadline}
                              </div>
                              <p className="mt-1 font-heading text-xs text-dynasty-text">{condition.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-sm font-semibold text-dynasty-text">Room Read</h3>
                        <button
                          type="button"
                          onClick={() => void evaluateCurrentMultiTeamFramework()}
                          disabled={multiTeamSubmitting}
                          className="focus-ring rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Evaluate
                        </button>
                      </div>
                      {multiTeamFairness ? (
                        <div className="mt-3 space-y-3">
                          <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Fairness Score</div>
                            <div className="mt-1 font-heading text-lg text-dynasty-textBright">{multiTeamFairness.fairnessScore}</div>
                            <div className="mt-1 font-heading text-xs text-dynasty-muted">
                              {multiTeamFairness.isBalanced
                                ? 'Framework is inside tolerance.'
                                : `${teamDisplayName(multiTeamFairness.mostDisadvantagedTeam)} is outside the current tolerance.`}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {multiTeamFairness.netValueByTeam.map((team) => (
                              <div key={team.teamId} className="flex items-center justify-between rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                                <div>
                                  <div className="font-heading text-sm text-dynasty-text">{team.teamName}</div>
                                  <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{team.teamAbbreviation}</div>
                                </div>
                                <div className={`font-data text-sm ${team.netValue >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                                  {team.netValue >= 0 ? '+' : ''}{team.netValue.toFixed(1)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 font-heading text-xs text-dynasty-muted">
                          Run an evaluation to see balance score, net value by club, and which team is resisting the shape.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {multiTeamMessage ? (
                  <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3 font-heading text-sm text-dynasty-text">
                    {multiTeamMessage}
                  </div>
                ) : null}

                {multiTeamProposalResult ? (
                  <div className={`mt-4 rounded-lg border px-4 py-3 ${
                    multiTeamProposalResult.accepted
                      ? 'border-accent-success/40 bg-accent-success/10'
                      : 'border-accent-warning/40 bg-accent-warning/10'
                  }`}>
                    <div className="font-heading text-sm font-semibold text-dynasty-textBright">Proposal Response</div>
                    <p className="mt-2 font-heading text-sm text-dynasty-text">{multiTeamProposalResult.narrative}</p>
                    {multiTeamProposalResult.blockReason ? (
                      <p className="mt-2 font-heading text-xs text-dynasty-muted">
                        {multiTeamProposalResult.blockReason}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {multiTeamExecutionResult ? (
                  <div className={`mt-4 rounded-lg border px-4 py-3 ${
                    multiTeamExecutionResult.accepted
                      ? 'border-accent-success/40 bg-accent-success/10'
                      : 'border-accent-danger/40 bg-accent-danger/10'
                  }`}>
                    <div className="font-heading text-sm font-semibold text-dynasty-textBright">Execution Result</div>
                    <p className="mt-2 font-heading text-sm text-dynasty-text">{multiTeamExecutionResult.narrative}</p>
                    {multiTeamExecutionResult.cascadeEvents.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {multiTeamExecutionResult.cascadeEvents.map((event) => (
                          <div key={event.triggeredTradeId} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-text">
                            {event.reason}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-dynasty-border pt-4">
                  <button
                    type="button"
                    onClick={() => void handleProposeMultiTeamFramework()}
                    disabled={multiTeamSubmitting}
                    className="focus-ring rounded-md border border-accent-info/40 bg-accent-info/10 px-4 py-2 font-heading text-xs uppercase tracking-[0.18em] text-accent-info transition-colors hover:bg-accent-info/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Propose Framework
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExecuteMultiTeamFramework()}
                    disabled={multiTeamSubmitting || !multiTeamProposalResult?.accepted}
                    className="focus-ring rounded-md bg-accent-primary px-4 py-2 font-heading text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Execute 3+ Team Trade
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </PageShell>
  );
}
