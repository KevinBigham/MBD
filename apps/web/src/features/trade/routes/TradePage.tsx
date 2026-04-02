import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TradeAsset } from '@mbd/contracts';
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
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface PlayerDTO {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: string;
  overallRating: number;
  displayRating: number;
  letterGrade: string;
  rosterStatus: string;
  teamId: string;
  stats: Record<string, unknown> | null;
}

interface TradeAssetView {
  key: string;
  type: TradeAsset['type'];
  label: string;
  detail: string;
  asset: TradeAsset;
  playerId?: string;
}

interface TradeOfferView {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamAbbreviation: string;
  toTeamId: string;
  toTeamName: string;
  toTeamAbbreviation: string;
  fairnessScore: number;
  message: string;
  createdAt: string;
  offeringAssets: TradeAssetView[];
  requestingAssets: TradeAssetView[];
}

interface TradeHistoryView {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamAbbreviation: string;
  toTeamId: string;
  toTeamName: string;
  toTeamAbbreviation: string;
  fairnessScore: number;
  summary: string;
  timestamp: string;
  offeringAssets: TradeAssetView[];
  requestingAssets: TradeAssetView[];
}

interface TradeInventoryPickView {
  key: string;
  label: string;
  detail: string;
  asset: Extract<TradeAsset, { type: 'draft_pick' }>;
}

interface TradeAssetInventoryView {
  draftPicks: TradeInventoryPickView[];
  ifaRemaining: number;
}

type DraftPickAsset = Extract<TradeAsset, { type: 'draft_pick' }>;

interface TradeResult {
  status: 'accepted' | 'rejected' | 'counter' | 'declined';
  message: string;
}

const EMPTY_TRADE_ASSET_INVENTORY: TradeAssetInventoryView = {
  draftPicks: [],
  ifaRemaining: 0,
};

const ALL_TEAMS = [
  { id: 'bal', name: 'Orioles', abbr: 'BAL' }, { id: 'bos', name: 'Red Sox', abbr: 'BOS' },
  { id: 'nyy', name: 'Yankees', abbr: 'NYY' }, { id: 'tb', name: 'Rays', abbr: 'TBR' },
  { id: 'tor', name: 'Blue Jays', abbr: 'TOR' }, { id: 'cws', name: 'White Sox', abbr: 'CWS' },
  { id: 'cle', name: 'Guardians', abbr: 'CLE' }, { id: 'det', name: 'Tigers', abbr: 'DET' },
  { id: 'kc', name: 'Royals', abbr: 'KCR' }, { id: 'min', name: 'Twins', abbr: 'MIN' },
  { id: 'hou', name: 'Astros', abbr: 'HOU' }, { id: 'laa', name: 'Angels', abbr: 'LAA' },
  { id: 'oak', name: 'Athletics', abbr: 'OAK' }, { id: 'sea', name: 'Mariners', abbr: 'SEA' },
  { id: 'tex', name: 'Rangers', abbr: 'TEX' }, { id: 'atl', name: 'Braves', abbr: 'ATL' },
  { id: 'mia', name: 'Marlins', abbr: 'MIA' }, { id: 'nym', name: 'Mets', abbr: 'NYM' },
  { id: 'phi', name: 'Phillies', abbr: 'PHI' }, { id: 'wsh', name: 'Nationals', abbr: 'WSH' },
  { id: 'chc', name: 'Cubs', abbr: 'CHC' }, { id: 'cin', name: 'Reds', abbr: 'CIN' },
  { id: 'mil', name: 'Brewers', abbr: 'MIL' }, { id: 'pit', name: 'Pirates', abbr: 'PIT' },
  { id: 'stl', name: 'Cardinals', abbr: 'STL' }, { id: 'ari', name: 'Diamondbacks', abbr: 'ARI' },
  { id: 'col', name: 'Rockies', abbr: 'COL' }, { id: 'lad', name: 'Dodgers', abbr: 'LAD' },
  { id: 'sd', name: 'Padres', abbr: 'SDP' }, { id: 'sf', name: 'Giants', abbr: 'SFG' },
  { id: 'mtl', name: 'Expos', abbr: 'MTL' }, { id: 'por', name: 'Evergreens', abbr: 'POR' },
];

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-accent-success/20 text-accent-success';
    case 'B': return 'bg-accent-info/20 text-accent-info';
    case 'C': return 'bg-accent-warning/20 text-accent-warning';
    case 'D': return 'bg-accent-danger/20 text-accent-danger';
    default: return 'bg-dynasty-border text-dynasty-muted';
  }
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
        <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeColor(player.letterGrade)}`}>
          {player.letterGrade}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right font-data text-dynasty-muted">{player.age}</td>
    </tr>
  );
}

function OfferCard({
  offer,
  onAccept,
  onCounter,
  onDecline,
}: {
  offer: TradeOfferView;
  onAccept: () => void;
  onCounter: () => void;
  onDecline: () => void;
}) {
  const evaluation = fairnessText(-offer.fairnessScore, 'Them', 'You');

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-sm font-semibold text-dynasty-textBright">{offer.fromTeamName}</p>
          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {offer.createdAt} · {evaluation}
          </p>
        </div>
        <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
          {offer.fromTeamAbbreviation}
        </span>
      </div>

      <p className="mt-3 font-heading text-sm text-dynasty-text">{offer.message}</p>

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

export default function TradePage() {
  const worker = useWorker();
  const {
    getTeamRoster,
    getTradeOffers,
    getTradeHistory,
    getTradeAssetInventory,
    proposeTrade,
    respondToTradeOffer,
  } = worker;
  const { userTeamId, isInitialized, day, season, phase } = useGameStore();

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
  const [incomingOffers, setIncomingOffers] = useState<TradeOfferView[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryView[]>([]);
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [proposing, setProposing] = useState(false);
  const [activeCounterOfferId, setActiveCounterOfferId] = useState<string | null>(null);

  const workerReady = worker.isReady;
  const otherTeams = ALL_TEAMS.filter((team) => team.id !== userTeamId);
  const tradeMarketOpen = phase === 'regular' && day <= 120;
  const daysUntilDeadline = Math.max(0, 120 - day);

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
    const [offers, history] = await Promise.all([
      getTradeOffers(),
      getTradeHistory(),
    ]);
    setIncomingOffers((offers as TradeOfferView[]) ?? []);
    setTradeHistory((history as TradeHistoryView[]) ?? []);
  }, [getTradeHistory, getTradeOffers, isInitialized, workerReady]);

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

  const toggleOffer = (id: string) => {
    setTradeResult(null);
    setOffering((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleRequest = (id: string) => {
    setTradeResult(null);
    setRequesting((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const resetBuilder = () => {
    setOffering([]);
    setRequesting([]);
    setOfferingPicks([]);
    setRequestingPicks([]);
    setOfferingIFAAmount('');
    setRequestingIFAAmount('');
    setActiveCounterOfferId(null);
  };

  const clearTrade = () => {
    resetBuilder();
    setTradeResult(null);
  };

  const playerById = useCallback(
    (id: string) => yourRoster.find((player) => player.id === id) ?? targetRoster.find((player) => player.id === id),
    [targetRoster, yourRoster],
  );

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
        setTradeResult({
          status: response.decision === 'accepted'
            ? 'accepted'
            : response.decision === 'countered'
              ? 'counter'
              : 'rejected',
          message: response.message,
        });
        resetBuilder();
      } else {
        const result = await proposeTrade(
          offeringAssets,
          requestingAssets,
          selectedTeam,
        );
        const response = result as { decision: 'accepted' | 'rejected' | 'countered'; reason: string };
        setTradeResult({
          status: response.decision === 'accepted'
            ? 'accepted'
            : response.decision === 'countered'
              ? 'counter'
              : 'rejected',
          message: response.reason,
        });
        if (response.decision === 'accepted') {
          resetBuilder();
        }
      }

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

  const marketMessage = useMemo(() => {
    if (phase !== 'regular') {
      return 'Trade market closed — reopens in offseason';
    }
    if (!tradeMarketOpen) {
      return 'Trade market closed — reopens in offseason';
    }
    return `${daysUntilDeadline} days until trade deadline`;
  }, [daysUntilDeadline, phase, tradeMarketOpen]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Trade Center</h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          Deadline pressure, incoming offers, and every deal from around the league.
        </p>
      </div>

      <div className={`rounded-lg border px-4 py-3 ${
        tradeMarketOpen
          ? 'border-accent-warning/30 bg-accent-warning/10'
          : 'border-dynasty-border bg-dynasty-surface'
      }`}>
        <p className={`font-heading text-sm ${tradeMarketOpen ? 'text-accent-warning' : 'text-dynasty-text'}`}>
          {marketMessage}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="flex items-center gap-2 border-b border-dynasty-border px-4 py-3">
              <Inbox className="h-4 w-4 text-dynasty-muted" />
              <div>
                <h2 className="font-heading text-sm font-semibold text-dynasty-text">Trade Inbox</h2>
                <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {incomingOffers.length} active conversations
                </p>
              </div>
            </div>
            <div className="space-y-3 px-3 py-3">
              {incomingOffers.length === 0 ? (
                <p className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-6 text-center font-heading text-sm text-dynasty-muted">
                  No active trade offers.
                </p>
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
              </div>
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated">
                <div className="border-b border-dynasty-border px-4 py-3">
                  <h3 className="font-heading text-sm font-semibold text-dynasty-text">Your Assets</h3>
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
                    {yourRoster.map((player) => (
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
                <div className="border-b border-dynasty-border px-4 py-3">
                  <h3 className="font-heading text-sm font-semibold text-dynasty-text">Target Roster</h3>
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
                      {targetRoster.map((player) => (
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
                  <div className="h-2 w-full overflow-hidden rounded-full bg-dynasty-border">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.round(fairnessRatio(offerTotal, requestTotal) * 100)}%`,
                        background: fairnessRatio(offerTotal, requestTotal) >= 0.4 && fairnessRatio(offerTotal, requestTotal) <= 0.6
                          ? 'rgb(34 197 94)'
                          : fairnessRatio(offerTotal, requestTotal) >= 0.3 && fairnessRatio(offerTotal, requestTotal) <= 0.7
                            ? 'rgb(245 158 11)'
                            : 'rgb(244 63 94)',
                      }}
                    />
                  </div>
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
                  className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRight className="h-4 w-4" />
                  {activeCounterOfferId ? 'Send Counter Offer' : 'Propose Trade'}
                </button>
                {(offeringAssets.length > 0 || requestingAssets.length > 0 || activeCounterOfferId) && (
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
        </div>
      </div>
    </div>
  );
}
