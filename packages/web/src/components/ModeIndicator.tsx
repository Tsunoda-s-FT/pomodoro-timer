import type { TimerMode } from '../hooks/useTimer';

interface ModeIndicatorProps {
  mode: TimerMode;
  sessionCount: number;
  totalSessions?: number;
}

const modeLabels: Record<TimerMode, string> = {
  work: '作業中',
  shortBreak: '小休憩',
  longBreak: '長い休憩',
};

export function ModeIndicator({
  mode,
  sessionCount,
  totalSessions = 4,
}: ModeIndicatorProps) {
  return (
    <div className="text-center mb-6">
      <h2
        className="text-2xl font-light tracking-wide mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        {modeLabels[mode]}
      </h2>
      {/* セッションインジケーター */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: totalSessions }).map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i < sessionCount ? 'var(--work-primary)' : 'var(--border-default)',
              transform: i < sessionCount ? 'scale(1)' : 'scale(0.9)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
