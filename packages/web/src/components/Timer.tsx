import { useState, useEffect, useMemo } from 'react';
import { ListVideo, X } from 'lucide-react';
import { useTimer, type TimerMode } from '../hooks/useTimer';
import { CircularProgress } from './CircularProgress';
import { Controls } from './Controls';
import { ModeIndicator } from './ModeIndicator';
import { SettingsModal } from './settings/SettingsModal';
import { ProgramBuilderModal } from './program/ProgramBuilderModal';
import { formatTime, requestNotificationPermission } from '../utils/notifications';
import { getDaemonUrl } from '../utils/daemon';
import { useSettings } from '../hooks/useSettings';

// CSS変数を使用してテーマ対応のモード色を取得
const modeColorVars: Record<TimerMode, string> = {
  work: 'var(--work-primary)',
  shortBreak: 'var(--short-break-primary)',
  longBreak: 'var(--long-break-primary)',
};

export function Timer() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProgramBuilderOpen, setIsProgramBuilderOpen] = useState(false);
  const { settings } = useSettings();

  // デーモンURLを取得（URLパラメータから）
  const daemonUrl = useMemo(() => getDaemonUrl(), []);

  const timer = useTimer();

  // 初回レンダリング時に通知許可をリクエスト
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // タブタイトルに残り時間を表示
  useEffect(() => {
    const modeLabel = timer.mode === 'work' ? '作業' : '休憩';
    document.title = `${formatTime(timer.timeLeft)} - ${modeLabel} | Pomodoro`;
  }, [timer.timeLeft, timer.mode]);

  const currentColor = modeColorVars[timer.mode];

  return (
    <div className="flex flex-col items-center">
      {/* デーモン接続インジケーター */}
      {daemonUrl && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              timer.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
            }`}
          />
          <span className="text-white/50">
            {timer.connected ? 'デーモン接続中' : timer.error || '接続中...'}
          </span>
        </div>
      )}

      {/* プログラム情報 */}
      {timer.program && (
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-white/60 mb-1">
            <span>{timer.program.name}</span>
            {timer.stopProgram && (
              <button
                onClick={timer.stopProgram}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="プログラムを終了"
                title="プログラムを終了"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${currentColor} 20%, transparent)`,
                color: currentColor,
              }}
            >
              {timer.program.currentSessionLabel ?? `セッション ${timer.program.currentSessionIndex + 1}`}
            </span>
            <span className="text-xs text-white/40">
              {timer.program.currentSessionIndex + 1} / {timer.program.totalSessions}
            </span>
          </div>
        </div>
      )}

      <ModeIndicator
        mode={timer.mode}
        sessionCount={timer.sessionCount}
        totalSessions={settings.timer.sessionsBeforeLongBreak}
      />

      <CircularProgress
        progress={timer.progress}
        color={currentColor}
        size={280}
        strokeWidth={8}
      >
        <div className="text-center">
          <div
            className={`text-6xl font-extralight tracking-tight tabular-nums ${
              timer.isRunning ? '' : 'animate-pulse-slow'
            }`}
            style={{ color: currentColor }}
          >
            {formatTime(timer.timeLeft)}
          </div>
        </div>
      </CircularProgress>

      <Controls
        isRunning={timer.isRunning}
        onStart={timer.start}
        onPause={timer.pause}
        onReset={timer.reset}
        onSkip={timer.skipToNext}
        onSettingsClick={() => setIsSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* プログラムボタン（デーモンモードで未プログラム時のみ表示） */}
      {daemonUrl && timer.connected && !timer.program && timer.startProgram && (
        <button
          onClick={() => setIsProgramBuilderOpen(true)}
          className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full transition-colors"
          style={{
            backgroundColor: 'var(--surface-bg)',
            color: 'var(--text-secondary)',
          }}
        >
          <ListVideo size={18} />
          <span className="text-sm">プログラムを作成</span>
        </button>
      )}

      {/* プログラムビルダーモーダル */}
      {timer.startProgram && (
        <ProgramBuilderModal
          isOpen={isProgramBuilderOpen}
          onClose={() => setIsProgramBuilderOpen(false)}
          onStartProgram={timer.startProgram}
        />
      )}
    </div>
  );
}
