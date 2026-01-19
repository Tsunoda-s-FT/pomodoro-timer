# Web UI Usage

The Web UI can run in local mode or connect to the daemon.

## Local mode (default)

Open:

```
http://localhost:5173/
```

State is stored in `localStorage` for offline use.

## Daemon mode

Open:

```
http://localhost:5173/?daemon=http://localhost:3000
```

`?local=true` forces local mode even if the daemon is running.

The connection indicator is shown at the top:
- Green dot + "Daemon connected" when connected.
- Hidden when running locally.

## Program mode

In daemon mode, use **"Create program"** to start a preset/custom program.
While running, the UI shows program name and session progress.
Use the **X** button to stop the program.
