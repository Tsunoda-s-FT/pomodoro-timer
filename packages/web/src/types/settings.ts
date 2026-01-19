import type { TimeAwarenessSettings } from './timeAwareness';
import type { AppearanceSettings } from './appearance';

export interface TimerSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStart: boolean;
}

export interface SoundSettings {
  enabled: boolean;
  volume: number;
  soundType: SoundType;
}

export type SoundType = 'bell' | 'chime' | 'digital' | 'none';

export interface AppSettings {
  timer: TimerSettings;
  sound: SoundSettings;
  timeAwareness: TimeAwarenessSettings;
  appearance: AppearanceSettings;
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStart: true,
};

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.7,
  soundType: 'bell',
};
