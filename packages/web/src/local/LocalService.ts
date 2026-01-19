import { EventEmitter } from '../utils/EventEmitter';
import { applyCommand, advanceState, computeTimeLeftSeconds } from '@pomodoro/core';
import type { Command, PomodoroEvent, PomodoroState, StateSnapshot } from '@pomodoro/protocol';
import { createInitialState, sanitizeState } from '@pomodoro/protocol';

const STORAGE_KEY = 'pomodoro-local-state';

type LocalEvents = {
  event: [PomodoroEvent];
};

export class LocalService extends EventEmitter<LocalEvents> {
  private state: PomodoroState;
  private timer: number | null = null;

  constructor() {
    super();
    this.state = this.load();
    const now = Date.now();
    const advanced = advanceState(this.state, now);
    this.commitState(advanced.state, advanced.events, now);
    this.scheduleNext();
  }

  getSnapshot(nowMs: number = Date.now()): StateSnapshot {
    return {
      state: this.getComputedState(nowMs),
      serverTime: new Date(nowMs).toISOString(),
    };
  }

  getState(nowMs: number = Date.now()): PomodoroState {
    return this.getComputedState(nowMs);
  }

  handleCommand(command: Command): PomodoroState {
    const now = Date.now();
    const advanced = advanceState(this.state, now);
    this.commitState(advanced.state, advanced.events, now);

    const result = applyCommand(advanced.state, command, now);
    this.commitState(result.state, result.events, now);

    const postAdvance = advanceState(this.state, now);
    this.commitState(postAdvance.state, postAdvance.events, now);

    this.scheduleNext();

    return this.getComputedState(now);
  }

  shutdown(): void {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.removeAllListeners();
  }

  private scheduleNext(): void {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.state.status !== 'running' || !this.state.timing.endAt) {
      return;
    }

    const endMs = Date.parse(this.state.timing.endAt);
    if (Number.isNaN(endMs)) {
      return;
    }

    const delay = Math.max(0, endMs - Date.now());
    this.timer = window.setTimeout(() => this.onTimer(), delay);
  }

  private onTimer(): void {
    const now = Date.now();
    const advanced = advanceState(this.state, now);
    this.commitState(advanced.state, advanced.events, now);
    this.scheduleNext();
  }

  private commitState(state: PomodoroState, events: PomodoroEvent[], nowMs: number): void {
    if (state.version === this.state.version) {
      return;
    }

    this.state = state;
    this.save(state);

    for (const event of events) {
      this.emit('event', event);
    }

    const stateEvent: PomodoroEvent = {
      type: 'stateUpdated',
      at: new Date(nowMs).toISOString(),
      stateVersion: this.state.version,
      state: this.getComputedState(nowMs),
    };

    this.emit('event', stateEvent);
  }

  private getComputedState(nowMs: number): PomodoroState {
    const timeLeft = computeTimeLeftSeconds(this.state, nowMs);
    if (timeLeft === this.state.timeLeftSeconds) {
      return this.state;
    }
    return {
      ...this.state,
      timeLeftSeconds: timeLeft,
    };
  }

  private load(): PomodoroState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PomodoroState;
        const sanitized = sanitizeState(parsed);
        if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        }
        return sanitized;
      }
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      // ignore
    }
    return createInitialState();
  }

  private save(state: PomodoroState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

let cachedService: LocalService | null = null;

export function getLocalService(): LocalService {
  if (!cachedService) {
    cachedService = new LocalService();
  }
  return cachedService;
}
