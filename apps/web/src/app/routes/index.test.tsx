import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/app/layout/AppLayout', async () => {
  const router = await import('react-router-dom');

  return {
    AppLayout: () => (
      <div data-testid="layout">
        <router.Outlet />
      </div>
    ),
  };
});

vi.mock('@/features/assistant/components/AssistantPanel', () => ({
  AssistantPanel: () => <div data-testid="setup-assistant">Assistant</div>,
}));

vi.mock('@/features/setup/routes/SetupPage', () => ({
  default: () => <div>Setup Route Ready</div>,
}));

vi.mock('@/features/dashboard/routes/DashboardPage', () => ({
  default: () => <div>Dashboard Route Ready</div>,
}));

vi.mock('@/features/roster/routes/RosterPage', () => ({
  default: () => <div>Roster Route Ready</div>,
}));

vi.mock('@/features/minors/routes/MinorsPage', () => ({
  default: () => <div>Minors Route Ready</div>,
}));

vi.mock('@/features/players/routes/PlayersPage', () => ({
  default: () => <div>Players Route Ready</div>,
}));

vi.mock('@/features/players/routes/PlayerProfilePage', () => ({
  default: () => <div>Player Profile Route Ready</div>,
}));

vi.mock('@/features/scouting/routes/ScoutingPage', () => ({
  default: () => <div>Scouting Route Ready</div>,
}));

vi.mock('@/features/staff/routes/StaffPage', () => ({
  default: () => <div>Staff Route Ready</div>,
}));

vi.mock('@/features/draft/routes/DraftPage', () => ({
  default: () => <div>Draft Route Ready</div>,
}));

vi.mock('@/features/trade/routes/TradePage', () => ({
  default: () => <div>Trade Route Ready</div>,
}));

vi.mock('@/features/league/routes/StandingsPage', () => ({
  default: () => <div>Standings Route Ready</div>,
}));

vi.mock('@/features/league/routes/LeadersPage', () => ({
  default: () => <div>Leaders Route Ready</div>,
}));

vi.mock('@/features/history/routes/HistoryPage', () => ({
  default: () => <div>History Route Ready</div>,
}));

vi.mock('@/features/press-room/routes/PressRoomPage', () => ({
  default: () => <div>Press Room Route Ready</div>,
}));

vi.mock('@/features/news/routes/NewsPage', () => ({
  default: () => <div>News Route Ready</div>,
}));

vi.mock('@/features/playoffs/routes/PlayoffsPage', () => ({
  default: () => <div>Playoffs Route Ready</div>,
}));

vi.mock('@/features/free-agency/routes/FreeAgencyPage', () => ({
  default: () => <div>Free Agency Route Ready</div>,
}));

vi.mock('@/features/offseason/routes/OffseasonPage', () => ({
  default: () => <div>Offseason Route Ready</div>,
}));

vi.mock('@/features/settings/routes/SettingsPage', () => ({
  default: () => <div>Settings Route Ready</div>,
}));

import { AppRoutes } from './index';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('AppRoutes', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the save hub route through the lazy loader', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Setup Route Ready');
    expect(container.textContent).toContain('Assistant');
  });

  it('navigates to an in-session route without breaking nested layout rendering', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Dashboard Route Ready');
    expect(container.querySelector('[data-testid="layout"]')).toBeTruthy();
  });

  it('renders the news route inside the app layout', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/news']}>
          <AppRoutes />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('News Route Ready');
    expect(container.querySelector('[data-testid="layout"]')).toBeTruthy();
  });
});
