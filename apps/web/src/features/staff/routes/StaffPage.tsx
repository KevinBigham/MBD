import { useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import StaffPageContent, { type StaffPageTab } from '../components/StaffPageContent';
import { useStaffActionHandlers } from '../hooks/useStaffActionHandlers';
import { useStaffRouteData } from '../hooks/useStaffRouteData';

export default function StaffPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, phase, season, day, userTeamId } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const [activeTab, setActiveTab] = useState<StaffPageTab>('overview');
  const {
    budget,
    chemistry,
    fetchStaffData,
    impact,
    market,
    mentorship,
    staff,
    topAffinities,
  } = useStaffRouteData({
    day,
    getCoachMarket: worker.getCoachMarket,
    getCoachingChemistry: worker.getCoachingChemistry,
    getCoachingImpact: worker.getCoachingImpact,
    getCoachingStaff: worker.getCoachingStaff,
    getMentorships: worker.getMentorships,
    getStaffBudget: worker.getStaffBudget,
    isInitialized,
    phase,
    season,
    userTeamId,
    workerReady,
  });

  const canManage = phase === 'offseason';
  const { busyCoachId, handleFire, handleHire } = useStaffActionHandlers({
    autosaveActiveGame,
    fetchStaffData,
    fireCoach: worker.fireCoach,
    hireCoach: worker.hireCoach,
    season,
  });

  return (
    <StaffPageContent
      activeTab={activeTab}
      budget={budget}
      busyCoachId={busyCoachId}
      canManage={canManage}
      chemistry={chemistry}
      impact={impact}
      market={market}
      mentorship={mentorship}
      onFire={handleFire}
      onHire={handleHire}
      onTabChange={setActiveTab}
      staff={staff}
      topAffinities={topAffinities}
    />
  );
}
