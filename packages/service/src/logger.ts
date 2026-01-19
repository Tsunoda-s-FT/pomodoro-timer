import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PomodoroEvent } from '@pomodoro/protocol';

export interface LoggerOptions {
  logDir: string;
  maxLogFiles?: number;
  maxLogSizeMB?: number;
}

export interface LogEntry {
  timestamp: string;
  type: PomodoroEvent['type'];
  data?: Record<string, unknown>;
}

export class Logger {
  private logDir: string;
  private currentLogFile: string;
  private maxLogFiles: number;
  private maxLogSizeBytes: number;

  constructor(options: LoggerOptions) {
    this.logDir = options.logDir;
    this.maxLogFiles = options.maxLogFiles ?? 10;
    this.maxLogSizeBytes = (options.maxLogSizeMB ?? 10) * 1024 * 1024;

    this.ensureLogDir();
    this.currentLogFile = this.getLogFilePath();
  }

  logEvent(event: PomodoroEvent): void {
    const entry: LogEntry = {
      timestamp: event.at,
      type: event.type,
      data: event.data,
    };

    const line = JSON.stringify(entry) + '\n';
    this.rotateIfNeeded();

    const expectedPath = this.getLogFilePath();
    if (expectedPath !== this.currentLogFile) {
      this.currentLogFile = expectedPath;
    }

    fs.appendFileSync(this.currentLogFile, line);
  }

  getRecentLogs(limit: number = 100): LogEntry[] {
    const entries: LogEntry[] = [];
    const files = this.getLogFiles().reverse();

    for (const file of files) {
      if (entries.length >= limit) break;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
        try {
          entries.push(JSON.parse(lines[i]) as LogEntry);
        } catch {
          // ignore
        }
      }
    }

    return entries;
  }

  getStatistics(days: number = 7): {
    totalSessions: number;
    totalWorkMinutes: number;
    averageSessionsPerDay: number;
    completionRate: number;
  } {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const logs = this.getLogsByDateRange(startDate, new Date());

    const completions = logs.filter((log) => log.type === 'phaseCompleted');
    const workCompletions = completions.filter((log) => {
      const mode = log.data?.mode;
      const phase = log.data?.phase;
      return mode === 'work' || phase === 'work';
    });

    const totalWorkMinutes = workCompletions.reduce((sum, log) => {
      const duration = typeof log.data?.durationSeconds === 'number'
        ? log.data.durationSeconds
        : 0;
      return sum + duration / 60;
    }, 0);

    return {
      totalSessions: workCompletions.length,
      totalWorkMinutes: Math.floor(totalWorkMinutes),
      averageSessionsPerDay: days > 0 ? completions.length / days : 0,
      completionRate: completions.length > 0 ? workCompletions.length / completions.length : 0,
    };
  }

  private getLogsByDateRange(startDate: Date, endDate: Date): LogEntry[] {
    const entries: LogEntry[] = [];
    const files = this.getLogFiles();

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          const entryDate = new Date(entry.timestamp);
          if (entryDate >= startDate && entryDate <= endDate) {
            entries.push(entry);
          }
        } catch {
          // ignore
        }
      }
    }

    return entries;
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `pomodoro-${date}.log`);
  }

  private getLogFiles(): string[] {
    if (!fs.existsSync(this.logDir)) return [];

    return fs
      .readdirSync(this.logDir)
      .filter((f) => f.startsWith('pomodoro-') && f.endsWith('.log'))
      .map((f) => path.join(this.logDir, f))
      .sort();
  }

  private rotateIfNeeded(): void {
    const files = this.getLogFiles();

    while (files.length > this.maxLogFiles) {
      const oldest = files.shift();
      if (oldest) {
        fs.unlinkSync(oldest);
      }
    }

    if (fs.existsSync(this.currentLogFile)) {
      const stats = fs.statSync(this.currentLogFile);
      if (stats.size > this.maxLogSizeBytes) {
        const timestamp = Date.now();
        const newName = this.currentLogFile.replace('.log', `-${timestamp}.log`);
        fs.renameSync(this.currentLogFile, newName);
      }
    }
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
}
