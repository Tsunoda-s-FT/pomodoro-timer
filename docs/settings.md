# Settings

## Defaults

| Key | Default | Description |
| --- | --- | --- |
| `timer.workMinutes` | 25 | Work minutes |
| `timer.shortBreakMinutes` | 5 | Short break minutes |
| `timer.longBreakMinutes` | 15 | Long break minutes |
| `timer.sessionsBeforeLongBreak` | 4 | Sessions before long break |
| `timer.autoStart` | true | Auto start next phase |
| `sound.enabled` | true | Sound enabled |
| `sound.volume` | 0.7 | Sound volume (0.0 - 1.0) |
| `sound.soundType` | "bell" | Sound type |

Web-only settings:

| Key | Default | Description |
| --- | --- | --- |
| `appearance.themeMode` | "system" | UI theme mode |
| `appearance.schedule.lightModeStart` | 7 | Light mode start hour |
| `appearance.schedule.darkModeStart` | 19 | Dark mode start hour |

## Storage locations

- CLI/Daemon: `~/.pomodoro/state.json`
- Web local mode: `localStorage`

If `state.json` is corrupted, it is backed up as:

```
state.json.corrupt-YYYY-MM-DD...
```
