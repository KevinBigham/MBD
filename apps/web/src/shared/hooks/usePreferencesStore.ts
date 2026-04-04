import { create } from 'zustand';

export const PREFERENCES_STORAGE_KEY = 'mbd-preferences';
export const PREFERENCES_DEFAULTS = {
  simSpeed: 'fast',
  autoAdvance: false,
  defaultStatView: 'sabermetric',
  tableDensity: 'standard',
  reducedMotion: false,
  highContrast: false,
  lastVisitedPressRoomAt: null,
} as const;

interface PreferencesRecord {
  simSpeed: 'fast' | 'normal' | 'detailed';
  autoAdvance: boolean;
  defaultStatView: 'traditional' | 'sabermetric';
  tableDensity: 'compact' | 'standard';
  reducedMotion: boolean;
  highContrast: boolean;
  lastVisitedPressRoomAt: string | null;
}

interface PreferencesState extends PreferencesRecord {
  setSimSpeed: (value: PreferencesRecord['simSpeed']) => void;
  setAutoAdvance: (value: boolean) => void;
  setDefaultStatView: (value: PreferencesRecord['defaultStatView']) => void;
  setTableDensity: (value: PreferencesRecord['tableDensity']) => void;
  setReducedMotion: (value: boolean) => void;
  setHighContrast: (value: boolean) => void;
  setLastVisitedPressRoomAt: (value: string | null) => void;
  resetLastVisitedPressRoomAt: () => void;
  hydrate: () => void;
  reset: () => void;
}

function readPersistedPreferences(): PreferencesRecord {
  if (typeof window === 'undefined') {
    return { ...PREFERENCES_DEFAULTS };
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...PREFERENCES_DEFAULTS };
    }

    const parsed = JSON.parse(raw) as Partial<PreferencesRecord>;
    return {
      simSpeed: parsed.simSpeed === 'normal' || parsed.simSpeed === 'detailed' ? parsed.simSpeed : PREFERENCES_DEFAULTS.simSpeed,
      autoAdvance: typeof parsed.autoAdvance === 'boolean' ? parsed.autoAdvance : PREFERENCES_DEFAULTS.autoAdvance,
      defaultStatView: parsed.defaultStatView === 'traditional' ? parsed.defaultStatView : PREFERENCES_DEFAULTS.defaultStatView,
      tableDensity: parsed.tableDensity === 'compact' ? parsed.tableDensity : PREFERENCES_DEFAULTS.tableDensity,
      reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : PREFERENCES_DEFAULTS.reducedMotion,
      highContrast: typeof parsed.highContrast === 'boolean' ? parsed.highContrast : PREFERENCES_DEFAULTS.highContrast,
      lastVisitedPressRoomAt: typeof parsed.lastVisitedPressRoomAt === 'string' || parsed.lastVisitedPressRoomAt === null
        ? parsed.lastVisitedPressRoomAt
        : PREFERENCES_DEFAULTS.lastVisitedPressRoomAt,
    };
  } catch {
    return { ...PREFERENCES_DEFAULTS };
  }
}

function persistPreferences(preferences: PreferencesRecord) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

function buildPersistedState(nextState: PreferencesState): PreferencesRecord {
  return {
    simSpeed: nextState.simSpeed,
    autoAdvance: nextState.autoAdvance,
    defaultStatView: nextState.defaultStatView,
    tableDensity: nextState.tableDensity,
    reducedMotion: nextState.reducedMotion,
    highContrast: nextState.highContrast,
    lastVisitedPressRoomAt: nextState.lastVisitedPressRoomAt,
  };
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...readPersistedPreferences(),
  setSimSpeed: (value) => {
    set({ simSpeed: value });
    persistPreferences(buildPersistedState(get()));
  },
  setAutoAdvance: (value) => {
    set({ autoAdvance: value });
    persistPreferences(buildPersistedState(get()));
  },
  setDefaultStatView: (value) => {
    set({ defaultStatView: value });
    persistPreferences(buildPersistedState(get()));
  },
  setTableDensity: (value) => {
    set({ tableDensity: value });
    persistPreferences(buildPersistedState(get()));
  },
  setReducedMotion: (value) => {
    set({ reducedMotion: value });
    persistPreferences(buildPersistedState(get()));
  },
  setHighContrast: (value) => {
    set({ highContrast: value });
    persistPreferences(buildPersistedState(get()));
  },
  setLastVisitedPressRoomAt: (value) => {
    set({ lastVisitedPressRoomAt: value });
    persistPreferences(buildPersistedState(get()));
  },
  resetLastVisitedPressRoomAt: () => {
    set({ lastVisitedPressRoomAt: null });
    persistPreferences(buildPersistedState(get()));
  },
  hydrate: () => {
    set(readPersistedPreferences());
  },
  reset: () => {
    persistPreferences(PREFERENCES_DEFAULTS);
    set({ ...PREFERENCES_DEFAULTS });
  },
}));
