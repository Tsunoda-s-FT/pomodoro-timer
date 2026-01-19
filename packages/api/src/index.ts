#!/usr/bin/env node

import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as http from 'node:http';
import { PomodoroService, FileStateStore, Logger } from '@pomodoro/service';
import type { Command, PomodoroEvent } from '@pomodoro/protocol';

const DATA_DIR = process.env.POMODORO_DATA_DIR ?? path.join(os.homedir(), '.pomodoro');
const DEFAULT_PORT = parseInt(process.env.POMODORO_PORT ?? '3000', 10);
const PID_FILE = path.join(DATA_DIR, 'daemon.pid');
const MAX_BODY_SIZE = 1024 * 100;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const COMMAND_TYPES: Command['type'][] = [
  'start',
  'pause',
  'resume',
  'reset',
  'skip',
  'updateSettings',
  'startProgram',
  'stopProgram',
  'modifyProgram',
];

function isCommand(value: unknown): value is Command {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: string }).type;
  return typeof type === 'string' && COMMAND_TYPES.includes(type as Command['type']);
}

function getCorsOrigin(origin: string | undefined): string {
  if (!origin) return '*';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (process.env.NODE_ENV === 'development') return origin;
  return ALLOWED_ORIGINS[0];
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface SSEClient {
  id: string;
  response: http.ServerResponse;
  connectedAt: Date;
  remoteAddress: string | undefined;
}

class PomodoroServer {
  private service: PomodoroService;
  private server: http.Server;
  private port: number;
  private sseClients = new Map<string, SSEClient>();
  private clientIdCounter = 0;

  constructor(port: number = DEFAULT_PORT) {
    this.port = port;
    ensureDataDir();

    this.service = new PomodoroService({
      store: new FileStateStore(DATA_DIR),
      logger: new Logger({ logDir: path.join(DATA_DIR, 'logs') }),
    });

    this.service.on('event', (event: PomodoroEvent) => {
      this.broadcast(event);
    });

    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  start(): void {
    fs.writeFileSync(PID_FILE, process.pid.toString());

    this.server.listen(this.port, () => {
      console.log(`[${new Date().toISOString()}] Daemon started: http://localhost:${this.port}`);
    });

    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  stop(): void {
    this.service.shutdown();

    if (this.server.listening) {
      this.server.close();
    }

    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }

    process.exit(0);
  }

  private broadcast(event: PomodoroEvent): void {
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
    const deadClientIds: string[] = [];

    for (const [clientId, clientInfo] of this.sseClients) {
      try {
        if (!clientInfo.response.writableEnded) {
          clientInfo.response.write(message);
        } else {
          deadClientIds.push(clientId);
        }
      } catch {
        deadClientIds.push(clientId);
      }
    }

    for (const clientId of deadClientIds) {
      this.sseClients.delete(clientId);
    }
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);
    const method = req.method ?? 'GET';
    const origin = req.headers.origin;

    res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(origin));
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname === '/events') {
      this.handleSse(req, res);
      return;
    }

    try {
      switch (url.pathname) {
        case '/state':
          if (method !== 'GET') {
            this.sendJson(res, 405, { error: 'Method Not Allowed' });
            return;
          }
          this.sendJson(res, 200, this.service.getSnapshot());
          return;
        case '/settings':
          if (method === 'GET') {
            this.sendJson(res, 200, this.service.getState().settings);
            return;
          }
          if (method === 'PUT') {
            this.parseBody(req)
              .then((body) => {
                const command: Command = { type: 'updateSettings', settings: body as Record<string, unknown> };
                this.service.handleCommand(command);
                const snapshot = this.service.getSnapshot();
                this.sendJson(res, 200, { success: true, snapshot });
              })
              .catch((err) => this.sendJson(res, 400, { error: (err as Error).message }));
            return;
          }
          this.sendJson(res, 405, { error: 'Method Not Allowed' });
          return;
        case '/commands':
          if (method !== 'POST') {
            this.sendJson(res, 405, { error: 'Method Not Allowed' });
            return;
          }
          this.parseBody(req)
            .then((body) => {
              if (!isCommand(body)) {
                this.sendJson(res, 400, { error: 'Invalid command' });
                return;
              }
              const command = body as Command;
              try {
                this.service.handleCommand(command);
                const snapshot = this.service.getSnapshot();
                this.sendJson(res, 200, { success: true, snapshot });
              } catch (error) {
                this.sendJson(res, 400, { error: (error as Error).message });
              }
            })
            .catch((err) => this.sendJson(res, 400, { error: (err as Error).message }));
          return;
        case '/logs': {
          if (method !== 'GET') {
            this.sendJson(res, 405, { error: 'Method Not Allowed' });
            return;
          }
          const limitParam = url.searchParams.get('limit');
          const limit = limitParam ? parseInt(limitParam, 10) : 50;
          if (Number.isNaN(limit) || limit < 1 || limit > 1000) {
            this.sendJson(res, 400, { error: 'limit must be between 1 and 1000' });
            return;
          }
          this.sendJson(res, 200, this.service.getLogs(limit));
          return;
        }
        case '/stats': {
          if (method !== 'GET') {
            this.sendJson(res, 405, { error: 'Method Not Allowed' });
            return;
          }
          const daysParam = url.searchParams.get('days');
          const days = daysParam ? parseInt(daysParam, 10) : 7;
          if (Number.isNaN(days) || days < 1 || days > 365) {
            this.sendJson(res, 400, { error: 'days must be between 1 and 365' });
            return;
          }
          this.sendJson(res, 200, this.service.getStatistics(days));
          return;
        }
        case '/health':
          this.sendJson(res, 200, { status: 'ok', uptime: process.uptime() });
          return;
        default:
          this.sendJson(res, 404, { error: 'Not Found' });
          return;
      }
    } catch (error) {
      this.sendJson(res, 500, { error: (error as Error).message });
    }
  }

  private handleSse(req: http.IncomingMessage, res: http.ServerResponse): void {
    const origin = req.headers.origin;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': getCorsOrigin(origin),
      Vary: 'Origin',
    });

    const clientId = `sse-${++this.clientIdCounter}`;
    const clientInfo: SSEClient = {
      id: clientId,
      response: res,
      connectedAt: new Date(),
      remoteAddress: req.socket.remoteAddress,
    };
    this.sseClients.set(clientId, clientInfo);

    const snapshot = this.service.getSnapshot();
    const initialEvent: PomodoroEvent = {
      type: 'stateUpdated',
      at: snapshot.serverTime,
      stateVersion: snapshot.state.version,
      state: snapshot.state,
    };
    res.write(`event: stateUpdated\ndata: ${JSON.stringify(initialEvent)}\n\n`);

    req.on('close', () => {
      this.sseClients.delete(clientId);
    });
  }

  private async parseBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      let bodySize = 0;

      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('Request timeout'));
      }, 30000);

      req.on('data', (chunk: Buffer | string) => {
        const chunkSize = typeof chunk === 'string' ? chunk.length : chunk.byteLength;
        bodySize += chunkSize;

        if (bodySize > MAX_BODY_SIZE) {
          clearTimeout(timeout);
          req.destroy();
          reject(new Error('Request body too large'));
          return;
        }

        body += chunk;
      });

      req.on('end', () => {
        clearTimeout(timeout);
        const trimmed = body.trim();
        if (!trimmed) {
          resolve({});
          return;
        }
        try {
          resolve(JSON.parse(trimmed));
        } catch {
          reject(new Error('Invalid JSON body'));
        }
      });

      req.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private sendJson(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }
}

const port = parseInt(process.argv[2] ?? DEFAULT_PORT.toString(), 10);
const server = new PomodoroServer(port);
server.start();
