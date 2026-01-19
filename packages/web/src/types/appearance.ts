/** テーマモード */
export type ThemeMode = 'light' | 'dark' | 'system' | 'scheduled';

/** 解決されたカラースキーム */
export type ColorScheme = 'light' | 'dark';

/** 時間帯スケジュール */
export interface ThemeSchedule {
  /** ライトモード開始時刻 (0-23) */
  lightModeStart: number;
  /** ダークモード開始時刻 (0-23) */
  darkModeStart: number;
}

/** 外観設定 */
export interface AppearanceSettings {
  /** テーマモード */
  themeMode: ThemeMode;
  /** 時間帯スケジュール（scheduledモード時に使用） */
  schedule: ThemeSchedule;
}

/** デフォルトの外観設定 */
export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  themeMode: 'system',
  schedule: {
    lightModeStart: 7,
    darkModeStart: 19,
  },
};

/** モード別カラー設定（テーマ対応） */
export interface ThemeModeColors {
  dark: {
    primary: string;
    secondary: string;
    hue: number;
  };
  light: {
    primary: string;
    secondary: string;
    hue: number;
  };
}

/** 各タイマーモードのカラー定義 */
export const MODE_COLOR_CONFIG = {
  work: {
    hue: 0,
    dark: {
      primary: 'hsl(0, 86%, 65%)',     // #ff6b6b
      secondary: 'hsl(0, 72%, 51%)',
    },
    light: {
      primary: 'hsl(0, 65%, 55%)',     // 彩度を抑えた赤
      secondary: 'hsl(0, 60%, 50%)',
    },
  },
  shortBreak: {
    hue: 140,
    dark: {
      primary: 'hsl(140, 70%, 55%)',   // #51cf66
      secondary: 'hsl(140, 65%, 48%)',
    },
    light: {
      primary: 'hsl(140, 50%, 42%)',   // 彩度を抑えた緑
      secondary: 'hsl(140, 48%, 38%)',
    },
  },
  longBreak: {
    hue: 210,
    dark: {
      primary: 'hsl(210, 85%, 60%)',   // #339af0
      secondary: 'hsl(210, 80%, 52%)',
    },
    light: {
      primary: 'hsl(210, 60%, 48%)',   // 彩度を抑えた青
      secondary: 'hsl(210, 55%, 44%)',
    },
  },
} as const;
