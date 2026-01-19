# Development

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run test:watch

npm run build:protocol
npm run build:core
npm run build:service
npm run build:api
npm run build:client
npm run build:cli
npm run build:web
```

## PWA build mode

The service worker build uses Workbox. If you need a production SW bundle:

```bash
PWA_MODE=production npm run build:web
```

The default is `PWA_MODE=development` to avoid Rollup/Terser issues.

## Packages

```
packages/
  protocol/  shared types + validation helpers
  core/      pure domain state machine
  service/   scheduler + persistence
  api/       HTTP + SSE server
  client/    API client
  cli/       CLI app
  web/       React UI
```
