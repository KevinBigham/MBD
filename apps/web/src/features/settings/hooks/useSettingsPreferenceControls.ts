import { useAudioPreferencesStore } from '@/shared/hooks/useAudioPreferencesStore';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';
import { getAudioEngine } from '@/shared/lib/audio';
import type {
  SettingsDefaultStatView,
  SettingsSimSpeed,
  SettingsTableDensity,
} from '../components/SettingsPreferencesPanel';

interface UseSettingsPreferenceControlsResult {
  ambientVolumePercent: number;
  autoAdvance: boolean;
  defaultStatView: SettingsDefaultStatView;
  effectVolumePercent: number;
  handleAmbientVolumeChange: (nextVolume: number) => void;
  handleAutoAdvanceToggle: () => void;
  handleDefaultStatViewChange: (nextView: SettingsDefaultStatView) => void;
  handleEffectVolumeChange: (nextVolume: number) => void;
  handleHighContrastToggle: () => void;
  handleMuteToggle: () => void;
  handleReducedMotionToggle: () => void;
  handleSimSpeedChange: (nextSpeed: SettingsSimSpeed) => void;
  handleTableDensityChange: (nextDensity: SettingsTableDensity) => void;
  handleVolumeChange: (nextVolume: number) => void;
  highContrast: boolean;
  muted: boolean;
  reducedMotion: boolean;
  simSpeed: SettingsSimSpeed;
  tableDensity: SettingsTableDensity;
  volumePercent: number;
}

export function useSettingsPreferenceControls(): UseSettingsPreferenceControlsResult {
  const muted = useAudioPreferencesStore((state) => state.muted);
  const volume = useAudioPreferencesStore((state) => state.volume);
  const effectVolume = useAudioPreferencesStore((state) => state.effectVolume);
  const ambientVolume = useAudioPreferencesStore((state) => state.ambientVolume);
  const setMuted = useAudioPreferencesStore((state) => state.setMuted);
  const setVolume = useAudioPreferencesStore((state) => state.setVolume);
  const setEffectVolume = useAudioPreferencesStore((state) => state.setEffectVolume);
  const setAmbientVolume = useAudioPreferencesStore((state) => state.setAmbientVolume);
  const simSpeed = usePreferencesStore((state) => state.simSpeed);
  const autoAdvance = usePreferencesStore((state) => state.autoAdvance);
  const defaultStatView = usePreferencesStore((state) => state.defaultStatView);
  const tableDensity = usePreferencesStore((state) => state.tableDensity);
  const reducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const highContrast = usePreferencesStore((state) => state.highContrast);
  const setSimSpeed = usePreferencesStore((state) => state.setSimSpeed);
  const setAutoAdvance = usePreferencesStore((state) => state.setAutoAdvance);
  const setDefaultStatView = usePreferencesStore((state) => state.setDefaultStatView);
  const setTableDensity = usePreferencesStore((state) => state.setTableDensity);
  const setReducedMotion = usePreferencesStore((state) => state.setReducedMotion);
  const setHighContrast = usePreferencesStore((state) => state.setHighContrast);

  function handleMuteToggle() {
    const nextMuted = !muted;
    const audio = getAudioEngine();
    audio.setVolume(volume);
    audio.setMuted(nextMuted);
    setMuted(nextMuted);
    if (!nextMuted) {
      audio.playEffect('modal_open');
    }
  }

  function handleVolumeChange(nextVolume: number) {
    const audio = getAudioEngine();
    audio.setVolume(nextVolume);
    setVolume(nextVolume);
    if (!muted) {
      audio.playEffect('button_click');
    }
  }

  function handleEffectVolumeChange(nextVolume: number) {
    const audio = getAudioEngine();
    audio.setEffectVolume(nextVolume);
    setEffectVolume(nextVolume);
  }

  function handleAmbientVolumeChange(nextVolume: number) {
    const audio = getAudioEngine();
    audio.setAmbientVolume(nextVolume);
    setAmbientVolume(nextVolume);
  }

  return {
    ambientVolumePercent: Math.round(ambientVolume * 100),
    autoAdvance,
    defaultStatView,
    effectVolumePercent: Math.round(effectVolume * 100),
    handleAmbientVolumeChange,
    handleAutoAdvanceToggle: () => setAutoAdvance(!autoAdvance),
    handleDefaultStatViewChange: setDefaultStatView,
    handleEffectVolumeChange,
    handleHighContrastToggle: () => setHighContrast(!highContrast),
    handleMuteToggle,
    handleReducedMotionToggle: () => setReducedMotion(!reducedMotion),
    handleSimSpeedChange: setSimSpeed,
    handleTableDensityChange: setTableDensity,
    handleVolumeChange,
    highContrast,
    muted,
    reducedMotion,
    simSpeed,
    tableDensity,
    volumePercent: Math.round(volume * 100),
  };
}
