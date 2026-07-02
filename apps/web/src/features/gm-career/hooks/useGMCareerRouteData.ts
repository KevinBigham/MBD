import { useCallback, useEffect, useState } from 'react';
import type { GMCareer, JobMarket, SignatureMoment } from '@mbd/contracts';

interface UseGMCareerRouteDataOptions {
  day: number;
  getGMCareer: () => Promise<GMCareer | null | undefined>;
  getJobMarket: () => Promise<JobMarket | null | undefined>;
  getTeamMoments: (teamId: string) => Promise<SignatureMoment[] | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  workerReady: boolean;
}

export function useGMCareerRouteData({
  day,
  getGMCareer,
  getJobMarket,
  getTeamMoments,
  isInitialized,
  phase,
  season,
  workerReady,
}: UseGMCareerRouteDataOptions) {
  const [career, setCareer] = useState<GMCareer | null>(null);
  const [jobMarket, setJobMarket] = useState<JobMarket | null>(null);
  const [teamMoments, setTeamMoments] = useState<SignatureMoment[]>([]);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    const [careerData, jobData] = await Promise.all([
      getGMCareer(),
      getJobMarket(),
    ]);
    const nextTeamMoments = careerData?.currentTeamId
      ? await getTeamMoments(careerData.currentTeamId)
      : [];

    setCareer(careerData ?? null);
    setJobMarket(jobData ?? null);
    setTeamMoments(nextTeamMoments ?? []);
  }, [getGMCareer, getJobMarket, getTeamMoments, isInitialized, workerReady]);

  useEffect(() => {
    void fetchData();
  }, [day, fetchData, phase, season]);

  return {
    career,
    fetchData,
    jobMarket,
    teamMoments,
  };
}
