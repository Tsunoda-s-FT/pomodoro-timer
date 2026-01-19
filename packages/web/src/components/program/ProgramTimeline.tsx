import type { ProgramSession } from '@pomodoro/protocol';
import { calculateTotalMinutes, formatDuration } from './presets';

interface ProgramTimelineProps {
  sessions: ProgramSession[];
  currentSessionIndex?: number;
  currentPhase?: 'work' | 'break';
}

export function ProgramTimeline({
  sessions,
  currentSessionIndex,
  currentPhase
}: ProgramTimelineProps) {
  const totalMinutes = calculateTotalMinutes(sessions);

  // 各セグメントの幅を計算
  const segments: {
    type: 'work' | 'break';
    minutes: number;
    label?: string;
    sessionIndex: number;
    isActive: boolean;
    isPast: boolean;
  }[] = [];

  sessions.forEach((session, index) => {
    // 作業セグメント（0分の場合はスキップ）
    if (session.workMinutes > 0) {
      const isWorkActive = currentSessionIndex === index && currentPhase === 'work';
      const isPast = currentSessionIndex !== undefined && index < currentSessionIndex;
      segments.push({
        type: 'work',
        minutes: session.workMinutes,
        label: session.label,
        sessionIndex: index,
        isActive: isWorkActive,
        isPast: isPast || (currentSessionIndex === index && currentPhase === 'break'),
      });
    }

    // 休憩セグメント
    if (session.breakMinutes > 0) {
      const isBreakActive = currentSessionIndex === index && currentPhase === 'break';
      const isPast = currentSessionIndex !== undefined && index < currentSessionIndex;
      segments.push({
        type: 'break',
        minutes: session.breakMinutes,
        label: session.workMinutes === 0 ? session.label : undefined, // 作業0分の場合のみラベル表示
        sessionIndex: index,
        isActive: isBreakActive,
        isPast,
      });
    }
  });

  return (
    <div className="w-full">
      {/* タイムラインバー */}
      <div className="flex h-8 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
        {segments.map((segment, i) => {
          const widthPercent = (segment.minutes / totalMinutes) * 100;
          const isWork = segment.type === 'work';

          // 色の決定
          let bgColor: string;
          let opacity = 1;

          if (segment.isPast) {
            bgColor = 'var(--text-tertiary)';
            opacity = 0.3;
          } else if (segment.isActive) {
            bgColor = isWork ? 'var(--work-primary)' : 'var(--short-break-primary)';
          } else {
            bgColor = isWork ? 'var(--work-primary)' : 'var(--short-break-primary)';
            opacity = 0.6;
          }

          return (
            <div
              key={i}
              className={`relative flex items-center justify-center text-xs font-medium transition-all ${
                segment.isActive ? 'ring-2 ring-white/50 z-10' : ''
              }`}
              style={{
                width: `${widthPercent}%`,
                minWidth: widthPercent > 3 ? '24px' : '8px',
                backgroundColor: bgColor,
                opacity,
              }}
              title={`${segment.label || (isWork ? '作業' : '休憩')}: ${segment.minutes}分`}
            >
              {widthPercent > 8 && (
                <span className="text-white/90 truncate px-1">
                  {segment.minutes}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 凡例と合計時間 */}
      <div className="flex items-center justify-between mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: 'var(--work-primary)' }}
            />
            <span>作業</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: 'var(--short-break-primary)' }}
            />
            <span>休憩</span>
          </div>
        </div>
        <span>合計: {formatDuration(totalMinutes)}</span>
      </div>
    </div>
  );
}
