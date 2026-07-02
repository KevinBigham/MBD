import type { ReactNode } from 'react';

interface DashboardIntelligenceGridProps {
  standingsSlot: ReactNode;
  rosterHealthSlot: ReactNode;
  tradeIntelSlot: ReactNode;
  farmReportSlot: ReactNode;
  financialsSlot: ReactNode;
  pressDigestSlot: ReactNode;
  milestoneWatchSlot: ReactNode;
  chaseWatchSlot: ReactNode;
  pennantRaceSlot: ReactNode;
  awardRaceSlot: ReactNode;
  signatureMomentsSlot: ReactNode;
  thisWeekInHistorySlot: ReactNode;
  playerArcsSlot: ReactNode;
  franchiseLegacySlot: ReactNode;
  careerRetrospectiveSlot: ReactNode;
}

export default function DashboardIntelligenceGrid({
  standingsSlot,
  rosterHealthSlot,
  tradeIntelSlot,
  farmReportSlot,
  financialsSlot,
  pressDigestSlot,
  milestoneWatchSlot,
  chaseWatchSlot,
  pennantRaceSlot,
  awardRaceSlot,
  signatureMomentsSlot,
  thisWeekInHistorySlot,
  playerArcsSlot,
  franchiseLegacySlot,
  careerRetrospectiveSlot,
}: DashboardIntelligenceGridProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {standingsSlot}
      {rosterHealthSlot}
      {tradeIntelSlot}
      {farmReportSlot}
      {financialsSlot}
      {pressDigestSlot}
      {milestoneWatchSlot}
      {chaseWatchSlot}
      {pennantRaceSlot}
      {awardRaceSlot}
      {signatureMomentsSlot}
      {thisWeekInHistorySlot}
      {playerArcsSlot}
      {franchiseLegacySlot}
      {careerRetrospectiveSlot}
    </section>
  );
}
