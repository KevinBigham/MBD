import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftPostDraftGradesPanel } from './DraftPostDraftGradesPanel';
import type { WorkerApi } from '@/workers/sim.worker';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type DraftPostDraftGradesView = Awaited<ReturnType<WorkerApi['getDraftPostDraftGrades']>>;
type DraftTeamGrade = NonNullable<DraftPostDraftGradesView>['grades'][number];

function makeGrade(overrides: Partial<DraftTeamGrade> & Pick<DraftTeamGrade, 'teamId' | 'teamName' | 'grade' | 'averageScoutingGrade'>): DraftTeamGrade {
  return {
    teamId: overrides.teamId,
    teamName: overrides.teamName,
    pickCount: overrides.pickCount ?? 4,
    averageScoutingGrade: overrides.averageScoutingGrade,
    grade: overrides.grade,
    bestPickPlayerId: overrides.bestPickPlayerId ?? `${overrides.teamId}-best-pick`,
    bestPickPlayerName: overrides.bestPickPlayerName ?? `${overrides.teamName} Anchor`,
    summary: overrides.summary ?? `${overrides.teamName} landed a balanced class.`,
  };
}

describe('DraftPostDraftGradesPanel', () => {
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

  it('renders nothing until post-draft grades are available', async () => {
    await act(async () => {
      root.render(<DraftPostDraftGradesPanel gradesView={null} />);
    });

    expect(container.textContent).toBe('');

    await act(async () => {
      root.render(<DraftPostDraftGradesPanel gradesView={{ grades: [], userTeamId: 'nym', userTeamGrade: null }} />);
    });

    expect(container.textContent).toBe('');
  });

  it('renders the user grade and top six league reaction cards', async () => {
    const userGrade = makeGrade({
      teamId: 'nym',
      teamName: 'New York Tycoons',
      grade: 'A-',
      averageScoutingGrade: 61,
      summary: 'New York found impact talent and kept the bonus risk manageable.',
    });
    const grades: DraftTeamGrade[] = [
      userGrade,
      makeGrade({ teamId: 'bos', teamName: 'Boston Noreasters', grade: 'B+', averageScoutingGrade: 59 }),
      makeGrade({ teamId: 'chi', teamName: 'Chicago Union', grade: 'B', averageScoutingGrade: 57 }),
      makeGrade({ teamId: 'sea', teamName: 'Seattle Evergreens', grade: 'B-', averageScoutingGrade: 55 }),
      makeGrade({ teamId: 'la', teamName: 'Los Angeles Stars', grade: 'C+', averageScoutingGrade: 52 }),
      makeGrade({ teamId: 'mia', teamName: 'Miami Palms', grade: 'C', averageScoutingGrade: 49 }),
      makeGrade({
        teamId: 'den',
        teamName: 'Denver Peaks',
        grade: 'D+',
        averageScoutingGrade: 43,
        summary: 'Denver reached for too many volatile profiles.',
      }),
    ];

    await act(async () => {
      root.render(
        <DraftPostDraftGradesPanel
          gradesView={{
            grades,
            userTeamId: 'nym',
            userTeamGrade: userGrade,
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Post-Draft Grades');
    expect(container.textContent).toContain('League Reaction Board');
    expect(container.textContent).toContain('Your Class');
    expect(container.textContent).toContain('A-');
    expect(container.textContent).toContain('New York found impact talent');
    expect(container.textContent).toContain('Rank 1');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Avg 61');
    expect(container.textContent).toContain('Rank 6');
    expect(container.textContent).toContain('Miami Palms');
    expect(container.textContent).toContain('Avg 49');
    expect(container.textContent).not.toContain('Rank 7');
    expect(container.textContent).not.toContain('Denver Peaks');
  });
});
