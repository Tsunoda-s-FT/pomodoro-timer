import { EventEmitter } from 'node:events';
import type { Command, PomodoroEvent, PomodoroState, StateSnapshot } from '@pomodoro/protocol';
import { advanceState, applyCommand, computeTimeLeftSeconds } from '@pomodoro/core';
import type { StateStore } from './storage.js';
import { Logger } from './logger.js';

export interface PomodoroServiceOptions {
  store: StateStore;
  logger: Logger;
}

export class PomodoroService extends EventEmitter {
  private store: StateStore;
  private logger: Logger;
  private state: PomodoroState;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: PomodoroServiceOptions) {
    super();
    this.store = options.store;
    this.logger = options.logger;
    this.state = this.store.load();

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

  handleCommand(command: Command): { state: PomodoroState; events: PomodoroEvent[] } {
    const now = Date.now();

    const advanced = advanceState(this.state, now);
    this.commitState(advanced.state, advanced.events, now);

    const result = applyCommand(advanced.state, command, now);
    this.commitState(result.state, result.events, now);

    const postAdvance = advanceState(this.state, now);
    this.commitState(postAdvance.state, postAdvance.events, now);

    this.scheduleNext();

    return { state: this.getComputedState(now), events: result.events };
  }

  getLogs(limit = 100) {
    return this.logger.getRecentLogs(limit);
  }

  getStatistics(days = 7) {
    return this.logger.getStatistics(days);
  }

  shutdown(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.removeAllListeners();
  }

  private scheduleNext(): void {
    if (this.timer) {
      clearTimeout(this.timer);
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
    this.timer = setTimeout(() => this.onTimer(), delay);
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
    this.store.save(this.state);

    for (const event of events) {
      this.emit('event', event);
      if (event.type !== 'stateUpdated') {
        this.logger.logEvent(event);
      }
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
}
