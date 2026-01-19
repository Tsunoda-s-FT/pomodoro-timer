import type { ProgramSession } from '@pomodoro/protocol';

export interface ProgramPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  sessions: ProgramSession[];
  repeat: boolean;
}

// ビルトインプリセットは廃止（すべてカスタムプリセットで管理）
export const PROGRAM_PRESETS: ProgramPreset[] = [];

// セッションの合計時間を計算（分単位）
export function calculateTotalMinutes(sessions: ProgramSession[]): number {
  return sessions.reduce((total, session) => {
    return total + session.workMinutes + session.breakMinutes;
  }, 0);
}

// 時間をフォーマット（例: "1時間25分"）
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${mins}分`;
}
