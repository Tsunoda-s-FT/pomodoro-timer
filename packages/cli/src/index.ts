#!/usr/bin/env node

import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@pomodoro/client';
import type { PomodoroState } from '@pomodoro/protocol';
import { DATA_DIR, isDaemonRunning, getDaemonPid } from './daemon.js';

const DEFAULT_PORT = parseInt(process.env.POMODORO_PORT ?? '3000', 10);
const BASE_URL = process.env.POMODORO_URL ?? `http://localhost:${DEFAULT_PORT}`;

function parseArgs(args: string[]): { command: string; options: Record<string, string | boolean> } {
  const command = args[0] ?? 'status';
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
}

function getModeLabel(mode: PomodoroState['mode']): string {
  switch (mode) {
    case 'work':
      return 'Work';
    case 'shortBreak':
      return 'Short Break';
    case 'longBreak':
      return 'Long Break';
    default:
      return mode;
  }
}

function outputHuman(state: PomodoroState): void {
  const statusMap: Record<PomodoroState['status'], string> = {
    idle: 'Idle',
    running: 'Running',
    paused: 'Paused',
  };

  console.log('');
  console.log(`  Status: ${statusMap[state.status]} | Mode: ${getModeLabel(state.mode)}`);
  console.log(`  Time: ${formatTime(state.timeLeftSeconds)} / ${formatTime(state.totalTimeSeconds)}`);
  console.log(`  Session: ${state.sessionCount + 1} / ${state.settings.timer.sessionsBeforeLongBreak}`);
  console.log(`  Completed: ${state.completedSessions}`);

  if (state.currentTask) {
    console.log(`  Task: ${state.currentTask}`);
  }

  if (state.program) {
    const { definition, run } = state.program;
    console.log(`  Program: ${definition.name}`);
    console.log(`  Program Session: ${run.sessionIndex + 1}/${definition.sessions.length} (${run.phase})`);
  }

  console.log('');
}

function showHelp(): void {
  console.log(`
Pomodoro Timer CLI

Usage:
  pomodoro <command> [options]

Commands:
  start [--task "Task name"]
  pause
  resume
  reset
  skip
  status
  logs [--limit N]
  stats [--days N]
  config
  config set <key> <value>

Daemon commands:
  daemon
  daemon start [--port N]
  daemon stop
  daemon status

Options:
  --format json
  --help

Config keys:
  work        Work minutes
  short       Short break minutes
  long        Long break minutes
  sessions    Sessions before long break
  autostart   true | false

Examples:
  pomodoro start --task "Coding"
  pomodoro status --format json
  pomodoro config set work 30
  pomodoro logs --limit 20
  pomodoro daemon start --port 3001

Data dir: ${DATA_DIR}
Daemon URL: ${BASE_URL}
`);
}

function ensureDaemon(): void {
  if (!isDaemonRunning()) {
    console.error('Daemon is not running. Start it with: pomodoro daemon start');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const { command, options } = parseArgs(args);
  const isJson = options.format === 'json';

  const client = createClient({ baseUrl: BASE_URL });

  switch (command) {
    case 'start': {
      ensureDaemon();
      const task = options.task as string | undefined;
      const snapshot = await client.sendCommand({ type: 'start', task });
      if (isJson) {
        outputJson({ success: true, snapshot });
      } else {
        console.log(`Started${task ? ` (task: ${task})` : ''}`);
        outputHuman(snapshot.state);
      }
      break;
    }

    case 'pause': {
      ensureDaemon();
      const snapshot = await client.sendCommand({ type: 'pause' });
      if (isJson) {
        outputJson({ success: true, snapshot });
      } else {
        console.log('Paused');
        outputHuman(snapshot.state);
      }
      break;
    }

    case 'resume': {
      ensureDaemon();
      const snapshot = await client.sendCommand({ type: 'resume' });
      if (isJson) {
        outputJson({ success: true, snapshot });
      } else {
        console.log('Resumed');
        outputHuman(snapshot.state);
      }
      break;
    }

    case 'reset': {
      ensureDaemon();
      const snapshot = await client.sendCommand({ type: 'reset' });
      if (isJson) {
        outputJson({ success: true, snapshot });
      } else {
        console.log('Reset');
        outputHuman(snapshot.state);
      }
      break;
    }

    case 'skip': {
      ensureDaemon();
      const snapshot = await client.sendCommand({ type: 'skip' });
      if (isJson) {
        outputJson({ success: true, snapshot });
      } else {
        console.log(`Skipped to ${getModeLabel(snapshot.state.mode)}`);
        outputHuman(snapshot.state);
      }
      break;
    }

    case 'status': {
      ensureDaemon();
      const snapshot = await client.getState();
      if (isJson) {
        outputJson(snapshot);
      } else {
        outputHuman(snapshot.state);
      }
      break;
    }

    case 'logs': {
      ensureDaemon();
      const limit = parseInt(options.limit as string, 10) || 20;
      const logs = await client.getLogs(limit);
      if (isJson) {
        outputJson(logs);
      } else {
        console.log(JSON.stringify(logs, null, 2));
      }
      break;
    }

    case 'stats': {
      ensureDaemon();
      const days = parseInt(options.days as string, 10) || 7;
      const stats = await client.getStats(days);
      if (isJson) {
        outputJson(stats);
      } else {
        const { totalSessions, totalWorkMinutes, averageSessionsPerDay, completionRate } = stats as {
          totalSessions: number;
          totalWorkMinutes: number;
          averageSessionsPerDay: number;
          completionRate: number;
        };
        console.log(`\nStats (${days} days):\n`);
        console.log(`  Sessions: ${totalSessions}`);
        console.log(`  Work time: ${formatDuration(totalWorkMinutes)}`);
        console.log(`  Avg/day: ${averageSessionsPerDay.toFixed(1)}`);
        console.log(`  Completion rate: ${(completionRate * 100).toFixed(1)}%`);
        console.log('');
      }
      break;
    }

    case 'config': {
      ensureDaemon();
      const subCommand = args[1];

      if (subCommand === 'set') {
        const key = args[2];
        const value = args[3];
        if (!key || value === undefined) {
          console.error('Usage: pomodoro config set <key> <value>');
          process.exit(1);
        }

        const nextSettings = await client.getSettings();
        switch (key) {
          case 'work':
            nextSettings.timer.workMinutes = parseRequiredInt(value, 'work');
            break;
          case 'short':
            nextSettings.timer.shortBreakMinutes = parseRequiredInt(value, 'short');
            break;
          case 'long':
            nextSettings.timer.longBreakMinutes = parseRequiredInt(value, 'long');
            break;
          case 'sessions':
            nextSettings.timer.sessionsBeforeLongBreak = parseRequiredInt(value, 'sessions');
            break;
          case 'autostart':
            if (value !== 'true' && value !== 'false') {
              console.error('autostart must be true or false');
              process.exit(1);
            }
            nextSettings.timer.autoStart = value === 'true';
            break;
          default:
            console.error(`Unknown config key: ${key}`);
            process.exit(1);
        }

        const snapshot = await client.sendCommand({ type: 'updateSettings', settings: nextSettings });
        if (isJson) {
          outputJson({ success: true, settings: snapshot.state.settings });
        } else {
          console.log(`Updated ${key} = ${value}`);
        }
      } else {
        const settings = await client.getSettings();
        if (isJson) {
          outputJson(settings);
        } else {
          console.log('\nCurrent settings:\n');
          console.log(`  Work (work): ${settings.timer.workMinutes}`);
          console.log(`  Short break (short): ${settings.timer.shortBreakMinutes}`);
          console.log(`  Long break (long): ${settings.timer.longBreakMinutes}`);
          console.log(`  Sessions (sessions): ${settings.timer.sessionsBeforeLongBreak}`);
          console.log(`  Auto start (autostart): ${settings.timer.autoStart}`);
          console.log('');
        }
      }
      break;
    }

    case 'daemon': {
      const subCommand = args[1];

      if (!subCommand || subCommand === 'foreground') {
        const port = parseInt(options.port as string, 10) || DEFAULT_PORT;
        const daemonScript = resolveDaemonScript();
        const child = spawn('node', [daemonScript, port.toString()], { stdio: 'inherit' });
        child.on('exit', (code) => process.exit(code ?? 0));
        return;
      }

      if (subCommand === 'start') {
        if (isDaemonRunning()) {
          const pid = getDaemonPid();
          if (isJson) {
            outputJson({ success: false, error: 'Daemon already running', pid });
          } else {
            console.log(`Daemon already running (PID: ${pid})`);
          }
          process.exit(1);
        }

        const port = parseInt(options.port as string, 10) || DEFAULT_PORT;
        const daemonScript = resolveDaemonScript();

        const child = spawn('node', [daemonScript, port.toString()], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();

        if (isJson) {
          outputJson({ success: true, message: 'Daemon started', port, pid: child.pid });
        } else {
          console.log(`Daemon started (PID: ${child.pid}, port: ${port})`);
        }
        break;
      }

      if (subCommand === 'stop') {
        const pid = getDaemonPid();
        if (!pid) {
          if (isJson) {
            outputJson({ success: false, error: 'Daemon not running' });
          } else {
            console.log('Daemon not running');
          }
          process.exit(1);
        }

        try {
          process.kill(pid, 'SIGTERM');
          if (isJson) {
            outputJson({ success: true, message: 'Daemon stopped', pid });
          } else {
            console.log(`Daemon stopped (PID: ${pid})`);
          }
        } catch {
          if (isJson) {
            outputJson({ success: false, error: 'Failed to stop daemon' });
          } else {
            console.error('Failed to stop daemon');
          }
          process.exit(1);
        }
        break;
      }

      if (subCommand === 'status') {
        const running = isDaemonRunning();
        const pid = getDaemonPid();
        if (isJson) {
          outputJson({ running, pid });
        } else {
          console.log(running ? `Daemon running (PID: ${pid})` : 'Daemon stopped');
        }
        break;
      }

      console.error(`Unknown subcommand: ${subCommand}`);
      process.exit(1);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run pomodoro --help');
      process.exit(1);
  }
}

function resolveDaemonScript(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '../../api/dist/index.js');
}

function parseRequiredInt(value: string, key: string): number {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    console.error(`${key} must be a number`);
    process.exit(1);
  }
  return parsed;
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
