# API Reference

The daemon exposes HTTP endpoints and SSE events.

Base URL: `http://localhost:3000`

## REST endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/state` | Get current state snapshot |
| POST | `/commands` | Execute command |
| GET | `/settings` | Get settings |
| PUT | `/settings` | Update settings |
| GET | `/logs` | Get logs (`?limit=N`) |
| GET | `/stats` | Get stats (`?days=N`) |
| GET | `/health` | Health check |
| GET | `/events` | SSE stream |

Invalid JSON returns HTTP 400.

## Commands

```json
{ "type": "start", "task": "..." }
{ "type": "pause" }
{ "type": "resume" }
{ "type": "reset" }
{ "type": "skip" }
{ "type": "updateSettings", "settings": { "timer": { "workMinutes": 30 } } }
{ "type": "startProgram", "program": { "name": "...", "sessions": [], "repeat": true } }
{ "type": "stopProgram" }
{ "type": "modifyProgram", "sessions": [], "appendMode": false }
```

## Examples

```bash
curl http://localhost:3000/state

curl -X POST http://localhost:3000/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"start","task":"Deep work"}'

curl -X POST http://localhost:3000/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"stopProgram"}'
```

## SSE events

Events include `serverTime`, `stateVersion`, and `state`.

- `stateUpdated`
- `settingsUpdated`
- `programUpdated`
- `phaseCompleted`
- `programCompleted`

```js
const events = new EventSource('http://localhost:3000/events');

events.addEventListener('stateUpdated', (e) => {
  const event = JSON.parse(e.data);
  console.log(event.state.timeLeftSeconds);
});
```
