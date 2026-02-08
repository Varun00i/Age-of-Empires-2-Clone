// ============================================================
// Empires Risen - Audio Manager
// Sound effects, music, and WebAudio API management
// ============================================================

import { Game } from '../engine/Game';

interface SoundEffect {
  buffer: AudioBuffer | null;
  volume: number;
}

export class AudioManager {
  private game: Game;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private sounds: Map<string, SoundEffect> = new Map();
  private currentMusic: AudioBufferSourceNode | null = null;
  private enabled: boolean = true;
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.6;
  private ambientSource: AudioBufferSourceNode | null = null;
  private musicPlaying: boolean = false;

  constructor(game: Game) {
    this.game = game;
  }

  async init(): Promise<void> {
    try {
      this.audioCtx = new AudioContext();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);

      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.audioCtx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      // Generate procedural sounds
      this.generateSounds();

      // Resume on user interaction
      document.addEventListener('click', () => {
        if (this.audioCtx?.state === 'suspended') {
          this.audioCtx.resume();
        }
      }, { once: true });
    } catch {
      console.warn('WebAudio not available');
    }
  }

  private generateSounds(): void {
    if (!this.audioCtx) return;

    // Generate basic sound effects procedurally
    this.sounds.set('click', { buffer: this.generateClick(), volume: 0.5 });
    this.sounds.set('select', { buffer: this.generateTone(440, 0.1), volume: 0.3 });
    this.sounds.set('move', { buffer: this.generateTone(330, 0.05), volume: 0.2 });
    this.sounds.set('attack', { buffer: this.generateNoise(0.15), volume: 0.4 });
    this.sounds.set('build', { buffer: this.generateTone(220, 0.2), volume: 0.3 });
    this.sounds.set('chop', { buffer: this.generateNoise(0.08), volume: 0.25 });
    this.sounds.set('mine', { buffer: this.generateImpact(), volume: 0.3 });
    this.sounds.set('death', { buffer: this.generateTone(180, 0.3), volume: 0.4 });
    this.sounds.set('research', { buffer: this.generateChime(), volume: 0.5 });
    this.sounds.set('ageUp', { buffer: this.generateFanfare(), volume: 0.6 });
    this.sounds.set('warning', { buffer: this.generateWarning(), volume: 0.5 });
    this.sounds.set('horn', { buffer: this.generateHorn(), volume: 0.5 });
    this.sounds.set('chat', { buffer: this.generateTone(600, 0.05), volume: 0.3 });
  }

  play(soundName: string, volume?: number): void {
    if (!this.enabled || !this.audioCtx || !this.sfxGain) return;

    const sound = this.sounds.get(soundName);
    if (!sound?.buffer) return;

    const source = this.audioCtx.createBufferSource();
    source.buffer = sound.buffer;

    const gain = this.audioCtx.createGain();
    gain.gain.value = (volume ?? sound.volume);
    source.connect(gain);
    gain.connect(this.sfxGain);

    source.start();
  }

  playPositional(soundName: string, worldX: number, worldY: number): void {
    // Calculate volume based on camera distance
    const cam = this.game.renderer.camera;
    const dist = Math.hypot(worldX * 32 - cam.x, worldY * 16 - cam.y);
    const maxDist = 1000;
    const volume = Math.max(0, 1 - dist / maxDist);

    if (volume > 0.05) {
      this.play(soundName, volume);
    }
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = volume;
    if (this.musicGain) this.musicGain.gain.value = volume;
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = volume;
    if (this.sfxGain) this.sfxGain.gain.value = volume;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 1 : 0;
    }
  }

  // ---- Procedural Sound Generation ----

  private generateTone(freq: number, duration: number): AudioBuffer {
    const ctx = this.audioCtx!;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 10);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
    }

    return buffer;
  }

  private generateClick(): AudioBuffer {
    const ctx = this.audioCtx!;
    const length = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 100);
    }

    return buffer;
  }

  private generateNoise(duration: number): AudioBuffer {
    const ctx = this.audioCtx!;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20);
    }

    return buffer;
  }

  private generateImpact(): AudioBuffer {
    const ctx = this.audioCtx!;
    const length = Math.floor(ctx.sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      const freq = 150 * Math.exp(-t * 5);
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 15) +
        (Math.random() * 2 - 1) * 0.2 * Math.exp(-t * 30);
    }

    return buffer;
  }

  private generateChime(): AudioBuffer {
    const ctx = this.audioCtx!;
    const length = Math.floor(ctx.sampleRate * 0.8);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    const freqs = [523, 659, 784]; // C5, E5, G5
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      let sample = 0;
      for (const f of freqs) {
        sample += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 3);
      }
      data[i] = sample / freqs.length;
    }

    return buffer;
  }

  private generateFanfare(): AudioBuffer {
    const ctx = this.audioCtx!;
    const length = Math.floor(ctx.sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    const notes = [
      { freq: 392, start: 0, dur: 0.2 },    // G4
      { freq: 523, start: 0.2, dur: 0.2 },   // C5
      { freq: 659, start: 0.4, dur: 0.2 },   // E5
      { freq: 784, start: 0.6, dur: 0.8 },   // G5
    ];

    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      let sample = 0;
      for (const note of notes) {
        if (t >= note.start && t < note.start + note.dur) {
          const nt = t - note.start;
          const env = Math.exp(-nt * 3) * Math.min(1, nt * 50);
          sample += Math.sin(2 * Math.PI * note.freq * nt) * env;
        }
      }
      data[i] = sample * 0.5;
    }

    return buffer;
  }

  private generateWarning(): AudioBuffer {
    const ctx = this.audioCtx!;
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      const freq = 600 + Math.sin(t * 20) * 200;
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 4);
    }

    return buffer;
  }

  private generateHorn(): AudioBuffer {
    const ctx = this.audioCtx!;
    const length = Math.floor(ctx.sampleRate * 1.0);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      const freq = 220;
      const env = Math.min(1, t * 10) * Math.exp(-Math.max(0, t - 0.5) * 3);
      data[i] = (Math.sin(2 * Math.PI * freq * t) * 0.6 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.3 +
        Math.sin(2 * Math.PI * freq * 3 * t) * 0.1) * env;
    }

    return buffer;
  }

  // ---- Background Music ----

  startBackgroundMusic(): void {
    if (!this.audioCtx || !this.musicGain || this.musicPlaying) return;
    this.musicPlaying = true;
    this.playNextMusicSegment();
  }

  private playNextMusicSegment(): void {
    if (!this.audioCtx || !this.musicGain || !this.musicPlaying) return;

    const buffer = this.generateMusicSegment();
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.musicGain);
    source.start();
    this.currentMusic = source;

    source.onended = () => {
      if (this.musicPlaying) {
        setTimeout(() => this.playNextMusicSegment(), 1000);
      }
    };
  }

  private generateMusicSegment(): AudioBuffer {
    const ctx = this.audioCtx!;
    const duration = 8;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Medieval-sounding ambient music with pentatonic scale
    const baseFreq = 130.81; // C3
    const scale = [1, 1.125, 1.25, 1.5, 1.667]; // Pentatonic ratios
    const melody = Array.from({ length: 16 }, () =>
      baseFreq * scale[Math.floor(Math.random() * scale.length)] * (Math.random() > 0.3 ? 1 : 2)
    );

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noteIndex = Math.floor(t / (duration / melody.length));
      const noteT = (t % (duration / melody.length)) / (duration / melody.length);
      const freq = melody[noteIndex % melody.length];

      // Plucked string / harp sound
      const envelope = Math.exp(-noteT * 6) * Math.min(1, noteT * 100);

      // Rich harmonics
      let sample = Math.sin(2 * Math.PI * freq * t) * 0.4 * envelope;
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.15 * envelope;
      sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.05 * envelope;

      // Drone bass note
      const drone = Math.sin(2 * Math.PI * baseFreq * 0.5 * t) * 0.08;

      // Slight stereo variation
      left[i] = (sample + drone) * 0.5;
      right[i] = (sample * 0.95 + drone) * 0.5;
    }

    return buffer;
  }

  stopBackgroundMusic(): void {
    this.musicPlaying = false;
    if (this.currentMusic) {
      try { this.currentMusic.stop(); } catch {}
      this.currentMusic = null;
    }
  }

  // ---- Ambient Sounds ----

  startAmbientSounds(): void {
    if (!this.audioCtx || !this.musicGain) return;

    const buffer = this.generateAmbientLoop();
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = this.audioCtx.createGain();
    gain.gain.value = 0.1;
    source.connect(gain);
    gain.connect(this.musicGain);
    source.start();
    this.ambientSource = source;
  }

  private generateAmbientLoop(): AudioBuffer {
    const ctx = this.audioCtx!;
    const duration = 4;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      // Wind
      const wind = (Math.random() * 2 - 1) * 0.02 * (0.5 + 0.5 * Math.sin(t * 0.3));
      // Birds (occasional chirps)
      let bird = 0;
      if (Math.sin(t * 2.7 + 42) > 0.98) {
        const birdT = (t * 2.7 + 42) % 1;
        bird = Math.sin(2 * Math.PI * (2000 + Math.sin(birdT * 30) * 500) * birdT) * Math.exp(-birdT * 15) * 0.03;
      }
      left[i] = wind + bird;
      right[i] = wind * 0.8 + bird * 0.6;
    }

    return buffer;
  }

  dispose(): void {
    this.stopBackgroundMusic();
    if (this.ambientSource) {
      try { this.ambientSource.stop(); } catch {}
    }
    this.currentMusic?.stop();
    this.audioCtx?.close();
    this.sounds.clear();
  }
}
