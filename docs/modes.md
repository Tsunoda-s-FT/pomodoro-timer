# Modes

The app runs in two modes. The mode is derived from `state.program`.

## Normal mode

- Active when `state.program` is `undefined`.
- Sequence: `work -> shortBreak -> work ... -> longBreak`.
- The long break is triggered after `sessionsBeforeLongBreak` work sessions.

## Program mode

- Active when `state.program` is defined.
- Sequence follows `program.definition.sessions` and `program.run.phase`.
- `break` phases are represented as `shortBreak` for UI color and notifications.
- Zero-minute phases advance immediately.

## Auto start

- `timer.autoStart = true`: next phase starts automatically.
- `timer.autoStart = false`: next phase transitions to `idle` and waits for `start`.
