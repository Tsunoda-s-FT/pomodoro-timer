import type {
  PomodoroState,
  Command,
  PomodoroEvent,
  TimerMode,
  ProgramRuntime,
  ProgramPhase,
  ProgramSession,
  PomodoroProgram,
} from '@pomodoro/protocol';
import {
  createProgramDefinition,
  normalizeSettings,
  mergeSettings,
  validateProgram,
} from '@pomodoro/protocol';

interface TransitionResult {
  state: PomodoroState;
  events: PomodoroEvent[];
}

export function applyCommand(
  state: PomodoroState,
  command: Command,
  nowMs: number
): TransitionResult {
  switch (command.type) {
    case 'start':
      return startTimer(state, command.task, nowMs);
    case 'pause':
      return pauseTimer(state, nowMs);
    case 'resume':
      return resumeTimer(state, nowMs);
    case 'reset':
      return resetTimer(state, nowMs);
    case 'skip':
      return skipTimer(state, nowMs);
    case 'updateSettings':
      return updateSettings(state, command.settings, nowMs);
    case 'startProgram':
      return startProgram(state, command.program, nowMs);
    case 'stopProgram':
      return stopProgram(state, nowMs);
    case 'modifyProgram':
      return modifyProgram(state, command.sessions, command.appendMode ?? false, nowMs);
    default:
      return { state, events: [] };
  }
}

export function advanceState(state: PomodoroState, nowMs: number): TransitionResult {
  let next = state;
  const events: PomodoroEvent[] = [];

  while (next.status === 'running') {
    const endAt = next.timing.endAt;
    if (!endAt) break;

    const endMs = Date.parse(endAt);
    if (Number.isNaN(endMs) || nowMs < endMs) {
      break;
    }

    const completion = completePhase(next, nowMs);
    next = completion.state;
    events.push(...completion.events);

    if (completion.events.some((event) => event.type === 'programCompleted')) {
      break;
    }
  }

  return { state: next, events };
}

export function computeTimeLeftSeconds(state: PomodoroState, nowMs: number): number {
  if (state.status === 'running' && state.timing.endAt) {
    const endMs = Date.parse(state.timing.endAt);
    if (!Number.isNaN(endMs)) {
      return Math.max(0, Math.floor((endMs - nowMs) / 1000));
    }
  }

  if (state.status === 'paused') {
    if (state.timing.remainingSeconds !== undefined) {
      return Math.max(0, Math.floor(state.timing.remainingSeconds));
    }
  }

  return Math.max(0, Math.floor(state.timeLeftSeconds));
}

function startTimer(state: PomodoroState, task: string | undefined, nowMs: number): TransitionResult {
  if (state.status === 'running') {
    return { state, events: [] };
  }

  if (state.status === 'paused') {
    return resumeTimer(state, nowMs);
  }

  const durationSeconds = getCurrentDurationSeconds(state);
  const timing = createTiming(nowMs, durationSeconds);

  const next = updateState(state, nowMs, {
    status: 'running',
    currentTask: task,
    timeLeftSeconds: durationSeconds,
    totalTimeSeconds: durationSeconds,
    timing,
  });

  return { state: next, events: [] };
}

function pauseTimer(state: PomodoroState, nowMs: number): TransitionResult {
  if (state.status !== 'running' || !state.timing.endAt) {
    return { state, events: [] };
  }

  const remaining = Math.max(0, Math.floor((Date.parse(state.timing.endAt) - nowMs) / 1000));

  const next = updateState(state, nowMs, {
    status: 'paused',
    timeLeftSeconds: remaining,
    timing: { remainingSeconds: remaining },
  });

  return { state: next, events: [] };
}

function resumeTimer(state: PomodoroState, nowMs: number): TransitionResult {
  if (state.status !== 'paused') {
    return { state, events: [] };
  }

  const remaining = state.timing.remainingSeconds ?? state.timeLeftSeconds;
  const timing = createTiming(nowMs, remaining);

  const next = updateState(state, nowMs, {
    status: 'running',
    timeLeftSeconds: remaining,
    totalTimeSeconds: state.totalTimeSeconds || remaining,
    timing,
  });

  return { state: next, events: [] };
}

function resetTimer(state: PomodoroState, nowMs: number): TransitionResult {
  const durationSeconds = getCurrentDurationSeconds(state);

  const next = updateState(state, nowMs, {
    status: 'idle',
    currentTask: undefined,
    timeLeftSeconds: durationSeconds,
    totalTimeSeconds: durationSeconds,
    timing: {},
  });

  return { state: next, events: [] };
}

function skipTimer(state: PomodoroState, nowMs: number): TransitionResult {
  if (state.program) {
    const transition = advanceProgram(state, nowMs, true);
    return transition;
  }

  const transition = advanceNormalMode(state, nowMs, true);
  return transition;
}

function updateSettings(
  state: PomodoroState,
  settings: Partial<PomodoroState['settings']>,
  nowMs: number
): TransitionResult {
  const normalized = normalizeSettings(settings);
  const merged = mergeSettings({
    timer: { ...state.settings.timer, ...normalized.timer },
    sound: { ...state.settings.sound, ...normalized.sound },
  });

  let next = updateState(state, nowMs, {
    settings: merged,
  });

  if (!state.program && state.status !== 'running') {
    const durationSeconds = getCurrentDurationSeconds({ ...next, settings: merged });
    next = updateState(next, nowMs, {
      timeLeftSeconds: durationSeconds,
      totalTimeSeconds: durationSeconds,
    });
  }

  const event = createEvent('settingsUpdated', next, nowMs);
  return { state: next, events: [event] };
}

function startProgram(
  state: PomodoroState,
  programInput: Omit<PomodoroProgram, 'id' | 'createdAt'>,
  nowMs: number
): TransitionResult {
  validateProgram(programInput);
  const program = createProgramDefinition(programInput, new Date(nowMs));
  const firstSession = program.sessions[0];
  const durationSeconds = Math.floor(firstSession.workMinutes * 60);

  const runtime: ProgramRuntime = {
    definition: program,
    run: {
      sessionIndex: 0,
      phase: 'work',
      completedCycles: 0,
    },
  };

  const next = updateState(state, nowMs, {
    status: 'running',
    mode: 'work',
    program: runtime,
    sessionCount: 0,
    timeLeftSeconds: durationSeconds,
    totalTimeSeconds: durationSeconds,
    timing: createTiming(nowMs, durationSeconds),
  });

  const event = createEvent('programUpdated', next, nowMs, {
    programId: program.id,
  });

  return { state: next, events: [event] };
}

function stopProgram(state: PomodoroState, nowMs: number): TransitionResult {
  if (!state.program) {
    return { state, events: [] };
  }

  const durationSeconds = Math.floor(state.settings.timer.workMinutes * 60);

  const next = updateState(state, nowMs, {
    status: 'idle',
    mode: 'work',
    program: undefined,
    currentTask: undefined,
    timeLeftSeconds: durationSeconds,
    totalTimeSeconds: durationSeconds,
    timing: {},
  });

  const event = createEvent('programUpdated', next, nowMs);
  return { state: next, events: [event] };
}

function modifyProgram(
  state: PomodoroState,
  sessions: ProgramSession[],
  appendMode: boolean,
  nowMs: number
): TransitionResult {
  if (!state.program) {
    throw new Error('No active program');
  }

  if (!sessions || sessions.length === 0) {
    throw new Error('Program sessions are required');
  }

  for (const session of sessions) {
    if (!Number.isFinite(session.workMinutes) || !Number.isFinite(session.breakMinutes)) {
      throw new Error('Program session minutes must be numbers');
    }
    if (session.workMinutes < 0 || session.breakMinutes < 0) {
      throw new Error('Program session minutes must be >= 0');
    }
  }

  const currentIndex = state.program.run.sessionIndex;
  const existing = state.program.definition.sessions;

  const nextSessions = appendMode
    ? [...existing, ...sessions]
    : [...existing.slice(0, currentIndex + 1), ...sessions];

  const next = updateState(state, nowMs, {
    program: {
      ...state.program,
      definition: {
        ...state.program.definition,
        sessions: nextSessions,
      },
    },
  });

  const event = createEvent('programUpdated', next, nowMs, {
    programId: state.program.definition.id,
  });

  return { state: next, events: [event] };
}

function completePhase(state: PomodoroState, nowMs: number): TransitionResult {
  if (state.program) {
    return advanceProgram(state, nowMs, false);
  }

  return advanceNormalMode(state, nowMs, false);
}

function advanceProgram(state: PomodoroState, nowMs: number, manualSkip: boolean): TransitionResult {
  const runtime = state.program;
  if (!runtime) {
    return { state, events: [] };
  }

  const { definition, run } = runtime;
  const session = definition.sessions[run.sessionIndex];
  const completedDurationSeconds =
    run.phase === 'work'
      ? Math.floor(session.workMinutes * 60)
      : Math.floor(session.breakMinutes * 60);

  const events: PomodoroEvent[] = [];

  const completedWork = run.phase === 'work';

  let nextState = state;

  if (completedWork) {
    nextState = updateState(nextState, nowMs, {
      completedSessions: nextState.completedSessions + 1,
    });
  }

  if (run.phase === 'work') {
    const breakSeconds = Math.floor(session.breakMinutes * 60);
    nextState = transitionProgramPhase(nextState, nowMs, {
      sessionIndex: run.sessionIndex,
      phase: 'break',
      completedCycles: run.completedCycles,
      durationSeconds: breakSeconds,
      mode: 'shortBreak',
    });
  } else {
    const nextIndex = run.sessionIndex + 1;
    if (nextIndex >= definition.sessions.length) {
      if (definition.repeat) {
        const firstSession = definition.sessions[0];
        const workSeconds = Math.floor(firstSession.workMinutes * 60);
        nextState = transitionProgramPhase(nextState, nowMs, {
          sessionIndex: 0,
          phase: 'work',
          completedCycles: run.completedCycles + 1,
          durationSeconds: workSeconds,
          mode: 'work',
        });
      } else {
        const durationSeconds = Math.floor(state.settings.timer.workMinutes * 60);
        nextState = updateState(nextState, nowMs, {
          status: 'idle',
          mode: 'work',
          program: undefined,
          currentTask: undefined,
          timeLeftSeconds: durationSeconds,
          totalTimeSeconds: durationSeconds,
          timing: {},
        });
        events.push(createEvent('phaseCompleted', nextState, nowMs, {
          programId: definition.id,
          phase: run.phase,
          durationSeconds: completedDurationSeconds,
          manualSkip,
        }));
        events.push(createEvent('programCompleted', nextState, nowMs));
        return { state: nextState, events };
      }
    } else {
      const nextSession = definition.sessions[nextIndex];
      const workSeconds = Math.floor(nextSession.workMinutes * 60);
      nextState = transitionProgramPhase(nextState, nowMs, {
        sessionIndex: nextIndex,
        phase: 'work',
        completedCycles: run.completedCycles,
        durationSeconds: workSeconds,
        mode: 'work',
      });
    }
  }

  const completedEvent = createEvent('phaseCompleted', nextState, nowMs, {
    programId: definition.id,
    phase: run.phase,
    durationSeconds: completedDurationSeconds,
    manualSkip,
  });
  events.push(completedEvent);

  return { state: nextState, events };
}

function transitionProgramPhase(
  state: PomodoroState,
  nowMs: number,
  params: {
    sessionIndex: number;
    phase: ProgramPhase;
    completedCycles: number;
    durationSeconds: number;
    mode: TimerMode;
  }
): PomodoroState {
  const nextRuntime: ProgramRuntime = {
    definition: state.program!.definition,
    run: {
      sessionIndex: params.sessionIndex,
      phase: params.phase,
      completedCycles: params.completedCycles,
    },
  };

  if (state.settings.timer.autoStart) {
    return updateState(state, nowMs, {
      status: 'running',
      mode: params.mode,
      program: nextRuntime,
      timeLeftSeconds: params.durationSeconds,
      totalTimeSeconds: params.durationSeconds,
      timing: createTiming(nowMs, params.durationSeconds),
    });
  }

  return updateState(state, nowMs, {
    status: 'idle',
    mode: params.mode,
    program: nextRuntime,
    timeLeftSeconds: params.durationSeconds,
    totalTimeSeconds: params.durationSeconds,
    timing: {},
  });
}

function advanceNormalMode(state: PomodoroState, nowMs: number, manualSkip: boolean): TransitionResult {
  const prevMode = state.mode;
  let sessionCount = state.sessionCount;
  let completedSessions = state.completedSessions;
  const completedDurationSeconds = getDurationSeconds(prevMode, state.settings.timer);

  if (prevMode === 'work') {
    sessionCount += 1;
    completedSessions += 1;
  }

  let nextMode: TimerMode;

  if (prevMode === 'work') {
    if (sessionCount >= state.settings.timer.sessionsBeforeLongBreak) {
      nextMode = 'longBreak';
      sessionCount = 0;
    } else {
      nextMode = 'shortBreak';
    }
  } else {
    nextMode = 'work';
    if (prevMode === 'longBreak') {
      sessionCount = 0;
    }
  }

  const durationSeconds = getDurationSeconds(nextMode, state.settings.timer);

  let next: PomodoroState;
  if (state.settings.timer.autoStart) {
    next = updateState(state, nowMs, {
      status: 'running',
      mode: nextMode,
      sessionCount,
      completedSessions,
      currentTask: undefined,
      timeLeftSeconds: durationSeconds,
      totalTimeSeconds: durationSeconds,
      timing: createTiming(nowMs, durationSeconds),
    });
  } else {
    next = updateState(state, nowMs, {
      status: 'idle',
      mode: nextMode,
      sessionCount,
      completedSessions,
      currentTask: undefined,
      timeLeftSeconds: durationSeconds,
      totalTimeSeconds: durationSeconds,
      timing: {},
    });
  }

  const event = createEvent('phaseCompleted', next, nowMs, {
    mode: prevMode,
    durationSeconds: completedDurationSeconds,
    manualSkip,
  });

  return { state: next, events: [event] };
}

function createTiming(nowMs: number, durationSeconds: number) {
  return {
    startedAt: new Date(nowMs).toISOString(),
    endAt: new Date(nowMs + durationSeconds * 1000).toISOString(),
  };
}

function getCurrentDurationSeconds(state: PomodoroState): number {
  if (state.program) {
    return getProgramPhaseDurationSeconds(state.program.run, state.program.definition.sessions);
  }

  return getDurationSeconds(state.mode, state.settings.timer);
}

function getDurationSeconds(mode: TimerMode, timer: PomodoroState['settings']['timer']): number {
  switch (mode) {
    case 'work':
      return Math.floor(timer.workMinutes * 60);
    case 'shortBreak':
      return Math.floor(timer.shortBreakMinutes * 60);
    case 'longBreak':
      return Math.floor(timer.longBreakMinutes * 60);
    default:
      return Math.floor(timer.workMinutes * 60);
  }
}

function getProgramPhaseDurationSeconds(run: ProgramRuntime['run'], sessions: ProgramSession[]): number {
  const session = sessions[run.sessionIndex];
  if (!session) return 0;
  return run.phase === 'work'
    ? Math.floor(session.workMinutes * 60)
    : Math.floor(session.breakMinutes * 60);
}

function updateState(state: PomodoroState, nowMs: number, patch: Partial<PomodoroState>): PomodoroState {
  const timing = patch.timing === undefined ? state.timing : patch.timing;
  const next: PomodoroState = {
    ...state,
    ...patch,
    timing,
    lastUpdated: new Date(nowMs).toISOString(),
    version: state.version + 1,
  };
  return next;
}

function createEvent(
  type: PomodoroEvent['type'],
  state: PomodoroState,
  nowMs: number,
  data?: Record<string, unknown>
): PomodoroEvent {
  return {
    type,
    at: new Date(nowMs).toISOString(),
    stateVersion: state.version,
    state,
    data,
  };
}
