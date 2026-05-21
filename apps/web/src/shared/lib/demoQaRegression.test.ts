// Vitest executes this source audit in Node, while the app tsconfig intentionally
// omits Node globals for runtime code.
// @ts-ignore
import { existsSync, readFileSync } from 'node:fs';
// @ts-ignore
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

declare const process: { cwd(): string };

const repoRoot = [process.cwd(), resolve(process.cwd(), '../..')]
  .find((candidate) => existsSync(join(candidate, 'apps/web/src'))) ?? process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('demo QA regression guards', () => {
  it('does not ship known bad basename links in demo-visible routes', () => {
    const files = [
      'apps/web/src/features/dashboard/routes/DashboardPage.tsx',
      'apps/web/src/features/dashboard/components/FranchiseLegacyCard.tsx',
      'apps/web/src/features/dashboard/components/CareerRetrospectiveCard.tsx',
      'apps/web/src/features/history/routes/HistoryPage.tsx',
      'apps/web/src/shared/components/EmptyStatePanel.tsx',
    ];

    for (const file of files) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\/MBD\/MBD|(?:to|actionHref)="\/MBD|\/gm-career/);
    }
  });

  it('does not expose raw enum sentinel labels in key UI files', () => {
    const files = [
      'apps/web/src/features/dashboard/routes/DashboardPage.tsx',
      'apps/web/src/features/finance/routes/FinancePage.tsx',
      'apps/web/src/features/minors/routes/MinorsPage.tsx',
      'apps/web/src/features/minors/components/PipelineView.tsx',
      'apps/web/src/features/press-room/routes/PressRoomPage.tsx',
      'apps/web/src/features/setup/routes/SetupPage.tsx',
      'apps/web/src/features/staff/routes/StaffPage.tsx',
      'apps/web/src/features/trade/routes/TradePage.tsx',
      'apps/web/src/features/players/routes/PlayerProfilePage.tsx',
      'apps/web/src/features/players/components/ProfileHeader.tsx',
      'apps/web/src/features/players/components/StoryArcsTab.tsx',
    ];

    for (const file of files) {
      const source = readSource(file);
      expect(source, file).not.toMatch(/\bAL_EAST\b|\bA_PLUS\b/);
    }
  });
});
