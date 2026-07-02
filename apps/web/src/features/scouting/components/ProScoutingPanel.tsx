import {
  ClipboardList,
  Eye,
  Search,
  Target,
} from 'lucide-react';
import ProScoutReportPanel, { type ScoutReportView } from './ProScoutReportPanel';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

export type { ScoutReportView } from './ProScoutReportPanel';

interface ProScoutingPanelProps {
  loading: boolean;
  onChangeSearchQuery: (query: string) => void;
  onScoutPlayer: (player: PlayerDTO) => void | Promise<void>;
  onSearch: () => void | Promise<void>;
  recentReports: ScoutReportView[];
  scoutReport: ScoutReportView | null;
  searchQuery: string;
  searchResults: PlayerDTO[];
}

export default function ProScoutingPanel({
  loading,
  onChangeSearchQuery,
  onScoutPlayer,
  onSearch,
  recentReports,
  scoutReport,
  searchQuery,
  searchResults,
}: ProScoutingPanelProps) {
  return (
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
              data-mobile-critical-control="scouting-pro-search-input"
              value={searchQuery}
              onChange={(event) => onChangeSearchQuery(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void onSearch()}
              placeholder="Search player by name..."
              className="mobile-critical-control w-full rounded border border-dynasty-border bg-dynasty-elevated py-1.5 pl-9 pr-3 font-heading text-sm text-dynasty-text placeholder-dynasty-muted outline-none focus:border-accent-primary"
            />
          </div>
          <button
            type="button"
            data-mobile-critical-control="scouting-pro-search-submit"
            onClick={() => { void onSearch(); }}
            className="focus-ring mobile-critical-control rounded bg-accent-primary px-4 py-1.5 font-heading text-xs font-semibold text-black hover:opacity-90"
          >
            Search
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded border border-dynasty-border bg-dynasty-elevated">
            {searchResults.map((player) => (
              <button
                key={player.id}
                type="button"
                data-mobile-critical-control="scouting-pro-player-report"
                onClick={() => { void onScoutPlayer(player); }}
                className="focus-ring mobile-critical-control flex w-full items-center justify-between px-3 py-2 text-left hover:bg-dynasty-surface"
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

        {scoutReport && !loading && <ProScoutReportPanel report={scoutReport} />}
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
  );
}
