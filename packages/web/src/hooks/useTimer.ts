import { useEffect, useMemo, useState } from 'react';
import { computeTimeLeftSeconds } from '@pomodoro/core';
import type { PomodoroState, TimerMode, ProgramSession } from '@pomodoro/protocol';
import { usePomodoro } from '../contexts/PomodoroContext';

export type { TimerMode } from '@pomodoro/protocol';
export type { ProgramSession } from '@pomodoro/protocol';

interface ProgramInfo {
  name: string;
  currentSessionIndex: number;
  totalSessions: number;
  currentSessionLabel?: string;
  phase: 'work' | 'break';
}

interface TimerState {
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  mode: TimerMode;
  sessionCount: number;
  progress: number;
  program?: ProgramInfo;
}

interface TimerActions {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skipToNext: () => void;
}

interface TimerMeta {
  connected?: boolean;
  error?: string | null;
}

interface ProgramActions {
  startProgram?: (program: {
    name: string;
    description?: string;
    sessions: ProgramSession[];
    repeat: boolean;
  }) => Promise<void>;
  stopProgram?: () => Promise<void>;
}

export function useTimer(): TimerState & TimerActions & TimerMeta & ProgramActions {
  const { state, serverOffsetMs, connected, error, actions } = usePomodoro();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const derived = useMemo(() => deriveState(state, now + serverOffsetMs), [state, now, serverOffsetMs]);

  return {
    ...derived,
    start: () => {
      actions.start().catch(() => {});
    },
    pause: () => {
      actions.pause().catch(() => {});
    },
    reset: () => {
      actions.reset().catch(() => {});
    },
    skipToNext: () => {
      actions.skip().catch(() => {});
    },
    connected,
    error,
    startProgram: (program) => actions.startProgram(program).catch(() => {}),
    stopProgram: () => actions.stopProgram().catch(() => {}),
  };
}

function deriveState(state: PomodoroState, serverNowMs: number): TimerState {
  const timeLeft = computeTimeLeftSeconds(state, serverNowMs);
  const totalTime = state.totalTimeSeconds;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  let program: ProgramInfo | undefined;
  if (state.program) {
    const { definition, run } = state.program;
    const currentSession = definition.sessions[run.sessionIndex];
    program = {
      name: definition.name,
      currentSessionIndex: run.sessionIndex,
      totalSessions: definition.sessions.length,
      currentSessionLabel: currentSession?.label,
      phase: run.phase,
    };
  }

  return {
    timeLeft,
    totalTime,
    isRunning: state.status === 'running',
    mode: state.mode,
    sessionCount: state.sessionCount,
    progress,
    program,
  };
}
