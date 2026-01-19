import type { SoundType } from '../types/settings';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playBell(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;
  const baseFreq = 440; // A4 - ベルの基音

  // ベルの倍音構造（非調和倍音でリアルなベル音を再現）
  const partials = [
    { ratio: 1.0, amplitude: 1.0, decay: 2.0 },    // 基音
    { ratio: 2.0, amplitude: 0.6, decay: 1.5 },    // 2倍音
    { ratio: 2.4, amplitude: 0.4, decay: 1.2 },    // 非調和（金属感）
    { ratio: 3.0, amplitude: 0.3, decay: 1.0 },    // 3倍音
    { ratio: 4.2, amplitude: 0.2, decay: 0.8 },    // 非調和
    { ratio: 5.4, amplitude: 0.15, decay: 0.6 },   // 非調和
  ];

  partials.forEach((partial) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * partial.ratio, now);

    // 鋭いアタックと長い減衰（ベル特有のエンベロープ）
    gain.gain.setValueAtTime(volume * 0.25 * partial.amplitude, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + partial.decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + partial.decay);
  });

  // 高周波のアタック（打撃音）
  const attackOsc = ctx.createOscillator();
  const attackGain = ctx.createGain();
  attackOsc.type = 'triangle';
  attackOsc.frequency.setValueAtTime(2000, now);
  attackGain.gain.setValueAtTime(volume * 0.15, now);
  attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  attackOsc.connect(attackGain);
  attackGain.connect(ctx.destination);
  attackOsc.start(now);
  attackOsc.stop(now + 0.05);
}

function playChime(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;
  const frequencies = [523, 659, 784, 1047];

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);

    const startTime = now + i * 0.15;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.8);
  });
}

function playDigital(ctx: AudioContext, volume: number): void {
  const now = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1000, now);

    const startTime = now + i * 0.2;
    gainNode.gain.setValueAtTime(volume * 0.2, startTime);
    gainNode.gain.setValueAtTime(0, startTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.1);
  }
}

export function playSound(type: SoundType, volume: number): void {
  try {
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    switch (type) {
      case 'bell':
        playBell(ctx, volume);
        break;
      case 'chime':
        playChime(ctx, volume);
        break;
      case 'digital':
        playDigital(ctx, volume);
        break;
    }
  } catch {
    // サウンド再生に失敗した場合は無視
  }
}

export function initAudio(): void {
  try {
    getAudioContext();
  } catch {
    // AudioContext の初期化に失敗した場合は無視
  }
}
