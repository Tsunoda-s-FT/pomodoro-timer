import type { TimerMode } from '@pomodoro/protocol';
import type { GradientConfig, UrgencyLevel } from '../types/timeAwareness';
import type { ColorScheme } from '../types/appearance';

// モードごとの基本色相（テーマ別）
const MODE_HUES: Record<ColorScheme, Record<TimerMode, number>> = {
  dark: {
    work: 0,         // 赤
    shortBreak: 140, // 緑
    longBreak: 210,  // 青
  },
  light: {
    // ライトモード: よりウォームで目に優しい色相
    work: 25,        // テラコッタ/オレンジ寄り
    shortBreak: 80,  // セージグリーン/オリーブ寄り
    longBreak: 45,   // アンバー/サンド
  },
};

// 強度による変化量の倍率
const INTENSITY_MULTIPLIER = {
  subtle: 0.3,
  medium: 0.6,
  strong: 1.0,
} as const;

// テーマ別の色設定
interface ThemeColorConfig {
  baseSaturation: number;
  baseLightness: number;
  urgencySaturationRange: number;
  urgencyLightnessRange: number;
}

const THEME_CONFIG: Record<ColorScheme, ThemeColorConfig> = {
  dark: {
    baseSaturation: 10,
    baseLightness: 12,
    urgencySaturationRange: 40,
    urgencyLightnessRange: 8,
  },
  light: {
    // ウォームベージュ調 - コントラストを確保しつつ目に優しく
    baseSaturation: 18,
    baseLightness: 83,
    urgencySaturationRange: 12,
    urgencyLightnessRange: -2,
  },
};

/**
 * 緊急度に応じた背景グラデーションを生成
 * @param mode タイマーモード
 * @param urgency 緊急度 (0-1)
 * @param intensity 強度設定
 * @param colorScheme カラースキーム (dark/light)
 */
export function generateUrgencyGradient(
  mode: TimerMode,
  urgency: UrgencyLevel,
  intensity: 'subtle' | 'medium' | 'strong',
  colorScheme: ColorScheme = 'dark'
): GradientConfig {
  const baseHue = MODE_HUES[colorScheme][mode];
  const multiplier = INTENSITY_MULTIPLIER[intensity];
  const config = THEME_CONFIG[colorScheme];

  // 緊急度に応じて彩度と明度を変化
  const saturation = config.baseSaturation + urgency * config.urgencySaturationRange * multiplier;
  const lightness = config.baseLightness + urgency * config.urgencyLightnessRange * multiplier;

  // グラデーションの各ポイント（微妙な変化で深みを出す）
  const lightnessDelta = colorScheme === 'dark' ? 2 : 1;
  const from = `hsl(${baseHue}, ${saturation}%, ${lightness - lightnessDelta}%)`;
  const via = `hsl(${baseHue}, ${saturation * 0.85}%, ${lightness}%)`;
  const to = `hsl(${baseHue}, ${saturation}%, ${lightness - lightnessDelta}%)`;

  return { from, via, to };
}

/**
 * グラデーション設定をCSS文字列に変換
 */
export function gradientToCSS(gradient: GradientConfig): string {
  return `linear-gradient(to bottom right, ${gradient.from}, ${gradient.via}, ${gradient.to})`;
}

/**
 * デフォルトの背景グラデーション（テーマ対応）
 */
export const DEFAULT_BACKGROUND: Record<ColorScheme, string> = {
  dark: 'linear-gradient(to bottom right, hsl(222, 47%, 11%), hsl(217, 33%, 17%), hsl(222, 47%, 11%))',
  // ライトモード: ウォームベージュ調（コントラスト確保）
  light: 'linear-gradient(to bottom right, hsl(45, 20%, 84%), hsl(50, 18%, 86%), hsl(45, 20%, 84%))',
};

/**
 * 緊急度を計算（0-1）
 * @param timeLeft 残り時間（秒）
 * @param totalTime 総時間（秒）
 * @param thresholdMinutes 緊急度が上がり始める閾値（分）
 */
export function calculateUrgency(
  timeLeft: number,
  totalTime: number,
  thresholdMinutes: number
): UrgencyLevel {
  if (totalTime === 0) return 0;

  const progress = 1 - timeLeft / totalTime;
  const thresholdSeconds = thresholdMinutes * 60;

  // 閾値以下になったら緊急度を急上昇
  if (timeLeft <= thresholdSeconds) {
    return Math.min(1, 0.3 + (1 - timeLeft / thresholdSeconds) * 0.7);
  }

  // 通常時は進捗に応じて緩やかに上昇（最大0.3）
  return progress * 0.3;
}
