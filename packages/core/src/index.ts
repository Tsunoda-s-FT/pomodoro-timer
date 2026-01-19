export type { PomodoroState, Command, PomodoroEvent } from '@pomodoro/protocol';
export type { ProgramSession, PomodoroProgram, ProgramPhase } from '@pomodoro/protocol';
export {
  DEFAULT_SETTINGS,
  DEFAULT_SOUND_SETTINGS,
  DEFAULT_TIMER_SETTINGS,
  createInitialState,
  mergeSettings,
  normalizeSettings,
  createProgramDefinition,
  validateProgram,
} from '@pomodoro/protocol';

export { applyCommand, advanceState, computeTimeLeftSeconds } from './stateMachine.js';
