# CLI Usage

The CLI always targets the daemon.

## Start the daemon

```bash
npm run pomodoro -- daemon start
npm run pomodoro -- daemon status
npm run pomodoro -- daemon stop
```

Custom port:

```bash
npm run pomodoro -- daemon start --port 8080
```

## Timer commands

```bash
npm run pomodoro -- start --task "Task name"
npm run pomodoro -- pause
npm run pomodoro -- resume
npm run pomodoro -- reset
npm run pomodoro -- skip
```

## Status, logs, stats

```bash
npm run pomodoro -- status
npm run pomodoro -- status --format json

npm run pomodoro -- logs
npm run pomodoro -- logs --limit 50

npm run pomodoro -- stats
npm run pomodoro -- stats --days 30
```

## Settings

```bash
npm run pomodoro -- config
npm run pomodoro -- config set work 30
npm run pomodoro -- config set short 10
npm run pomodoro -- config set long 20
npm run pomodoro -- config set sessions 4
npm run pomodoro -- config set autostart true
```

## Program mode

Program operations are currently available via Web UI or API.

## Environment variables

- `POMODORO_URL`: override daemon base URL (default `http://localhost:3000`).
- `POMODORO_PORT`: override daemon port (default `3000`).
- `POMODORO_DATA_DIR`: override data directory (default `~/.pomodoro`).
