import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Difficulty } from '@mbd/contracts';

export const GAME_STORE_STORAGE_KEY = 'mbd:game-store@v1';
const GAME_STORE_PERSIST_VERSION = 1;

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
      setActiveSave: (id, slot) => set({ activeSaveId: id, activeSaveSlot: slot }),
      setActiveSaveSlot: (slot) => set({
        activeSaveId: slot != null ? `save-slot-${slot}` : null,
        activeSaveSlot: slot,
      }),
      updateFromSim: (data) =>
        set({
          season: data.season,
          day: data.day,
          phase: data.phase,
          gamesPlayed: data.gamesPlayed ?? 0,
        }),
      initializeGame: (data) =>
        set({
          season: data.season,
          day: data.day,
          phase: data.phase,
          playerCount: data.playerCount,
          userTeamId: data.userTeamId,
          teamName: data.teamName ?? 'Franchise',
          gmName: data.gmName ?? 'General Manager',
          difficulty: data.difficulty ?? 'standard',
          activeSaveId: data.activeSaveId ?? (data.activeSaveSlot != null ? `save-slot-${data.activeSaveSlot}` : null),
          activeSaveSlot: data.activeSaveSlot ?? null,
          isInitialized: true,
        }),
    }),
    {
      name: GAME_STORE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: GAME_STORE_PERSIST_VERSION,
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
