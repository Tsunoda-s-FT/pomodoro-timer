// 時間認識（Time Awareness）設定

export interface TimeAwarenessSettings {
  // グラデーション背景の時間連動変化
  dynamicBackground: {
    enabled: boolean;
    intensity: 'subtle' | 'medium' | 'strong';
  };

  // 中間リマインダー
  reminders: {
    enabled: boolean;
    at50Percent: boolean;
    at5Minutes: boolean;
    at1Minute: boolean;
    soundEnabled: boolean;
    visualEnabled: boolean;
  };

  // 音声アナウンス
  speechAnnouncement: {
    enabled: boolean;
    voice: string;
    rate: number;
    volume: number;
  };

  // 緊急度エフェクト
  urgencyEffects: {
    enabled: boolean;
    thresholdMinutes: number;
  };
}

// デフォルト設定
export const DEFAULT_TIME_AWARENESS_SETTINGS: TimeAwarenessSettings = {
  dynamicBackground: {
    enabled: true,
    intensity: 'medium',
  },
  reminders: {
    enabled: true,
    at50Percent: true,
    at5Minutes: true,
    at1Minute: true,
    soundEnabled: true,
    visualEnabled: true,
  },
  speechAnnouncement: {
    enabled: false,
    voice: '',
    rate: 1.0,
    volume: 0.8,
  },
  urgencyEffects: {
    enabled: true,
    thresholdMinutes: 5,
  },
};

// リマインダー種別
export type ReminderType =
  | 'percent_50'
  | 'minutes_5'
  | 'minutes_1';

// リマインダーイベント
export interface ReminderEvent {
  type: ReminderType;
  timeLeft: number;
  totalTime: number;
  message: string;
}

// 緊急度レベル（0-1）
export type UrgencyLevel = number;

// 背景グラデーション設定
export interface GradientConfig {
  from: string;
  via: string;
  to: string;
}
