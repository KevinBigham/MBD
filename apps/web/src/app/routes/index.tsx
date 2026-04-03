import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layout/AppLayout';
import { RouteErrorBoundary } from '@/app/providers/RouteErrorBoundary';

// Lazy-loaded route components
const DashboardPage = lazy(
  () => import('@/features/dashboard/routes/DashboardPage')
);
const SetupPage = lazy(
  () => import('@/features/setup/routes/SetupPage')
);
const RosterPage = lazy(
  () => import('@/features/roster/routes/RosterPage')
);
const MinorsPage = lazy(
  () => import('@/features/minors/routes/MinorsPage')
);
const PlayersPage = lazy(
  () => import('@/features/players/routes/PlayersPage')
);
const PlayerProfilePage = lazy(
  () => import('@/features/players/routes/PlayerProfilePage')
);
const ScoutingPage = lazy(
  () => import('@/features/scouting/routes/ScoutingPage')
);
const StaffPage = lazy(
  () => import('@/features/staff/routes/StaffPage')
);
const DraftPage = lazy(
  () => import('@/features/draft/routes/DraftPage')
);
const TradePage = lazy(
  () => import('@/features/trade/routes/TradePage')
);
const StandingsPage = lazy(
  () => import('@/features/league/routes/StandingsPage')
);
const LeadersPage = lazy(
  () => import('@/features/league/routes/LeadersPage')
);
const HistoryPage = lazy(
  () => import('@/features/history/routes/HistoryPage')
);
const PressRoomPage = lazy(
  () => import('@/features/press-room/routes/PressRoomPage')
);
const PlayoffsPage = lazy(
  () => import('@/features/playoffs/routes/PlayoffsPage')
);
const FreeAgencyPage = lazy(
  () => import('@/features/free-agency/routes/FreeAgencyPage')
);
const OffseasonPage = lazy(
  () => import('@/features/offseason/routes/OffseasonPage')
);
const SettingsPage = lazy(
  () => import('@/features/settings/routes/SettingsPage')
);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="mb-3 font-brand text-2xl text-accent-primary">
          MBD
        </div>
        <div className="font-data text-sm text-dynasty-muted">Loading...</div>
      </div>
    </div>
  );
}

function withRouteBoundary(routeLabel: string, element: JSX.Element) {
  return (
    <RouteErrorBoundary routeLabel={routeLabel}>
      {element}
    </RouteErrorBoundary>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={withRouteBoundary('Save Hub', <SetupPage />)} />
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={withRouteBoundary('Dashboard', <DashboardPage />)} />
          <Route path="roster" element={withRouteBoundary('Roster', <RosterPage />)} />
          <Route path="minors" element={withRouteBoundary('Minors', <MinorsPage />)} />
          <Route path="players" element={withRouteBoundary('Players', <PlayersPage />)} />
          <Route path="players/:playerId" element={withRouteBoundary('Player Profile', <PlayerProfilePage />)} />
          <Route path="scouting" element={withRouteBoundary('Scouting', <ScoutingPage />)} />
          <Route path="staff" element={withRouteBoundary('Staff', <StaffPage />)} />
          <Route path="draft" element={withRouteBoundary('Draft', <DraftPage />)} />
          <Route path="trade" element={withRouteBoundary('Trade', <TradePage />)} />
          <Route path="standings" element={withRouteBoundary('Standings', <StandingsPage />)} />
          <Route path="leaders" element={withRouteBoundary('Leaders', <LeadersPage />)} />
          <Route path="league">
            <Route path="standings" element={withRouteBoundary('Standings', <StandingsPage />)} />
            <Route path="leaders" element={withRouteBoundary('Leaders', <LeadersPage />)} />
            <Route index element={<Navigate to="standings" replace />} />
          </Route>
          <Route path="press-room" element={withRouteBoundary('Press Room', <PressRoomPage />)} />
          <Route path="playoffs" element={withRouteBoundary('Playoffs', <PlayoffsPage />)} />
          <Route path="free-agency" element={withRouteBoundary('Free Agency', <FreeAgencyPage />)} />
          <Route path="offseason" element={withRouteBoundary('Offseason', <OffseasonPage />)} />
          <Route path="history" element={withRouteBoundary('History', <HistoryPage />)} />
          <Route path="settings" element={withRouteBoundary('Settings', <SettingsPage />)} />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
