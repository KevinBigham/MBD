import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PageShell } from '@/shared/components/PageShell';
import {
  FrontOfficeChemistryCard,
  FrontOfficeReputationCard,
} from '../components/FrontOfficeHealthCards';
import { FrontOfficeIdentityCard } from '../components/FrontOfficeIdentityCard';
import {
  FrontOfficeBudgetCard,
  FrontOfficeOwnerProfileCard,
} from '../components/FrontOfficeOwnerCards';
import { FrontOfficeLeagueStandingCard } from '../components/FrontOfficeLeagueStandingCard';
import { FrontOfficeClubhouseWebCard } from '../components/FrontOfficeClubhouseWebCard';
import { useFrontOfficeRouteData } from '../hooks/useFrontOfficeRouteData';

export default function FrontOfficePage() {
  const worker = useWorker();
  const { isInitialized, season, day, phase } = useGameStore();
  const {
    chemistry,
    frontOffice,
    identity,
    loading,
    mentorship,
    owner,
    ownerPayrollPolicy,
    relationships,
  } = useFrontOfficeRouteData({
    day,
    getFrontOfficeIdentity: worker.getFrontOfficeIdentity,
    getFrontOfficeState: worker.getFrontOfficeState,
    getMentorships: worker.getMentorships,
    getOwnerPayrollPresentation: worker.getOwnerPayrollPresentation,
    getRelationships: worker.getRelationships,
    getTeamChemistry: worker.getTeamChemistry,
    isInitialized,
    phase,
    season,
    workerReady: worker.isReady,
  });

  return (
    <PageShell loading={loading}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-brand text-3xl tracking-wide text-dynasty-textBright">Owner Intel</h1>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            Front office intelligence and organizational health
          </p>
        </div>

        {/* Two-column grid */}
        {identity && <FrontOfficeIdentityCard identity={identity} />}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            {owner && <FrontOfficeOwnerProfileCard owner={owner} />}
            {chemistry && <FrontOfficeChemistryCard chemistry={chemistry} />}
          </div>
          <div className="space-y-4">
            {frontOffice && <FrontOfficeReputationCard reputation={frontOffice} />}
            {owner && <FrontOfficeBudgetCard owner={owner} ownerPayrollPolicy={ownerPayrollPolicy} />}
          </div>
        </div>

        {mentorship && <FrontOfficeClubhouseWebCard mentorship={mentorship} />}

        {relationships.length > 0 ? <FrontOfficeLeagueStandingCard relationships={relationships} /> : null}
      </div>
    </PageShell>
  );
}
