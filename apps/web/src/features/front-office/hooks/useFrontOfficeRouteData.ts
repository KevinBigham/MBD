import { useCallback, useEffect, useState } from 'react';
import type { TeamChemistry } from '@mbd/contracts';
import type { FrontOfficeMentorshipView } from '../components/FrontOfficeClubhouseWebCard';
import type { FrontOfficeReputationView } from '../components/FrontOfficeHealthCards';
import type { FrontOfficeIdentityView } from '../components/FrontOfficeIdentityCard';
import type { FrontOfficeRelationshipView } from '../components/FrontOfficeLeagueStandingCard';
import type { FrontOfficeOwnerView } from '../components/FrontOfficeOwnerCards';

interface UseFrontOfficeRouteDataOptions {
  day: number;
  getFrontOfficeIdentity: () => Promise<unknown | null | undefined>;
  getFrontOfficeState: () => Promise<unknown | null | undefined>;
  getMentorships: () => Promise<unknown | null | undefined>;
  getOwnerState: () => Promise<unknown | null | undefined>;
  getRelationships: () => Promise<unknown[] | null | undefined>;
  getTeamChemistry: () => Promise<unknown | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useFrontOfficeRouteData({
  day,
  getFrontOfficeIdentity,
  getFrontOfficeState,
  getMentorships,
  getOwnerState,
  getRelationships,
  getTeamChemistry,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseFrontOfficeRouteDataOptions) {
  const [owner, setOwner] = useState<FrontOfficeOwnerView | null>(null);
  const [frontOffice, setFrontOffice] = useState<FrontOfficeReputationView | null>(null);
  const [chemistry, setChemistry] = useState<TeamChemistry | null>(null);
  const [identity, setIdentity] = useState<FrontOfficeIdentityView | null>(null);
  const [relationships, setRelationships] = useState<FrontOfficeRelationshipView[]>([]);
  const [mentorship, setMentorship] = useState<FrontOfficeMentorshipView | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    setLoading(true);
    const [
      ownerData,
      frontOfficeData,
      chemistryData,
      identityData,
      relationshipData,
      mentorshipData,
    ] = await Promise.all([
      getOwnerState(),
      getFrontOfficeState(),
      getTeamChemistry(),
      getFrontOfficeIdentity(),
      getRelationships(),
      getMentorships(),
    ]);
    setOwner((ownerData ?? null) as FrontOfficeOwnerView | null);
    setFrontOffice((frontOfficeData ?? null) as FrontOfficeReputationView | null);
    setChemistry((chemistryData ?? null) as TeamChemistry | null);
    setIdentity((identityData ?? null) as FrontOfficeIdentityView | null);
    setRelationships((relationshipData ?? []) as FrontOfficeRelationshipView[]);
    setMentorship((mentorshipData ?? null) as FrontOfficeMentorshipView | null);
    setLoading(false);
  }, [
    getFrontOfficeIdentity,
    getFrontOfficeState,
    getMentorships,
    getOwnerState,
    getRelationships,
    getTeamChemistry,
    isInitialized,
    workerReady,
  ]);

  useEffect(() => {
    void fetchData();
  }, [day, fetchData, phase, season]);

  return {
    chemistry,
    frontOffice,
    identity,
    loading,
    mentorship,
    owner,
    relationships,
  };
}
