import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Eye,
  Shield,
  Target,
  Users,
  FileText,
  ClipboardList,
  Briefcase,
  Coins,
  Globe2,
  Handshake,
} from 'lucide-react';
import { TEAMS, getTeamById } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface Scout {
  id: string;
  name: string;
  quality: number;
  specialty: string;
  bias: string;
}

interface ScoutReport {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  teamName: string;
  isPitcher: boolean;
  grades: Record<string, number>;
  confidence: number;
  overall: number;
  ceiling: number;
  floor: number;
  notes: string;
  scoutName: string;
  date: string;
  reliability: number;
}

interface PlayerDTO {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: string;
  overallRating: number;
  teamId: string;
}

interface TeamChemistry {
  score: number;
  tier: string;
  summary: string;
}

interface OwnerState {
  hotSeat: boolean;
  patience: number;
  confidence: number;
  summary: string;
}

interface IFAProspectView {
  id: string;
  playerName: string;
  age: number;
  position: string;
  region: string;
  country: string;
  expectedBonus: number;
  status: 'available' | 'signed';
  signedTeamId: string | null;
  signedBonus: number | null;
  looks: number;
  overall: number | null;
  confidence: number | null;
  ceiling: number | null;
  floor: number | null;
  notes: string | null;
}

interface IFAPoolView {
  season: number;
  currentPhase: string | null;
  signingWindowOpen: boolean;
  budget: {
    baseAllocation: number;
    tradedIn: number;
    tradedOut: number;
    committed: number;
    remaining: number;
  };
  staffAccuracy: number;
  prospects: IFAProspectView[];
}

interface IFAReport {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  region: string;
  country: string;
  expectedBonus: number;
  looks: number;
  grades: Record<string, number>;
  overall: number;
  confidence: number;
  ceiling: number;
  floor: number;
  notes: string;
  reliability: number;
}

function ScoutGradeBar({ label, grade, confidence }: { label: string; grade: number; confidence: number }) {
  const pct = ((grade - 20) / 60) * 100;
  const color = grade >= 60 ? 'bg-accent-success' : grade >= 50 ? 'bg-accent-info' : grade >= 40 ? 'bg-accent-warning' : 'bg-accent-danger';
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-right font-heading text-xs text-dynasty-muted">{label}</span>
      <div className="relative h-4 flex-1 rounded bg-dynasty-elevated">
        <div className={`h-full rounded ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      <span className="w-8 text-right font-data text-sm text-dynasty-text">{grade}</span>
      <span className="w-14 text-right font-data text-xs text-dynasty-muted">[&plusmn;{confidence}]</span>
    </div>
  );
}

function QualityBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-accent-success' : value >= 50 ? 'bg-accent-info' : value >= 30 ? 'bg-accent-warning' : 'bg-accent-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded bg-dynasty-elevated">
        <div className={`h-full rounded ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-data text-xs text-dynasty-muted">{value}</span>
    </div>
  );
}

function chemistryTone(tier: string | undefined): string {
  switch (tier) {
    case 'electric': return 'text-accent-success';
    case 'connected': return 'text-accent-info';
    case 'steady': return 'text-dynasty-text';
    case 'tense': return 'text-accent-warning';
    case 'fractured': return 'text-accent-danger';
    default: return 'text-dynasty-muted';
  }
}

const hitterAttrs = ['Contact', 'Power', 'Eye', 'Speed', 'Defense', 'Durability'];
const pitcherAttrs = ['Stuff', 'Control', 'Stamina', 'Velocity', 'Movement'];

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}M`;
}

function regionLabel(region: string): string {
  return region
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function teamDisplay(teamId: string | null): string {
  if (!teamId) return 'Unsigned';
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

export default function ScoutingPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { userTeamId, isInitialized } = useGameStore();

  const [activeView, setActiveView] = useState<'pro' | 'international'>('international');
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerDTO[]>([]);
  const [scoutReport, setScoutReport] = useState<ScoutReport | null>(null);
  const [recentReports, setRecentReports] = useState<ScoutReport[]>([]);
  const [ifaPool, setIFAPool] = useState<IFAPoolView | null>(null);
  const [ifaReport, setIFAReport] = useState<IFAReport | null>(null);
  const [ifaBonus, setIFABonus] = useState('');
  const [tradeTarget, setTradeTarget] = useState('bos');
  const [tradeAmount, setTradeAmount] = useState('0.50');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [chemistry, setChemistry] = useState<TeamChemistry | null>(null);
  const [ownerState, setOwnerState] = useState<OwnerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [ifaLoading, setIFALoading] = useState(false);

  const refreshIFAPool = useCallback(async () => {
    if (!workerReady || !isInitialized) return;
    try {
      const pool = await worker.getIFAPool();
      if (pool) {
        setIFAPool(pool as IFAPoolView);
      }
    } catch (err) {
      console.error('Failed to fetch IFA pool:', err);
    }
  }, [isInitialized, worker, workerReady]);

  useEffect(() => {
    if (!isInitialized || !workerReady) return;
    (async () => {
      try {
        const [staff, chemistryData, ownerData, pool] = await Promise.all([
          worker.getScoutingStaff(),
          worker.getTeamChemistry(userTeamId),
          worker.getOwnerState(userTeamId),
          worker.getIFAPool(),
        ]);
        if (Array.isArray(staff)) setScouts(staff as Scout[]);
        setChemistry((chemistryData ?? null) as TeamChemistry | null);
        setOwnerState((ownerData ?? null) as OwnerState | null);
        setIFAPool((pool ?? null) as IFAPoolView | null);
      } catch (err) {
        console.error('Failed to fetch scouting overview:', err);
      }
    })();
  }, [isInitialized, workerReady, userTeamId, worker]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !workerReady) return;
    try {
      const results = await worker.searchPlayers(searchQuery.trim(), 10);
      setSearchResults(results as PlayerDTO[]);
    } catch {
      setSearchResults([]);
    }
  }, [searchQuery, workerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScout = useCallback(async (player: PlayerDTO) => {
    setScoutReport(null);
    setLoading(true);
    try {
      const report = await worker.scoutPlayerReport(player.id);
      if (report) {
        setScoutReport(report as ScoutReport);
        setRecentReports((prev) => [report as ScoutReport, ...prev].slice(0, 20));
      }
    } catch (err) {
      console.error('Failed to scout player:', err);
    }
    setLoading(false);
  }, [workerReady, worker]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScoutIFA = useCallback(async (prospect: IFAProspectView) => {
    setActionMessage(null);
    setIFALoading(true);
    try {
      const result = await worker.scoutIFAPlayer(prospect.id) as
        | { success: true; report: IFAReport }
        | { success: false; error: string };
      if (!result.success) {
        setActionMessage(result.error);
        return;
      }
      setIFAReport(result.report);
      setIFABonus(result.report.expectedBonus.toFixed(2));
      await refreshIFAPool();
    } catch (err) {
      console.error('Failed to scout IFA player:', err);
      setActionMessage('Unable to scout that prospect right now.');
    } finally {
      setIFALoading(false);
    }
  }, [refreshIFAPool, worker]);

  const handleSignIFA = useCallback(async () => {
    if (!ifaReport) return;
    setActionMessage(null);
    setIFALoading(true);
    try {
      const bonusAmount = Number.parseFloat(ifaBonus);
      const result = await worker.signIFAPlayer(ifaReport.playerId, bonusAmount) as
        | { success: true; remainingBudget: number }
        | { success: false; error: string };
      if (!result.success) {
        setActionMessage(result.error);
        return;
      }
      setActionMessage(`Signed ${ifaReport.playerName}. Remaining pool: ${formatMoney(result.remainingBudget)}.`);
      await refreshIFAPool();
      setIFAReport(null);
    } catch (err) {
      console.error('Failed to sign IFA player:', err);
      setActionMessage('Unable to finalize that signing.');
    } finally {
      setIFALoading(false);
    }
  }, [ifaBonus, ifaReport, refreshIFAPool, worker]);

  const handleTradeIFAPool = useCallback(async () => {
    setActionMessage(null);
    setIFALoading(true);
    try {
      const amount = Number.parseFloat(tradeAmount);
      const result = await worker.tradeIFAPoolSpace(tradeTarget, amount) as
        | { success: true; remainingBudget: number }
        | { success: false; error: string };
      if (!result.success) {
        setActionMessage(result.error);
        return;
      }
      setActionMessage(`Transferred ${formatMoney(amount)} of pool space. Remaining pool: ${formatMoney(result.remainingBudget)}.`);
      await refreshIFAPool();
    } catch (err) {
      console.error('Failed to trade IFA pool space:', err);
      setActionMessage('Unable to move pool space right now.');
    } finally {
      setIFALoading(false);
    }
  }, [refreshIFAPool, tradeAmount, tradeTarget, worker]);

  const attrs = scoutReport?.isPitcher ? pitcherAttrs : hitterAttrs;
  const ifaAttrs = ifaReport && ['SP', 'RP', 'CL'].includes(ifaReport.position) ? pitcherAttrs : hitterAttrs;
  const tradeTargets = TEAMS.filter((team) => team.id !== userTeamId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Scouting</h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          Evaluate pro talent, manage the international market, and turn better information into better decisions.
        </p>
      </div>

      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveView('international')}
            className={`rounded-md px-4 py-3 text-left ${activeView === 'international' ? 'bg-dynasty-elevated text-dynasty-textBright' : 'text-dynasty-muted hover:bg-dynasty-elevated/60'}`}
          >
            <div className="flex items-center gap-2 font-heading text-sm font-semibold">
              <Globe2 className="h-4 w-4 text-accent-warning" />
              International
            </div>
            <p className="mt-1 font-heading text-xs">Scout the IFA class, monitor pool space, and sign rookies into the pipeline.</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('pro')}
            className={`rounded-md px-4 py-3 text-left ${activeView === 'pro' ? 'bg-dynasty-elevated text-dynasty-textBright' : 'text-dynasty-muted hover:bg-dynasty-elevated/60'}`}
          >
            <div className="flex items-center gap-2 font-heading text-sm font-semibold">
              <Eye className="h-4 w-4 text-accent-info" />
              Pro Reports
            </div>
            <p className="mt-1 font-heading text-xs">Search major and minor league players and build your live report board.</p>
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent-info" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Front Office Context</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
            <div className="font-heading text-[10px] uppercase text-dynasty-muted">Owner outlook</div>
            <div className={`mt-1 font-data text-2xl font-bold ${ownerState?.hotSeat ? 'text-accent-danger' : 'text-dynasty-textBright'}`}>
              {ownerState?.hotSeat ? 'HOT SEAT' : 'STABLE'}
            </div>
            <div className="mt-2 font-heading text-sm text-dynasty-text">
              {ownerState?.summary ?? 'Owner narrative not available yet.'}
            </div>
            {ownerState && (
              <div className="mt-3 flex gap-4 font-data text-xs text-dynasty-muted">
                <span>Patience {ownerState.patience}</span>
                <span>Confidence {ownerState.confidence}</span>
              </div>
            )}
          </div>
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
            <div className="font-heading text-[10px] uppercase text-dynasty-muted">Clubhouse read</div>
            <div className={`mt-1 font-data text-2xl font-bold ${chemistryTone(chemistry?.tier)}`}>
              {chemistry?.score ?? '--'}
            </div>
            <div className="mt-2 font-heading text-sm text-dynasty-text">
              {chemistry?.summary ?? 'Chemistry data not available yet.'}
            </div>
            {chemistry && (
              <div className="mt-3 font-data text-xs uppercase text-dynasty-muted">
                {chemistry.tier} clubhouse
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-accent-primary" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Your Scouting Department</h2>
        </div>
        {scouts.length === 0 ? (
          <p className="py-4 text-center font-heading text-xs text-dynasty-muted">
            Scouting staff data unavailable. Start a game to populate your department.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scouts.map((scout) => (
              <div key={scout.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <p className="font-heading text-sm font-semibold text-dynasty-text">{scout.name}</p>
                <QualityBar value={scout.quality} />
                <div className="mt-1 flex gap-3 font-data text-[10px] text-dynasty-muted">
                  <span>{scout.specialty}</span>
                  <span className="text-accent-warning">{scout.bias}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {activeView === 'pro' ? (
        <>
          <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-accent-info" />
              <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Scout a Player</h2>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-dynasty-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void handleSearch()}
                  placeholder="Search player by name..."
                  className="w-full rounded border border-dynasty-border bg-dynasty-elevated py-1.5 pl-9 pr-3 font-heading text-sm text-dynasty-text placeholder-dynasty-muted outline-none focus:border-accent-primary"
                />
              </div>
              <button type="button" onClick={() => { void handleSearch(); }} className="rounded bg-accent-primary px-4 py-1.5 font-heading text-xs font-semibold text-black hover:opacity-90">
                Search
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded border border-dynasty-border bg-dynasty-elevated">
                {searchResults.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => { void handleScout(player); setSearchResults([]); }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-dynasty-surface"
                  >
                    <span className="font-heading text-sm text-dynasty-text">
                      {player.firstName} {player.lastName}
                    </span>
                    <span className="font-data text-xs text-dynasty-muted">{player.position} / Age {player.age}</span>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="mt-4 flex items-center gap-2 py-6 text-center">
                <Target className="mx-auto h-5 w-5 animate-spin text-accent-primary" />
              </div>
            )}

            {scoutReport && !loading && (
              <div className="mt-4 space-y-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-base font-bold text-dynasty-textBright">{scoutReport.playerName}</h3>
                    <p className="font-data text-xs text-dynasty-muted">
                      {scoutReport.position} | Age {scoutReport.age} | {scoutReport.teamName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-3xl font-bold text-accent-primary">{scoutReport.overall}</p>
                    <p className="font-heading text-[10px] text-dynasty-muted">Overall Grade</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {attrs.map((attr) => (
                    <ScoutGradeBar
                      key={attr}
                      label={attr}
                      grade={scoutReport.grades[attr.toLowerCase()] ?? 50}
                      confidence={scoutReport.confidence}
                    />
                  ))}
                </div>

                <div className="flex gap-6 border-t border-dynasty-border pt-3">
                  <div>
                    <p className="font-heading text-[10px] text-dynasty-muted">Ceiling</p>
                    <p className="font-data text-lg font-bold text-accent-success">{scoutReport.ceiling}</p>
                  </div>
                  <div>
                    <p className="font-heading text-[10px] text-dynasty-muted">Floor</p>
                    <p className="font-data text-lg font-bold text-accent-danger">{scoutReport.floor}</p>
                  </div>
                  <div>
                    <p className="font-heading text-[10px] text-dynasty-muted">Reliability</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((index) => (
                        <Shield key={index} className={`h-3 w-3 ${index <= scoutReport.reliability ? 'text-accent-info' : 'text-dynasty-border'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {scoutReport.notes && (
                  <div className="border-t border-dynasty-border pt-3">
                    <div className="mb-1 flex items-center gap-1">
                      <FileText className="h-3 w-3 text-dynasty-muted" />
                      <p className="font-heading text-[10px] text-dynasty-muted">Scout Notes ({scoutReport.scoutName})</p>
                    </div>
                    <p className="font-heading text-xs italic text-dynasty-text">{scoutReport.notes}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-accent-warning" />
              <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Recent Reports</h2>
            </div>
            {recentReports.length === 0 ? (
              <p className="py-4 text-center font-heading text-xs text-dynasty-muted">
                No reports yet. Search for a player above to generate a scouting report.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dynasty-border text-dynasty-muted">
                      <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">Name</th>
                      <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">POS</th>
                      <th className="py-2 pr-4 text-right font-heading text-[10px] font-semibold uppercase">Overall</th>
                      <th className="py-2 pr-4 text-right font-heading text-[10px] font-semibold uppercase">Confidence</th>
                      <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">Scout</th>
                      <th className="py-2 font-heading text-[10px] font-semibold uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReports.map((report, index) => (
                      <tr key={`${report.playerId}-${index}`} className="border-b border-dynasty-border/50 hover:bg-dynasty-elevated/50">
                        <td className="py-2 pr-4 font-heading text-sm text-dynasty-text">{report.playerName}</td>
                        <td className="py-2 pr-4 font-data text-xs text-dynasty-muted">{report.position}</td>
                        <td className="py-2 pr-4 text-right font-data text-sm text-dynasty-textBright">{report.overall}</td>
                        <td className="py-2 pr-4 text-right font-data text-xs text-dynasty-muted">&plusmn;{report.confidence}</td>
                        <td className="py-2 pr-4 font-heading text-xs text-dynasty-muted">{report.scoutName}</td>
                        <td className="py-2 font-data text-xs text-dynasty-muted">{report.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-accent-warning" />
              <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">International Bonus Pool</h2>
            </div>
            {ifaPool ? (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-4">
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="font-heading text-[10px] uppercase text-dynasty-muted">Window</div>
                    <div className={`mt-1 font-data text-2xl font-bold ${ifaPool.signingWindowOpen ? 'text-accent-success' : 'text-accent-warning'}`}>
                      {ifaPool.signingWindowOpen ? 'OPEN' : 'CLOSED'}
                    </div>
                    <div className="mt-2 font-heading text-xs text-dynasty-text">
                      {ifaPool.currentPhase ? regionLabel(ifaPool.currentPhase) : 'Pre-offseason'}
                    </div>
                  </div>
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="font-heading text-[10px] uppercase text-dynasty-muted">Remaining Pool</div>
                    <div className="mt-1 font-data text-2xl font-bold text-accent-primary">{formatMoney(ifaPool.budget.remaining)}</div>
                    <div className="mt-2 font-heading text-xs text-dynasty-text">
                      Committed {formatMoney(ifaPool.budget.committed)}
                    </div>
                  </div>
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="font-heading text-[10px] uppercase text-dynasty-muted">Trade Delta</div>
                    <div className="mt-1 font-data text-2xl font-bold text-dynasty-textBright">
                      {formatMoney(ifaPool.budget.tradedIn - ifaPool.budget.tradedOut)}
                    </div>
                    <div className="mt-2 font-heading text-xs text-dynasty-text">
                      In {formatMoney(ifaPool.budget.tradedIn)} / Out {formatMoney(ifaPool.budget.tradedOut)}
                    </div>
                  </div>
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="font-heading text-[10px] uppercase text-dynasty-muted">Dept. Accuracy</div>
                    <div className="mt-1 font-data text-2xl font-bold text-accent-info">
                      {(ifaPool.staffAccuracy * 100).toFixed(0)}%
                    </div>
                    <div className="mt-2 font-heading text-xs text-dynasty-text">
                      Better looks reduce report noise.
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Coins className="h-4 w-4 text-accent-info" />
                      <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">Pool Space Transfer</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr,120px,auto]">
                      <select
                        value={tradeTarget}
                        onChange={(event) => setTradeTarget(event.target.value)}
                        className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-sm text-dynasty-text outline-none focus:border-accent-primary"
                      >
                        {tradeTargets.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.city} {team.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0.05"
                        step="0.05"
                        value={tradeAmount}
                        onChange={(event) => setTradeAmount(event.target.value)}
                        className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-sm text-dynasty-text outline-none focus:border-accent-primary"
                      />
                      <button
                        type="button"
                        onClick={() => { void handleTradeIFAPool(); }}
                        className="rounded bg-accent-primary px-4 py-2 font-heading text-xs font-semibold text-black hover:opacity-90"
                      >
                        Transfer
                      </button>
                    </div>
                    <p className="mt-2 font-heading text-xs text-dynasty-muted">
                      Direct pool-space moves are enabled here ahead of the broader trade-asset UI.
                    </p>
                  </div>

                  <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Handshake className="h-4 w-4 text-accent-warning" />
                      <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">Selected Prospect</h3>
                    </div>
                    {ifaReport ? (
                      <div className="space-y-3">
                        <div>
                          <div className="font-heading text-base font-semibold text-dynasty-textBright">{ifaReport.playerName}</div>
                          <div className="font-data text-xs text-dynasty-muted">
                            {ifaReport.position} | Age {ifaReport.age} | {regionLabel(ifaReport.region)} / {ifaReport.country}
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="font-heading text-[10px] uppercase text-dynasty-muted">Your Grade</div>
                            <div className="font-data text-3xl font-bold text-accent-primary">{ifaReport.overall}</div>
                          </div>
                          <div className="text-right font-data text-xs text-dynasty-muted">
                            <div>{ifaReport.looks} look{ifaReport.looks === 1 ? '' : 's'}</div>
                            <div>Target {formatMoney(ifaReport.expectedBonus)}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {ifaAttrs.map((attr) => (
                            <ScoutGradeBar
                              key={attr}
                              label={attr}
                              grade={ifaReport.grades[attr.toLowerCase()] ?? 50}
                              confidence={ifaReport.confidence}
                            />
                          ))}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <div className="font-heading text-[10px] uppercase text-dynasty-muted">Ceiling</div>
                            <div className="font-data text-lg font-bold text-accent-success">{ifaReport.ceiling}</div>
                          </div>
                          <div>
                            <div className="font-heading text-[10px] uppercase text-dynasty-muted">Floor</div>
                            <div className="font-data text-lg font-bold text-accent-danger">{ifaReport.floor}</div>
                          </div>
                          <div>
                            <div className="font-heading text-[10px] uppercase text-dynasty-muted">Reliability</div>
                            <div className="mt-1 flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((index) => (
                                <Shield key={index} className={`h-3 w-3 ${index <= ifaReport.reliability ? 'text-accent-info' : 'text-dynasty-border'}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-dynasty-border pt-3">
                          <div className="font-heading text-[10px] uppercase text-dynasty-muted">Notes</div>
                          <p className="mt-1 font-heading text-xs italic text-dynasty-text">{ifaReport.notes}</p>
                        </div>
                        <div className="border-t border-dynasty-border pt-3">
                          <div className="mb-2 font-heading text-[10px] uppercase text-dynasty-muted">Bonus Offer</div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0.05"
                              step="0.05"
                              value={ifaBonus}
                              onChange={(event) => setIFABonus(event.target.value)}
                              className="flex-1 rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-sm text-dynasty-text outline-none focus:border-accent-primary"
                            />
                            <button
                              type="button"
                              disabled={!ifaPool.signingWindowOpen}
                              onClick={() => { void handleSignIFA(); }}
                              className="rounded bg-accent-warning px-4 py-2 font-heading text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Sign
                            </button>
                          </div>
                          {!ifaPool.signingWindowOpen && (
                            <p className="mt-2 font-heading text-xs text-dynasty-muted">
                              Signing opens during the dedicated international phase of the offseason.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="font-heading text-xs text-dynasty-muted">
                        Scout a prospect from the table to reveal your report and set a bonus offer.
                      </p>
                    )}
                  </div>
                </div>

                {actionMessage && (
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text">
                    {actionMessage}
                  </div>
                )}
              </div>
            ) : (
              <p className="py-4 text-center font-heading text-xs text-dynasty-muted">
                International scouting data is not available yet.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-accent-warning" />
              <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">IFA Board</h2>
            </div>
            {ifaLoading && (
              <div className="mb-3 flex items-center gap-2 py-3">
                <Target className="h-5 w-5 animate-spin text-accent-primary" />
                <span className="font-heading text-xs text-dynasty-muted">Updating international reports…</span>
              </div>
            )}
            {ifaPool && ifaPool.prospects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dynasty-border text-dynasty-muted">
                      <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">Prospect</th>
                      <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">Region</th>
                      <th className="py-2 pr-4 text-right font-heading text-[10px] font-semibold uppercase">Exp. Bonus</th>
                      <th className="py-2 pr-4 text-right font-heading text-[10px] font-semibold uppercase">Looks</th>
                      <th className="py-2 pr-4 text-right font-heading text-[10px] font-semibold uppercase">Your OVR</th>
                      <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">Status</th>
                      <th className="py-2 text-right font-heading text-[10px] font-semibold uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ifaPool.prospects.map((prospect) => (
                      <tr key={prospect.id} className="border-b border-dynasty-border/50 hover:bg-dynasty-elevated/50">
                        <td className="py-2 pr-4">
                          <div className="font-heading text-sm text-dynasty-text">{prospect.playerName}</div>
                          <div className="font-data text-xs text-dynasty-muted">{prospect.position} / Age {prospect.age}</div>
                        </td>
                        <td className="py-2 pr-4 font-data text-xs text-dynasty-muted">
                          {regionLabel(prospect.region)} / {prospect.country}
                        </td>
                        <td className="py-2 pr-4 text-right font-data text-sm text-dynasty-textBright">{formatMoney(prospect.expectedBonus)}</td>
                        <td className="py-2 pr-4 text-right font-data text-xs text-dynasty-muted">{prospect.looks}</td>
                        <td className="py-2 pr-4 text-right font-data text-sm text-dynasty-textBright">
                          {prospect.overall ?? '--'}
                          {prospect.confidence ? <span className="ml-1 text-[10px] text-dynasty-muted">&plusmn;{prospect.confidence}</span> : null}
                        </td>
                        <td className="py-2 pr-4 font-heading text-xs">
                          {prospect.status === 'available' ? (
                            <span className="text-accent-success">Available</span>
                          ) : (
                            <span className="text-dynasty-muted">
                              {teamDisplay(prospect.signedTeamId)} {prospect.signedBonus ? `(${formatMoney(prospect.signedBonus)})` : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            disabled={prospect.status !== 'available'}
                            onClick={() => { void handleScoutIFA(prospect); }}
                            className="rounded bg-dynasty-elevated px-3 py-1.5 font-heading text-[11px] font-semibold text-dynasty-text hover:border-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Scout
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-center font-heading text-xs text-dynasty-muted">
                No international prospects are loaded for this season yet.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
