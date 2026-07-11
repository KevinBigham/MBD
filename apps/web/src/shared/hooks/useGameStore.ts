import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Difficulty } from '@mbd/contracts';

export const GAME_STORE_STORAGE_KEY = 'mbd:game-store@v1';
export const GAME_STORE_SESSION_RESUME_KEY = 'mbd:active-save-resume@v1';
const GAME_STORE_PERSIST_VERSION = 1;

interface ActiveSaveResumeHint {
  activeSaveId: string | null;
  activeSaveSlot: number | null;
}

function readActiveSaveResumeHint(): ActiveSaveResumeHint | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(GAME_STORE_SESSION_RESUME_KEY);
    if (raw == null) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const candidate = parsed as Partial<ActiveSaveResumeHint>;
    const validId = candidate.activeSaveId === null || typeof candidate.activeSaveId === 'string';
    const validSlot = candidate.activeSaveSlot === null
      || (typeof candidate.activeSaveSlot === 'number' && Number.isInteger(candidate.activeSaveSlot));
    if (!validId || !validSlot) return null;

    return {
      activeSaveId: candidate.activeSaveId!,
      activeSaveSlot: candidate.activeSaveSlot!,
    };
  } catch {
    return null;
  }
}

function writeActiveSaveResumeHint(hint: ActiveSaveResumeHint): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(GAME_STORE_SESSION_RESUME_KEY, JSON.stringify(hint));
  } catch {
    // The shared localStorage state remains the new-tab fallback when
    // per-document session storage is unavailable.
  }
}

export interface GameState {
  season: number;
  day: number;
  phase: string;
  isSimulating: boolean;
  isInitialized: boolean;
  userTeamId: string;
  teamName: string;
  gmName: string;
  difficulty: Difficulty;
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  playerCount: number;
  gamesPlayed: number;
  setSeason: (season: number) => void;
  setDay: (day: number) => void;
  setPhase: (phase: string) => void;
  setSimulating: (simulating: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setUserTeamId: (teamId: string) => void;
  setActiveSave: (id: string | null, slot: number | null) => void;
  setActiveSaveSlot: (slot: number | null) => void;
  updateFromSim: (data: {
    season: number;
    day: number;
    phase: string;
    gamesPlayed?: number;
  }) => void;
  initializeGame: (data: {
    season: number;
    day: number;
    phase: string;
    playerCount: number;
    userTeamId: string;
    teamName?: string;
    gmName?: string;
    difficulty?: Difficulty;
    activeSaveId?: string | null;
    activeSaveSlot?: number | null;
  }) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      season: 1,
      day: 1,
      phase: 'preseason',
      isSimulating: false,
      isInitialized: false,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'General Manager',
      difficulty: 'standard',
      activeSaveId: null,
      activeSaveSlot: null,
      playerCount: 0,
      gamesPlayed: 0,
      setSeason: (season) => set({ season }),
      setDay: (day) => set({ day }),
      setPhase: (phase) => set({ phase }),
      setSimulating: (simulating) => set({ isSimulating: simulating }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      setUserTeamId: (teamId) => set({ userTeamId: teamId }),
      setActiveSave: (id, slot) => {
        const target = { activeSaveId: id, activeSaveSlot: slot };
        writeActiveSaveResumeHint(target);
        set(target);
      },
      setActiveSaveSlot: (slot) => {
        const target = {
          activeSaveId: slot != null ? `save-slot-${slot}` : null,
          activeSaveSlot: slot,
        };
        writeActiveSaveResumeHint(target);
        set(target);
      },
      updateFromSim: (data) =>
        set({
          season: data.season,
          day: data.day,
          phase: data.phase,
          gamesPlayed: data.gamesPlayed ?? 0,
        }),
      initializeGame: (data) => {
        const target = {
          activeSaveId: data.activeSaveId
            ?? (data.activeSaveSlot != null ? `save-slot-${data.activeSaveSlot}` : null),
          activeSaveSlot: data.activeSaveSlot ?? null,
        };
        writeActiveSaveResumeHint(target);
        set({
          season: data.season,
          day: data.day,
          phase: data.phase,
          playerCount: data.playerCount,
          userTeamId: data.userTeamId,
          teamName: data.teamName ?? 'Franchise',
          gmName: data.gmName ?? 'General Manager',
          difficulty: data.difficulty ?? 'standard',
          ...target,
          isInitialized: true,
        });
      },
    }),
    {
      name: GAME_STORE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: GAME_STORE_PERSIST_VERSION,
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<GameState>),
        };
        const sessionHint = readActiveSaveResumeHint();
        return sessionHint ? { ...merged, ...sessionHint } : merged;
      },
      partialize: (state) => ({
        activeSaveId: state.activeSaveId,
        activeSaveSlot: state.activeSaveSlot,
        userTeamId: state.userTeamId,
        season: state.season,
        day: state.day,
        phase: state.phase,
        teamName: state.teamName,
        gmName: state.gmName,
        difficulty: state.difficulty,
      }),
    },
  ),
);
