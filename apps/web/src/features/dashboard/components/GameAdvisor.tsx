/**
 * GameAdvisor — Smart recommendation engine that suggests what the player
 * should do next based on the current game state.
 */

import { useCallback, useEffect, useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import GameAdvisorBody, { type Recommendation } from './GameAdvisorBody';

export default function GameAdvisor() {
  const worker = useWorker();
  const { isInitialized, season, day, phase } = useGameStore();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

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

  return <GameAdvisorBody recommendations={recommendations} />;
}
