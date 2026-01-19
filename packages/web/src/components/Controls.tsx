import { Play, Pause, RotateCcw, SkipForward, Settings } from 'lucide-react';

interface ControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onSettingsClick: () => void;
}

export function Controls({
  isRunning,
  onStart,
  onPause,
  onReset,
  onSkip,
  onSettingsClick,
}: ControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      {/* リセットボタン */}
      <button
        onClick={onReset}
        className="p-3 rounded-full transition-all duration-200"
        style={{
          backgroundColor: 'var(--surface-bg)',
          color: 'var(--text-secondary)',
        }}
        aria-label="リセット"
      >
        <RotateCcw size={24} />
      </button>

      {/* 開始/一時停止ボタン */}
      <button
        onClick={isRunning ? onPause : onStart}
        className="p-5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          backgroundColor: 'var(--button-bg)',
          color: 'var(--text-primary)',
        }}
        aria-label={isRunning ? '一時停止' : '開始'}
      >
        {isRunning ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
      </button>

      {/* スキップボタン */}
      <button
        onClick={onSkip}
        className="p-3 rounded-full transition-all duration-200"
        style={{
          backgroundColor: 'var(--surface-bg)',
          color: 'var(--text-secondary)',
        }}
        aria-label="次へスキップ"
      >
        <SkipForward size={24} />
      </button>

      {/* 設定ボタン */}
      <button
        onClick={onSettingsClick}
        className="p-3 rounded-full transition-all duration-200"
        style={{
          backgroundColor: 'var(--surface-bg)',
          color: 'var(--text-secondary)',
        }}
        aria-label="設定"
      >
        <Settings size={24} />
      </button>
    </div>
  );
}
