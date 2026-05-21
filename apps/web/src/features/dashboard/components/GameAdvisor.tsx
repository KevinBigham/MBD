/**
 * GameAdvisor — Smart recommendation engine that suggests what the player
 * should do next based on the current game state.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  route: string;
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'border-accent-danger/40 bg-accent-danger/5';
    case 'medium': return 'border-accent-warning/40 bg-accent-warning/5';
    default: return 'border-dynasty-border bg-dynasty-elevated/30';
  }
}

function priorityDot(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-accent-danger';
    case 'medium': return 'bg-accent-warning';
    default: return 'bg-accent-info';
  }
}

export default function GameAdvisor() {
  const worker = useWorker();
  const { isInitialized, season, day, phase } = useGameStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [expanded, setExpanded] = useState(true);

  const analyze = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;

    const recs: Recommendation[] = [];

    try {
      const [dashSummary, compliance, tradeState, pipeline] = await Promise.all([
        worker.getDashboardSummary(),
        worker.getRosterComplianceIssues(),
        worker.getTradeDeadlineState(),
        worker.getProspectPipeline(),
      ]);
      const summary = dashSummary as Record<string, unknown> | null;

      const rosterIssues = (compliance as { issues?: unknown[] } | null)?.issues?.length ?? 0;
      if (rosterIssues > 0) {
        recs.push({
          id: 'roster-compliance',
          priority: 'high',
          title: `${rosterIssues} roster compliance issue${rosterIssues > 1 ? 's' : ''}`,
          description: 'Your roster has violations that need to be resolved before simming.',
          route: '/roster',
        });
      }

      const hotOffers = (tradeState as { hotOffers?: unknown[] } | null)?.hotOffers ?? [];
      if (hotOffers.length > 0) {
        recs.push({
          id: 'trade-offers',
          priority: 'high',
          title: `${hotOffers.length} incoming trade offer${hotOffers.length > 1 ? 's' : ''}`,
          description: 'Other GMs are calling. Review and respond before they move on.',
          route: '/trade',
        });
      }

      // Check for extension candidates in offseason
      if (phase === 'offseason') {
        recs.push({
          id: 'offseason-actions',
          priority: 'medium',
          title: 'Offseason phase active',
          description: 'Work through arbitration, extensions, free agency, and draft preparation.',
          route: '/offseason',
        });
      }

      // Check for promotion candidates
      if (phase === 'regular') {
        const candidates = (pipeline as { health?: { readyNow?: number } } | null)?.health?.readyNow ?? 0;
        if (candidates > 0) {
          recs.push({
            id: 'promotion-candidates',
            priority: 'medium',
            title: `${candidates} prospect${candidates > 1 ? 's' : ''} ready for promotion`,
            description: 'Your farm system has players ready for the next level.',
            route: '/minors',
          });
        }

        // Suggest checking scouting reports
        if (day < 30) {
          recs.push({
            id: 'early-season-scouting',
            priority: 'low',
            title: 'Scout your roster',
            description: 'Early season is a great time to evaluate your players and identify trade targets.',
            route: '/scouting',
          });
        }

        // Suggest checking finance mid-season
        if (day > 60 && day < 100) {
          recs.push({
            id: 'midseason-finance',
            priority: 'low',
            title: 'Review your budget',
            description: 'Mid-season is a good time to check payroll and plan for deadline moves.',
            route: '/finance',
          });
        }
      }

      // Always suggest checking press room if there are unread items
      const pressCount = (summary?.pressRoom as { unreadCount?: number } | undefined);
      const totalPress = pressCount?.unreadCount ?? 0;
      if (totalPress > 5) {
        recs.push({
          id: 'press-room',
          priority: 'low',
          title: `${totalPress} unread stories`,
          description: 'Catch up on the latest news, briefings, and league-wide moves.',
          route: '/press-room',
        });
      }

    } catch {
      // noop — advisor is best-effort
    }

    setRecommendations(recs);
  }, [isInitialized, worker, phase, day]);

  useEffect(() => {
    void analyze();
  }, [analyze, season, day, phase]);

  if (recommendations.length === 0) return null;

  return (
    <section className="rounded-xl border border-accent-info/20 bg-accent-info/5 p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent-info" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
            What should I do?
          </h2>
          <span className="rounded-full bg-accent-info/20 px-2 py-0.5 font-data text-[10px] text-accent-info">
            {recommendations.length}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-dynasty-muted" /> : <ChevronDown className="h-4 w-4 text-dynasty-muted" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {recommendations.map((rec) => (
            <Link
              key={rec.id}
              to={rec.route}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-accent-primary/40 ${priorityColor(rec.priority)}`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot(rec.priority)}`} />
              <div className="min-w-0 flex-1">
                <div className="font-heading text-xs font-medium text-dynasty-textBright">{rec.title}</div>
                <div className="mt-0.5 font-data text-[10px] text-dynasty-muted">{rec.description}</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-dynasty-muted" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
