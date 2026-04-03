export type AudioEffectName =
  | 'button_click'
  | 'tab_switch'
  | 'modal_open'
  | 'modal_close'
  | 'draft_pick_announced'
  | 'trade_completed'
  | 'free_agent_signed'
  | 'extension_signed'
  | 'injury_alert'
  | 'prospect_callup'
  | 'home_run'
  | 'strikeout'
  | 'win'
  | 'loss'
  | 'walk_off'
  | 'playoff_clinch'
  | 'world_series_win'
  | 'achievement_unlock';

export type AmbientMode =
  | 'office'
  | 'ballpark'
  | 'draft-room'
  | 'press-room'
  | 'celebration';

interface AudioEngineOptions {
  createContext?: () => AudioContext | null;
  prefersReducedMotion?: () => boolean;
}

interface AudioHandle {
  stop: () => void;
}

const MIN_GAIN = 0.0001;
const DEFAULT_GAIN = 0.18;
const NOISE_DURATION_SECONDS = 2;

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 0.65;
  }
  return Math.max(0, Math.min(1, Number(volume.toFixed(2))));
}

function defaultCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const ContextCtor = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  return ContextCtor ? new ContextCtor() : null;
}

function defaultPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function safeDisconnect(node: { disconnect?: () => void }) {
  try {
    node.disconnect?.();
  } catch {
    // Disconnect failures should never break the app shell.
  }
}

function safeStop(node: { stop?: (when?: number) => void }, when: number) {
  try {
    node.stop?.(when);
  } catch {
    // Nodes may already be stopped during rapid ambient swaps.
  }
}

function compositeHandle(handles: AudioHandle[]): AudioHandle {
  return {
    stop: () => {
      for (const handle of handles) {
        handle.stop();
      }
    },
  };
}

export class AudioEngine {
  private readonly createContext: () => AudioContext | null;

  private readonly prefersReducedMotion: () => boolean;

  private context: AudioContext | null = null;

  private masterGain: GainNode | null = null;

  private effectGain: GainNode | null = null;

  private ambientGain: GainNode | null = null;

  private volume = 0.65;

  private effectVolume = 0.85;

  private ambientVolume = 0.55;

  private muted = true;

  private ambientMode: AmbientMode | null = null;

  private ambientHandle: AudioHandle | null = null;

  private readonly noiseBufferCache = new Map<string, AudioBuffer>();

  constructor(options: AudioEngineOptions = {}) {
    this.createContext = options.createContext ?? defaultCreateAudioContext;
    this.prefersReducedMotion = options.prefersReducedMotion ?? defaultPrefersReducedMotion;
  }

  playEffect(name: AudioEffectName) {
    if (this.muted) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.effectGain) {
      return;
    }

    void context.resume?.();
    this.buildEffect(name, context, this.effectGain);
  }

  setAmbient(mode: AmbientMode | null) {
    this.ambientMode = mode;
    this.stopAmbientLayer();

    if (!mode || this.muted || this.prefersReducedMotion()) {
      return;
    }

    this.startAmbientLayer(mode);
  }

  setVolume(level: number) {
    this.volume = clampVolume(level);
    this.syncMasterGain();
  }

  setEffectVolume(level: number) {
    this.effectVolume = clampVolume(level);
    this.syncEffectGain();
  }

  setAmbientVolume(level: number) {
    this.ambientVolume = clampVolume(level);
    this.syncAmbientGain();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.syncMasterGain();

    if (muted) {
      this.stopAmbientLayer();
      return;
    }

    if (this.ambientMode && !this.prefersReducedMotion()) {
      this.startAmbientLayer(this.ambientMode);
    }
  }

  isMuted() {
    return this.muted;
  }

  getVolume() {
    return this.volume;
  }

  getEffectVolume() {
    return this.effectVolume;
  }

  getAmbientVolume() {
    return this.ambientVolume;
  }

  getAmbientMode() {
    return this.ambientMode;
  }

  hasContext() {
    return this.context != null;
  }

  hasActiveAmbient() {
    return this.ambientHandle != null;
  }

  dispose() {
    this.stopAmbientLayer();
    this.context = null;
    this.masterGain = null;
    this.effectGain = null;
    this.ambientGain = null;
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.masterGain && this.effectGain && this.ambientGain) {
      return this.context;
    }

    let nextContext: AudioContext | null = null;
    try {
      nextContext = this.createContext();
    } catch {
      return null;
    }

    if (!nextContext) {
      return null;
    }

    this.context = nextContext;
    this.masterGain = nextContext.createGain();
    this.effectGain = nextContext.createGain();
    this.ambientGain = nextContext.createGain();
    this.effectGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.masterGain.connect(nextContext.destination);
    this.syncMasterGain();
    this.syncEffectGain();
    this.syncAmbientGain();
    return nextContext;
  }

  private syncMasterGain() {
    if (!this.masterGain || !this.context) {
      return;
    }

    const target = this.muted ? 0 : this.volume;
    this.masterGain.gain.setValueAtTime(target, this.context.currentTime);
  }

  private syncEffectGain() {
    if (!this.effectGain || !this.context) {
      return;
    }

    this.effectGain.gain.setValueAtTime(this.effectVolume, this.context.currentTime);
  }

  private syncAmbientGain() {
    if (!this.ambientGain || !this.context) {
      return;
    }

    this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.context.currentTime);
  }

  private startAmbientLayer(mode: AmbientMode) {
    this.stopAmbientLayer();

    const context = this.ensureContext();
    if (!context || !this.ambientGain) {
      return;
    }

    void context.resume?.();

    const quiet = this.ambientGain;
    switch (mode) {
      case 'office':
        this.ambientHandle = compositeHandle([
          this.createLoopingNoise(context, quiet, { gain: 0.03, filterType: 'lowpass', frequency: 320 }),
          this.createContinuousTone(context, quiet, { type: 'sine', frequency: 62, gain: 0.015 }),
          this.createContinuousTone(context, quiet, { type: 'triangle', frequency: 188, gain: 0.003 }),
        ]);
        break;
      case 'ballpark':
        this.ambientHandle = compositeHandle([
          this.createLoopingNoise(context, quiet, { gain: 0.045, filterType: 'bandpass', frequency: 900 }),
          this.createContinuousTone(context, quiet, { type: 'triangle', frequency: 440, gain: 0.006 }),
          this.createContinuousTone(context, quiet, { type: 'sine', frequency: 220, gain: 0.004 }),
        ]);
        break;
      case 'draft-room':
        this.ambientHandle = compositeHandle([
          this.createLoopingNoise(context, quiet, { gain: 0.028, filterType: 'bandpass', frequency: 520 }),
          this.createContinuousTone(context, quiet, { type: 'sawtooth', frequency: 94, gain: 0.01 }),
        ]);
        break;
      case 'press-room':
        this.ambientHandle = compositeHandle([
          this.createLoopingNoise(context, quiet, { gain: 0.025, filterType: 'highpass', frequency: 850 }),
          this.createContinuousTone(context, quiet, { type: 'square', frequency: 330, gain: 0.0025 }),
        ]);
        break;
      case 'celebration':
        this.ambientHandle = compositeHandle([
          this.createLoopingNoise(context, quiet, { gain: 0.05, filterType: 'bandpass', frequency: 1100 }),
          this.createContinuousTone(context, quiet, { type: 'triangle', frequency: 523, gain: 0.007 }),
        ]);
        break;
    }
  }

  private stopAmbientLayer() {
    this.ambientHandle?.stop();
    this.ambientHandle = null;
  }

  private buildEffect(name: AudioEffectName, context: AudioContext, destination: AudioNode) {
    switch (name) {
      case 'button_click':
        this.playTone(context, destination, { type: 'square', frequency: 1220, gain: 0.08, duration: 0.04 });
        break;
      case 'tab_switch':
        this.playNoiseBurst(context, destination, { gain: 0.05, duration: 0.12, filterType: 'bandpass', frequency: 1100 });
        this.playTone(context, destination, { type: 'sine', frequency: 420, gain: 0.04, duration: 0.1, detune: 120 });
        break;
      case 'modal_open':
        this.playTone(context, destination, { type: 'triangle', frequency: 380, gain: 0.05, duration: 0.18, frequencyEnd: 620 });
        break;
      case 'modal_close':
        this.playTone(context, destination, { type: 'triangle', frequency: 620, gain: 0.04, duration: 0.12, frequencyEnd: 360 });
        break;
      case 'draft_pick_announced':
        this.playTone(context, destination, { type: 'triangle', frequency: 392, gain: 0.07, duration: 0.32 });
        this.playTone(context, destination, { type: 'triangle', frequency: 523, gain: 0.055, duration: 0.28, startOffset: 0.08 });
        this.playNoiseBurst(context, destination, { gain: 0.035, duration: 0.42, filterType: 'bandpass', frequency: 960 });
        break;
      case 'trade_completed':
        this.playTone(context, destination, { type: 'sawtooth', frequency: 330, gain: 0.065, duration: 0.2 });
        this.playTone(context, destination, { type: 'sawtooth', frequency: 247, gain: 0.055, duration: 0.18, startOffset: 0.16 });
        break;
      case 'free_agent_signed':
        this.playTone(context, destination, { type: 'triangle', frequency: 880, gain: 0.07, duration: 0.08 });
        this.playTone(context, destination, { type: 'triangle', frequency: 1108, gain: 0.06, duration: 0.1, startOffset: 0.08 });
        this.playTone(context, destination, { type: 'sine', frequency: 660, gain: 0.05, duration: 0.2, startOffset: 0.16 });
        break;
      case 'extension_signed':
        this.playNoiseBurst(context, destination, { gain: 0.025, duration: 0.08, filterType: 'highpass', frequency: 1800 });
        this.playTone(context, destination, { type: 'sine', frequency: 494, gain: 0.05, duration: 0.18, startOffset: 0.06 });
        break;
      case 'injury_alert':
        this.playTone(context, destination, { type: 'sawtooth', frequency: 190, gain: 0.05, duration: 0.22 });
        break;
      case 'prospect_callup':
        this.playTone(context, destination, { type: 'triangle', frequency: 392, gain: 0.06, duration: 0.12 });
        this.playTone(context, destination, { type: 'triangle', frequency: 494, gain: 0.06, duration: 0.12, startOffset: 0.08 });
        this.playTone(context, destination, { type: 'triangle', frequency: 659, gain: 0.07, duration: 0.2, startOffset: 0.16 });
        break;
      case 'home_run':
        this.playNoiseBurst(context, destination, { gain: 0.06, duration: 0.05, filterType: 'highpass', frequency: 1900 });
        this.playNoiseBurst(context, destination, { gain: 0.05, duration: 0.45, filterType: 'bandpass', frequency: 980, startOffset: 0.04 });
        break;
      case 'strikeout':
        this.playNoiseBurst(context, destination, { gain: 0.04, duration: 0.15, filterType: 'highpass', frequency: 1500 });
        this.playTone(context, destination, { type: 'sine', frequency: 140, gain: 0.04, duration: 0.18, startOffset: 0.1 });
        break;
      case 'win':
        this.playNoiseBurst(context, destination, { gain: 0.045, duration: 0.4, filterType: 'bandpass', frequency: 1040 });
        break;
      case 'loss':
        this.playTone(context, destination, { type: 'sine', frequency: 320, gain: 0.045, duration: 0.24, frequencyEnd: 180 });
        break;
      case 'walk_off':
        this.playNoiseBurst(context, destination, { gain: 0.065, duration: 1.1, filterType: 'bandpass', frequency: 1200 });
        this.playTone(context, destination, { type: 'triangle', frequency: 523, gain: 0.05, duration: 0.5, startOffset: 0.06 });
        break;
      case 'playoff_clinch':
        this.playTone(context, destination, { type: 'sawtooth', frequency: 349, gain: 0.065, duration: 0.25 });
        this.playTone(context, destination, { type: 'sawtooth', frequency: 440, gain: 0.06, duration: 0.25, startOffset: 0.08 });
        this.playTone(context, destination, { type: 'sawtooth', frequency: 523, gain: 0.07, duration: 0.35, startOffset: 0.16 });
        this.playNoiseBurst(context, destination, { gain: 0.04, duration: 0.8, filterType: 'bandpass', frequency: 1120 });
        break;
      case 'world_series_win':
        this.playNoiseBurst(context, destination, { gain: 0.075, duration: 2.6, filterType: 'bandpass', frequency: 1200 });
        this.playTone(context, destination, { type: 'sawtooth', frequency: 392, gain: 0.07, duration: 0.4 });
        this.playTone(context, destination, { type: 'sawtooth', frequency: 523, gain: 0.07, duration: 0.5, startOffset: 0.18 });
        this.playTone(context, destination, { type: 'triangle', frequency: 659, gain: 0.06, duration: 0.8, startOffset: 0.36 });
        break;
      case 'achievement_unlock':
        this.playTone(context, destination, { type: 'triangle', frequency: 784, gain: 0.06, duration: 0.14 });
        this.playTone(context, destination, { type: 'triangle', frequency: 988, gain: 0.06, duration: 0.2, startOffset: 0.08 });
        break;
    }
  }

  private playTone(
    context: AudioContext,
    destination: AudioNode,
    options: {
      type: OscillatorType;
      frequency: number;
      gain: number;
      duration: number;
      startOffset?: number;
      frequencyEnd?: number;
      detune?: number;
    },
  ) {
    const startAt = context.currentTime + (options.startOffset ?? 0);
    const stopAt = startAt + options.duration;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.frequency, startAt);
    if (options.frequencyEnd != null) {
      oscillator.frequency.linearRampToValueAtTime(options.frequencyEnd, stopAt);
    }
    if (options.detune != null) {
      oscillator.detune.setValueAtTime(options.detune, startAt);
    }

    gainNode.gain.setValueAtTime(MIN_GAIN, startAt);
    gainNode.gain.linearRampToValueAtTime(options.gain, startAt + Math.min(0.02, options.duration / 3));
    gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, stopAt);
    oscillator.connect(gainNode);
    gainNode.connect(destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt + 0.02);
  }

  private playNoiseBurst(
    context: AudioContext,
    destination: AudioNode,
    options: {
      gain: number;
      duration: number;
      filterType: BiquadFilterType;
      frequency: number;
      startOffset?: number;
    },
  ) {
    const startAt = context.currentTime + (options.startOffset ?? 0);
    const stopAt = startAt + options.duration;
    const source = context.createBufferSource();
    source.buffer = this.getNoiseBuffer(context);
    const filter = context.createBiquadFilter();
    filter.type = options.filterType;
    filter.frequency.setValueAtTime(options.frequency, startAt);
    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(MIN_GAIN, startAt);
    gainNode.gain.linearRampToValueAtTime(options.gain, startAt + Math.min(0.03, options.duration / 3));
    gainNode.gain.exponentialRampToValueAtTime(MIN_GAIN, stopAt);
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);
    source.start(startAt);
    source.stop(stopAt + 0.02);
  }

  private createContinuousTone(
    context: AudioContext,
    destination: AudioNode,
    options: {
      type: OscillatorType;
      frequency: number;
      gain: number;
    },
  ): AudioHandle {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.frequency, context.currentTime);
    gainNode.gain.setValueAtTime(options.gain, context.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(destination);
    oscillator.start(context.currentTime);

    return {
      stop: () => {
        safeStop(oscillator, context.currentTime + 0.02);
        safeDisconnect(oscillator);
        safeDisconnect(gainNode);
      },
    };
  }

  private createLoopingNoise(
    context: AudioContext,
    destination: AudioNode,
    options: {
      gain: number;
      filterType: BiquadFilterType;
      frequency: number;
    },
  ): AudioHandle {
    const source = context.createBufferSource();
    source.buffer = this.getNoiseBuffer(context);
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = options.filterType;
    filter.frequency.setValueAtTime(options.frequency, context.currentTime);
    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(options.gain, context.currentTime);
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(destination);
    source.start(context.currentTime);

    return {
      stop: () => {
        safeStop(source, context.currentTime + 0.02);
        safeDisconnect(source);
        safeDisconnect(filter);
        safeDisconnect(gainNode);
      },
    };
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    const cacheKey = `${context.sampleRate}:${NOISE_DURATION_SECONDS}`;
    const existing = this.noiseBufferCache.get(cacheKey);
    if (existing) {
      return existing;
    }

    const sampleCount = Math.max(1, Math.floor(context.sampleRate * NOISE_DURATION_SECONDS));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      const shaped = Math.sin(index * 12.9898 + 78.233) * 43_758.5453;
      channel[index] = (((shaped - Math.floor(shaped)) * 2) - 1) * DEFAULT_GAIN;
    }

    this.noiseBufferCache.set(cacheKey, buffer);
    return buffer;
  }
}

let sharedAudioEngine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!sharedAudioEngine) {
    sharedAudioEngine = new AudioEngine();
  }

  return sharedAudioEngine;
}

export function resetAudioEngineForTest() {
  sharedAudioEngine?.dispose();
  sharedAudioEngine = null;
}
