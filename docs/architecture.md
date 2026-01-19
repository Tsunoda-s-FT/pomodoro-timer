# Pomodoro Timer Architecture (v2)

## Goals
- Single source of truth for timer state.
- Consistent behavior across CLI/Web/AI.
- Accurate time progression across sleep/restart.
- Extensible program mode for custom sequences.

## High-level structure
```
@pomodoro/protocol  # shared types + validation helpers
@pomodoro/core      # pure domain state machine
@pomodoro/service   # runtime (scheduling + persistence + logs)
@pomodoro/api       # HTTP + SSE server
@pomodoro/client    # API client for CLI/Web
@pomodoro/cli        # CLI commands + daemon management
@pomodoro/web        # UI only
```

## State model (canonical)
- State is stored with timing metadata. Clients derive display values using serverTime.
- `timing` is the single source for running clocks.
  - When `program` exists, the system is in program mode.

```
PomodoroState
  status: idle | running | paused
  mode: work | shortBreak | longBreak
  timeLeftSeconds: number
  totalTimeSeconds: number
  sessionCount: number
  completedSessions: number
  currentTask?: string
  settings: AppSettings
  program?: ProgramRuntime
  timing: { startedAt?, endAt?, remainingSeconds? }
  version: number
  lastUpdated: ISO string
```

## Modes
- Normal mode: `program` is undefined.
  - Sequence: work → shortBreak → work ... → longBreak (after `sessionsBeforeLongBreak`).
- Program mode: `program` is defined.
  - Sequence follows `program.definition.sessions` and `program.run.phase`.
  - `break` phases are represented as `shortBreak` for UI color/notification.
  - Zero-minute phases advance immediately.

## Commands
All state changes are executed via commands:
- start, pause, resume, reset, skip
- updateSettings
- startProgram, stopProgram, modifyProgram

## Command processing
- Service applies: `advanceState → applyCommand → advanceState`.
- This guarantees zero-length phases are skipped immediately after a command.

## Events (SSE)
- stateUpdated
- settingsUpdated
- programUpdated
- phaseCompleted
- programCompleted

Each event includes `serverTime`, `stateVersion`, and `state`.

## Time progression
- Service schedules the next boundary using `endAt`.
- Clients compute `timeLeftSeconds` from `endAt` and `serverTime`.
- On startup or reconnect, service advances state with `now` and emits updates.
- After command handling, service advances state once more to clear zero-length phases.

## Persistence
- State is written atomically (`tmp` -> rename).
- Logs are append-only JSONL (events).

## Client modes
- Default: Web runs local runtime for offline use.
- Daemon mode: pass `?daemon=http://...` to connect to the server.
- CLI always targets the daemon.

## Migration notes
- Legacy `core` (interval-driven) replaced by pure state machine.
- CLI no longer manipulates state directly; always uses API.
- Web timer rendering is derived from serverTime or local runtime.
