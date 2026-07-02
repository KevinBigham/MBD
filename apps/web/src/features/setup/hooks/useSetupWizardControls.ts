import { useMemo, useState } from 'react';
import type {
  SetupDayOneExperience,
  SetupDifficulty,
  SetupPlayMode,
  SetupWizardMode,
} from '../components/SetupDynastyWizardPanel';
import type {
  SetupTeamPickerFilters,
  TeamPreviewFilter,
} from '../components/SetupTeamPickerPanel';

const GM_FIRST_NAMES = ['Alex', 'Jordan', 'Jamie', 'Taylor', 'Morgan', 'Casey'] as const;
const GM_LAST_NAMES = ['Rivera', 'Porter', 'Sullivan', 'Hughes', 'Bennett', 'Foster'] as const;

export function generateDefaultGMName(seed: number): string {
  const first = GM_FIRST_NAMES[Math.abs(seed) % GM_FIRST_NAMES.length] ?? 'Alex';
  const last = GM_LAST_NAMES[Math.abs(Math.floor(seed / GM_FIRST_NAMES.length)) % GM_LAST_NAMES.length] ?? 'Rivera';
  return `${first} ${last}`;
}

interface UseSetupWizardControlsOptions {
  onResetPreviewMap: () => void;
  onStatusChange: (status: string) => void;
}

interface UseSetupWizardControlsResult {
  dayOneExperience: SetupDayOneExperience;
  difficulty: SetupDifficulty;
  gmName: string;
  openWizard: () => void;
  playMode: SetupPlayMode;
  seed: number;
  setDayOneExperience: (experience: SetupDayOneExperience) => void;
  setDifficulty: (difficulty: SetupDifficulty) => void;
  setGmName: (gmName: string) => void;
  setPlayMode: (playMode: SetupPlayMode) => void;
  setTeamId: (teamId: string) => void;
  setWizardMode: (wizardMode: SetupWizardMode) => void;
  setWizardOpen: (open: boolean) => void;
  teamId: string;
  teamPickerFilters: SetupTeamPickerFilters;
  updateTeamPickerFilter: (filter: keyof SetupTeamPickerFilters, value: string) => void;
  wizardMode: SetupWizardMode;
  wizardOpen: boolean;
}

export function useSetupWizardControls({
  onResetPreviewMap,
  onStatusChange,
}: UseSetupWizardControlsOptions): UseSetupWizardControlsResult {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [seed, setSeed] = useState<number>(() => Date.now());
  const [teamId, setTeamId] = useState<string>('nym');
  const [difficulty, setDifficulty] = useState<SetupDifficulty>('standard');
  const [playMode, setPlayMode] = useState<SetupPlayMode>('standard');
  const [dayOneExperience, setDayOneExperience] = useState<SetupDayOneExperience>('full');
  const [wizardMode, setWizardMode] = useState<SetupWizardMode>('dynasty');
  const [gmName, setGmName] = useState<string>(() => generateDefaultGMName(Date.now()));
  const [timelineFilter, setTimelineFilter] = useState<TeamPreviewFilter>('all');
  const [marketFilter, setMarketFilter] = useState<TeamPreviewFilter>('all');
  const [payrollFilter, setPayrollFilter] = useState<TeamPreviewFilter>('all');
  const [farmFilter, setFarmFilter] = useState<TeamPreviewFilter>('all');
  const [archetypeFilter, setArchetypeFilter] = useState<TeamPreviewFilter>('all');

  const teamPickerFilters = useMemo(() => ({
    archetype: archetypeFilter,
    farm: farmFilter,
    market: marketFilter,
    payroll: payrollFilter,
    timeline: timelineFilter,
  }), [archetypeFilter, farmFilter, marketFilter, payrollFilter, timelineFilter]);

  function updateTeamPickerFilter(filter: keyof SetupTeamPickerFilters, value: string) {
    const nextValue = value as TeamPreviewFilter;
    if (filter === 'timeline') {
      setTimelineFilter(nextValue);
    } else if (filter === 'market') {
      setMarketFilter(nextValue);
    } else if (filter === 'payroll') {
      setPayrollFilter(nextValue);
    } else if (filter === 'farm') {
      setFarmFilter(nextValue);
    } else {
      setArchetypeFilter(nextValue);
    }
  }

  function resetFilters() {
    setTimelineFilter('all');
    setMarketFilter('all');
    setPayrollFilter('all');
    setFarmFilter('all');
    setArchetypeFilter('all');
  }

  function openWizard() {
    const nextSeed = Date.now();
    setSeed(nextSeed);
    setGmName(generateDefaultGMName(nextSeed));
    setPlayMode('standard');
    setDayOneExperience('full');
    setWizardMode('dynasty');
    onResetPreviewMap();
    resetFilters();
    setWizardOpen(true);
    onStatusChange('');
  }

  return {
    dayOneExperience,
    difficulty,
    gmName,
    openWizard,
    playMode,
    seed,
    setDayOneExperience,
    setDifficulty,
    setGmName,
    setPlayMode,
    setTeamId,
    setWizardMode,
    setWizardOpen,
    teamId,
    teamPickerFilters,
    updateTeamPickerFilter,
    wizardMode,
    wizardOpen,
  };
}
