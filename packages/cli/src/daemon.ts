import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

export const DATA_DIR = process.env.POMODORO_DATA_DIR ?? path.join(os.homedir(), '.pomodoro');
export const PID_FILE = path.join(DATA_DIR, 'daemon.pid');

export function isDaemonRunning(): boolean {
  if (!fs.existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);
    process.kill(pid, 0);
    return true;
  } catch {
    fs.unlinkSync(PID_FILE);
    return false;
  }
}

export function getDaemonPid(): number | null {
  if (!fs.existsSync(PID_FILE)) {
    return null;
  }

  try {
    return parseInt(fs.readFileSync(PID_FILE, 'utf-8'), 10);
  } catch {
    return null;
  }
}
