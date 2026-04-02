import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from './audio';

class FakeAudioParam {
  value = 0;

  setValueAtTime(value: number) {
    this.value = value;
  }

  linearRampToValueAtTime(value: number) {
    this.value = value;
  }

  exponentialRampToValueAtTime(value: number) {
    this.value = value;
  }

  cancelScheduledValues() {}
}

class FakeAudioNode {
  connections: unknown[] = [];

  connect(node: unknown) {
    this.connections.push(node);
    return node;
  }

  disconnect() {
    this.connections = [];
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeOscillatorNode extends FakeAudioNode {
  type = 'sine';
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  started: number[] = [];
  stopped: number[] = [];

  start(time = 0) {
    this.started.push(time);
  }

  stop(time = 0) {
    this.stopped.push(time);
  }
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type = 'lowpass';
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}

class FakeAudioBuffer {
  private readonly channels: Float32Array[];

  constructor(channelCount: number, length: number) {
    this.channels = Array.from({ length: channelCount }, () => new Float32Array(length));
  }

  getChannelData(index: number) {
    return this.channels[index]!;
  }
}

class FakeAudioBufferSourceNode extends FakeAudioNode {
  buffer: FakeAudioBuffer | null = null;
  loop = false;
  playbackRate = new FakeAudioParam();
  started: number[] = [];
  stopped: number[] = [];

  start(time = 0) {
    this.started.push(time);
  }

  stop(time = 0) {
    this.stopped.push(time);
  }
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44_100;
  destination = new FakeAudioNode();
  state = 'running';
  resume = vi.fn(async () => undefined);
  gains: FakeGainNode[] = [];
  oscillators: FakeOscillatorNode[] = [];
  filters: FakeBiquadFilterNode[] = [];
  bufferSources: FakeAudioBufferSourceNode[] = [];

  createGain() {
    const node = new FakeGainNode();
    this.gains.push(node);
    return node;
  }

  createOscillator() {
    const node = new FakeOscillatorNode();
    this.oscillators.push(node);
    return node;
  }

  createBiquadFilter() {
    const node = new FakeBiquadFilterNode();
    this.filters.push(node);
    return node;
  }

  createBuffer(channelCount: number, length: number) {
    return new FakeAudioBuffer(channelCount, length);
  }

  createBufferSource() {
    const node = new FakeAudioBufferSourceNode();
    this.bufferSources.push(node);
    return node;
  }
}

function createEngine(context: FakeAudioContext, reducedMotion = false) {
  return new AudioEngine({
    createContext: () => context as unknown as AudioContext,
    prefersReducedMotion: () => reducedMotion,
  });
}

function totalStopCount(context: FakeAudioContext): number {
  return context.oscillators.reduce((sum, node) => sum + node.stopped.length, 0)
    + context.bufferSources.reduce((sum, node) => sum + node.stopped.length, 0);
}

describe('AudioEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts muted with no active ambient layer', () => {
    const engine = createEngine(new FakeAudioContext());

    expect(engine.isMuted()).toBe(true);
    expect(engine.getAmbientMode()).toBeNull();
    expect(engine.hasContext()).toBe(false);
    expect(engine.hasActiveAmbient()).toBe(false);
  });

  it('clamps master volume updates into the 0-1 range', () => {
    const engine = createEngine(new FakeAudioContext());

    engine.setVolume(2.5);
    expect(engine.getVolume()).toBe(1);

    engine.setVolume(-1);
    expect(engine.getVolume()).toBe(0);
  });

  it('does not create an audio context when effects fire while muted', () => {
    const context = new FakeAudioContext();
    const engine = createEngine(context);

    expect(() => engine.playEffect('button_click')).not.toThrow();
    expect(engine.hasContext()).toBe(false);
    expect(context.oscillators).toHaveLength(0);
    expect(context.bufferSources).toHaveLength(0);
  });

  it('stores an ambient mode without starting it while muted', () => {
    const context = new FakeAudioContext();
    const engine = createEngine(context);

    engine.setAmbient('office');

    expect(engine.getAmbientMode()).toBe('office');
    expect(engine.hasContext()).toBe(false);
    expect(engine.hasActiveAmbient()).toBe(false);
  });

  it('starts the requested ambient bed after unmuting', () => {
    const context = new FakeAudioContext();
    const engine = createEngine(context);

    engine.setAmbient('office');
    engine.setMuted(false);

    expect(engine.hasContext()).toBe(true);
    expect(engine.hasActiveAmbient()).toBe(true);
    expect(context.oscillators.length + context.bufferSources.length).toBeGreaterThan(0);
  });

  it('switches ambient beds by tearing down the previous layer', () => {
    const context = new FakeAudioContext();
    const engine = createEngine(context);
    engine.setMuted(false);

    engine.setAmbient('office');
    const stopsBeforeSwitch = totalStopCount(context);

    engine.setAmbient('ballpark');

    expect(engine.getAmbientMode()).toBe('ballpark');
    expect(engine.hasActiveAmbient()).toBe(true);
    expect(totalStopCount(context)).toBeGreaterThan(stopsBeforeSwitch);
  });

  it('stops ambient playback when muting an active engine', () => {
    const context = new FakeAudioContext();
    const engine = createEngine(context);
    engine.setMuted(false);
    engine.setAmbient('press-room');

    const stopsBeforeMute = totalStopCount(context);
    engine.setMuted(true);

    expect(engine.isMuted()).toBe(true);
    expect(engine.hasActiveAmbient()).toBe(false);
    expect(totalStopCount(context)).toBeGreaterThan(stopsBeforeMute);
  });

  it('suppresses ambient beds when reduced motion is requested', () => {
    const context = new FakeAudioContext();
    const engine = createEngine(context, true);
    engine.setMuted(false);

    engine.setAmbient('draft-room');

    expect(engine.getAmbientMode()).toBe('draft-room');
    expect(engine.hasContext()).toBe(false);
    expect(engine.hasActiveAmbient()).toBe(false);
  });
});
