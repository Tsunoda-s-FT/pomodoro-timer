import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PomodoroState } from '@pomodoro/protocol';
import { createInitialState, sanitizeState } from '@pomodoro/protocol';

export interface StateStore {
  load(): PomodoroState;
  save(state: PomodoroState): void;
}

export class FileStateStore implements StateStore {
  private dataDir: string;
  private stateFilePath: string;

  constructor(dataDir: string, stateFile = 'state.json') {
    this.dataDir = dataDir;
    this.stateFilePath = path.join(this.dataDir, stateFile);
    this.ensureDataDir();
  }

  load(): PomodoroState {
    if (!fs.existsSync(this.stateFilePath)) {
      const initial = createInitialState();
      this.save(initial);
      return initial;
    }

    try {
      const content = fs.readFileSync(this.stateFilePath, 'utf-8');
      const parsed = JSON.parse(content) as PomodoroState;
      const sanitized = sanitizeState(parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
        this.save(sanitized);
      }
      return sanitized;
    } catch {
      this.backupCorruptState();
      const initial = createInitialState();
      this.save(initial);
      return initial;
    }
  }

  save(state: PomodoroState): void {
    const tmpPath = `${this.stateFilePath}.tmp`;
    const content = JSON.stringify(state, null, 2);
    fs.writeFileSync(tmpPath, content);
    fs.renameSync(tmpPath, this.stateFilePath);
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private backupCorruptState(): void {
    if (!fs.existsSync(this.stateFilePath)) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.stateFilePath}.corrupt-${timestamp}`;
    try {
      fs.renameSync(this.stateFilePath, backupPath);
    } catch {
      // ignore backup failures
    }
  }
}
