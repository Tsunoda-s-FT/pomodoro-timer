import type {
  Command,
  PomodoroEvent,
  StateSnapshot,
  AppSettings,
} from '@pomodoro/protocol';

export interface PomodoroClient {
  getState(): Promise<StateSnapshot>;
  getSettings(): Promise<AppSettings>;
  sendCommand(command: Command): Promise<StateSnapshot>;
  getLogs(limit?: number): Promise<unknown>;
  getStats(days?: number): Promise<unknown>;
  subscribe(handler: (event: PomodoroEvent) => void): () => void;
}

export interface PomodoroClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

const EVENT_TYPES: PomodoroEvent['type'][] = [
  'stateUpdated',
  'settingsUpdated',
  'programUpdated',
  'phaseCompleted',
  'programCompleted',
];

export function createClient(options: PomodoroClientOptions): PomodoroClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const fetchImpl = options.fetch ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }

    return (await response.json()) as T;
  }

  return {
    async getState(): Promise<StateSnapshot> {
      return request<StateSnapshot>('/state');
    },

    async getSettings(): Promise<AppSettings> {
      return request<AppSettings>('/settings');
    },

    async sendCommand(command: Command): Promise<StateSnapshot> {
      const result = await request<{ success: boolean; snapshot: StateSnapshot }>('/commands', {
        method: 'POST',
        body: JSON.stringify(command),
      });
      return result.snapshot;
    },

    async getLogs(limit: number = 50): Promise<unknown> {
      return request(`/logs?limit=${limit}`);
    },

    async getStats(days: number = 7): Promise<unknown> {
      return request(`/stats?days=${days}`);
    },

    subscribe(handler: (event: PomodoroEvent) => void): () => void {
      if (typeof EventSource === 'undefined') {
        throw new Error('EventSource is not available in this environment');
      }

      const eventSource = new EventSource(`${baseUrl}/events`);
      const listeners: Array<() => void> = [];

      for (const type of EVENT_TYPES) {
        const listener = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data) as PomodoroEvent;
            handler(data);
          } catch {
            // ignore
          }
        };
        eventSource.addEventListener(type, listener);
        listeners.push(() => eventSource.removeEventListener(type, listener));
      }

      const close = () => {
        for (const remove of listeners) {
          remove();
        }
        eventSource.close();
      };

      return close;
    },
  };
}
