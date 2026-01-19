export type TimerMode = 'work' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';
export type SoundType = 'bell' | 'chime' | 'digital' | 'none';

export interface TimerSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStart: boolean;
}

export interface SoundSettings {
  enabled: boolean;
  volume: number;
  soundType: SoundType;
}

export interface AppSettings {
  timer: TimerSettings;
  sound: SoundSettings;
}

export interface SettingsPatch {
  timer?: Partial<TimerSettings>;
  sound?: Partial<SoundSettings>;
}

export interface ProgramSession {
  workMinutes: number;
  breakMinutes: number;
  label?: string;
}

export interface PomodoroProgram {
  id: string;
  name: string;
  description?: string;
  sessions: ProgramSession[];
  repeat: boolean;
  createdAt: string;
}

export type ProgramPhase = 'work' | 'break';

export interface ProgramRun {
  sessionIndex: number;
  phase: ProgramPhase;
  completedCycles: number;
}

export interface ProgramRuntime {
  definition: PomodoroProgram;
  run: ProgramRun;
}

export interface TimerTiming {
  startedAt?: string;
  endAt?: string;
  remainingSeconds?: number;
}

export interface PomodoroState {
  status: TimerStatus;
  mode: TimerMode;
  timeLeftSeconds: number;
  totalTimeSeconds: number;
  sessionCount: number;
  completedSessions: number;
  currentTask?: string;
  settings: AppSettings;
  program?: ProgramRuntime;
  timing: TimerTiming;
  lastUpdated: string;
  version: number;
}

export interface StateSnapshot {
  state: PomodoroState;
  serverTime: string;
}

export type Command =
  | { type: 'start'; task?: string }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'skip' }
  | { type: 'updateSettings'; settings: Partial<AppSettings> }
  | { type: 'startProgram'; program: Omit<PomodoroProgram, 'id' | 'createdAt'> }
  | { type: 'stopProgram' }
  | { type: 'modifyProgram'; sessions: ProgramSession[]; appendMode?: boolean };

export type EventType =
  | 'stateUpdated'
  | 'settingsUpdated'
  | 'programUpdated'
  | 'phaseCompleted'
  | 'programCompleted';

export interface PomodoroEvent {
  type: EventType;
  at: string;
  stateVersion: number;
  state: PomodoroState;
  data?: Record<string, unknown>;
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStart: true,
};

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.7,
  soundType: 'bell',
};

export const DEFAULT_SETTINGS: AppSettings = {
  timer: DEFAULT_TIMER_SETTINGS,
  sound: DEFAULT_SOUND_SETTINGS,
};

export function createInitialState(settings?: SettingsPatch): PomodoroState {
  const merged = mergeSettings(settings);
  const totalSeconds = Math.floor(merged.timer.workMinutes * 60);
  return {
    status: 'idle',
    mode: 'work',
    timeLeftSeconds: totalSeconds,
    totalTimeSeconds: totalSeconds,
    sessionCount: 0,
    completedSessions: 0,
    settings: merged,
    timing: {},
    lastUpdated: new Date().toISOString(),
    version: 1,
  };
}

export function mergeSettings(settings?: SettingsPatch): AppSettings {
  return {
    timer: { ...DEFAULT_TIMER_SETTINGS, ...settings?.timer },
    sound: { ...DEFAULT_SOUND_SETTINGS, ...settings?.sound },
  };
}

export function normalizeSettings(settings: Partial<AppSettings>): SettingsPatch {
  if (!settings || typeof settings !== 'object') {
    return {};
  }
  const normalized: SettingsPatch = { ...settings };

  if (normalized.timer) {
    const timer: Partial<TimerSettings> = { ...normalized.timer };
    if (timer.workMinutes !== undefined) {
      const value = parseNumber(timer.workMinutes);
      if (value === undefined) {
        delete timer.workMinutes;
      } else {
        timer.workMinutes = clampInt(value, 1, 180);
      }
    }
    if (timer.shortBreakMinutes !== undefined) {
      const value = parseNumber(timer.shortBreakMinutes);
      if (value === undefined) {
        delete timer.shortBreakMinutes;
      } else {
        timer.shortBreakMinutes = clampInt(value, 1, 60);
      }
    }
    if (timer.longBreakMinutes !== undefined) {
      const value = parseNumber(timer.longBreakMinutes);
      if (value === undefined) {
        delete timer.longBreakMinutes;
      } else {
        timer.longBreakMinutes = clampInt(value, 1, 90);
      }
    }
    if (timer.sessionsBeforeLongBreak !== undefined) {
      const value = parseNumber(timer.sessionsBeforeLongBreak);
      if (value === undefined) {
        delete timer.sessionsBeforeLongBreak;
      } else {
        timer.sessionsBeforeLongBreak = clampInt(value, 1, 10);
      }
    }
    if (timer.autoStart !== undefined) {
      const value = parseBoolean(timer.autoStart);
      if (value === undefined) {
        delete timer.autoStart;
      } else {
        timer.autoStart = value;
      }
    }
    normalized.timer = timer;
  }

  if (normalized.sound) {
    const sound: Partial<SoundSettings> = { ...normalized.sound };
    if (sound.volume !== undefined) {
      const value = parseNumber(sound.volume);
      if (value === undefined) {
        delete sound.volume;
      } else {
        sound.volume = clampNumber(value, 0, 1);
      }
    }
    if (sound.enabled !== undefined) {
      const value = parseBoolean(sound.enabled);
      if (value === undefined) {
        delete sound.enabled;
      } else {
        sound.enabled = value;
      }
    }
    if (sound.soundType !== undefined) {
      const value = parseSoundType(sound.soundType);
      if (value === undefined) {
        delete sound.soundType;
      } else {
        sound.soundType = value;
      }
    }
    normalized.sound = sound;
  }

  return normalized;
}

export function sanitizeState(input: unknown): PomodoroState {
  if (!input || typeof input !== 'object') {
    return createInitialState();
  }

  const raw = input as Partial<PomodoroState>;
  const settings = mergeSettings(normalizeSettings(raw.settings ?? {}));
  const base = createInitialState(settings);

  const mode = isTimerMode(raw.mode) ? raw.mode : base.mode;
  let status = isTimerStatus(raw.status) ? raw.status : base.status;

  const timing = sanitizeTiming(raw.timing);

  if (status === 'running' && !timing.endAt) {
    status = 'idle';
  }
  if (status === 'paused' && timing.remainingSeconds === undefined) {
    status = 'idle';
  }

  return {
    ...base,
    status,
    mode,
    timeLeftSeconds: coerceNonNegativeInt(raw.timeLeftSeconds, base.timeLeftSeconds),
    totalTimeSeconds: coerceNonNegativeInt(raw.totalTimeSeconds, base.totalTimeSeconds),
    sessionCount: coerceNonNegativeInt(raw.sessionCount, base.sessionCount),
    completedSessions: coerceNonNegativeInt(raw.completedSessions, base.completedSessions),
    currentTask: typeof raw.currentTask === 'string' ? raw.currentTask : undefined,
    settings,
    program: sanitizeProgram(raw.program),
    timing,
    lastUpdated: typeof raw.lastUpdated === 'string' ? raw.lastUpdated : base.lastUpdated,
    version: coercePositiveInt(raw.version, base.version),
  };
}

export function createProgramDefinition(
  program: Omit<PomodoroProgram, 'id' | 'createdAt'>,
  now: Date
): PomodoroProgram {
  validateProgram(program);
  return {
    ...program,
    id: generateId(now),
    createdAt: now.toISOString(),
  };
}

export function validateProgram(program: Omit<PomodoroProgram, 'id' | 'createdAt'>): void {
  if (!program.name || program.name.trim().length === 0) {
    throw new Error('Program name is required');
  }
  if (!program.sessions || program.sessions.length === 0) {
    throw new Error('Program sessions are required');
  }
  let totalMinutes = 0;
  for (const session of program.sessions) {
    if (!Number.isFinite(session.workMinutes) || !Number.isFinite(session.breakMinutes)) {
      throw new Error('Program session minutes must be numbers');
    }
    if (session.workMinutes < 0 || session.breakMinutes < 0) {
      throw new Error('Program session minutes must be >= 0');
    }
    totalMinutes += session.workMinutes + session.breakMinutes;
  }
  if (program.repeat && totalMinutes <= 0) {
    throw new Error('Repeatable programs must have a positive total duration');
  }
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function coerceNonNegativeInt(value: unknown, fallback: number): number {
  const parsed = parseNumber(value);
  if (parsed === undefined) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function coercePositiveInt(value: unknown, fallback: number): number {
  const parsed = parseNumber(value);
  if (parsed === undefined) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  return undefined;
}

function parseSoundType(value: unknown): SoundType | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === 'bell' || value === 'chime' || value === 'digital' || value === 'none') {
    return value;
  }
  return undefined;
}

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'work' || value === 'shortBreak' || value === 'longBreak';
}

function isTimerStatus(value: unknown): value is TimerStatus {
  return value === 'idle' || value === 'running' || value === 'paused';
}

function sanitizeTiming(input: unknown): TimerTiming {
  if (!input || typeof input !== 'object') return {};
  const raw = input as Partial<TimerTiming>;
  const timing: TimerTiming = {};
  if (typeof raw.startedAt === 'string') {
    timing.startedAt = raw.startedAt;
  }
  if (typeof raw.endAt === 'string') {
    timing.endAt = raw.endAt;
  }
  if (raw.remainingSeconds !== undefined) {
    const remaining = parseNumber(raw.remainingSeconds);
    if (remaining !== undefined) {
      timing.remainingSeconds = Math.max(0, Math.floor(remaining));
    }
  }
  return timing;
}

function sanitizeProgram(input: unknown): ProgramRuntime | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const raw = input as Partial<ProgramRuntime>;
  if (!raw.definition || typeof raw.definition !== 'object') return undefined;
  if (!raw.run || typeof raw.run !== 'object') return undefined;

  const definition = raw.definition as Partial<PomodoroProgram>;
  if (typeof definition.id !== 'string' || typeof definition.name !== 'string') return undefined;
  if (!Array.isArray(definition.sessions) || definition.sessions.length === 0) return undefined;

  const sessions: ProgramSession[] = [];
  for (const session of definition.sessions) {
    if (!session || typeof session !== 'object') return undefined;
    const workMinutes = parseNumber((session as ProgramSession).workMinutes);
    const breakMinutes = parseNumber((session as ProgramSession).breakMinutes);
    if (workMinutes === undefined || breakMinutes === undefined) return undefined;
    if (workMinutes < 0 || breakMinutes < 0) return undefined;
    const label = typeof (session as ProgramSession).label === 'string'
      ? (session as ProgramSession).label
      : undefined;
    sessions.push({
      workMinutes,
      breakMinutes,
      label,
    });
  }

  const run = raw.run as Partial<ProgramRun>;
  const sessionIndex = coerceNonNegativeInt(run.sessionIndex, 0);
  if (sessionIndex >= sessions.length) return undefined;
  const phase = run.phase === 'work' || run.phase === 'break' ? run.phase : undefined;
  if (!phase) return undefined;

  const repeat = parseBoolean(definition.repeat) ?? false;
  const createdAt = typeof definition.createdAt === 'string'
    ? definition.createdAt
    : new Date().toISOString();

  return {
    definition: {
      id: definition.id,
      name: definition.name,
      description: typeof definition.description === 'string' ? definition.description : undefined,
      sessions,
      repeat,
      createdAt,
    },
    run: {
      sessionIndex,
      phase,
      completedCycles: coerceNonNegativeInt(run.completedCycles, 0),
    },
  };
}

function generateId(now: Date): string {
  return `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
}
