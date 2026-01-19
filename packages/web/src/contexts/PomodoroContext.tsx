import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient } from '@pomodoro/client';
import type {
  PomodoroState,
  PomodoroEvent,
  Command,
  PomodoroProgram,
  ProgramSession,
} from '@pomodoro/protocol';
import { createInitialState } from '@pomodoro/protocol';
import { getDaemonUrl } from '../utils/daemon';
import { getLocalService } from '../local/LocalService';
import { sendNotification } from '../utils/notifications';
import { playSound } from '../utils/sound';

interface PomodoroActions {
  start: (task?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
  skip: () => Promise<void>;
  updateSettings: (settings: Partial<PomodoroState['settings']>) => Promise<void>;
  startProgram: (program: Omit<PomodoroProgram, 'id' | 'createdAt'>) => Promise<void>;
  stopProgram: () => Promise<void>;
  modifyProgram: (sessions: ProgramSession[], appendMode?: boolean) => Promise<void>;
}

interface PomodoroContextValue {
  state: PomodoroState;
  connected: boolean;
  error: string | null;
  daemonUrl?: string;
  serverOffsetMs: number;
  actions: PomodoroActions;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const daemonUrl = useMemo(() => getDaemonUrl(), []);
  const localService = useMemo(() => (daemonUrl ? null : getLocalService()), [daemonUrl]);
  const [state, setState] = useState<PomodoroState>(() => (
    localService?.getState() ?? createInitialState()
  ));
  const [connected, setConnected] = useState(() => Boolean(localService));
  const [error, setError] = useState<string | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  const client = useMemo(() => {
    if (!daemonUrl) return null;
    return createClient({ baseUrl: daemonUrl });
  }, [daemonUrl]);

  const handlePomodoroEvent = useCallback((event: PomodoroEvent) => {
    setState(event.state);
    setServerOffsetMs(Date.parse(event.at) - Date.now());

    if (event.type === 'phaseCompleted') {
      const manualSkip = Boolean(event.data?.manualSkip);
      if (!manualSkip) {
        const mode =
          event.data?.mode === 'work' || event.data?.mode === 'shortBreak' || event.data?.mode === 'longBreak'
            ? (event.data.mode as PomodoroState['mode'])
            : event.data?.phase === 'work'
              ? 'work'
              : 'shortBreak';
        sendNotification(mode);
        if (event.state.settings.sound.enabled) {
          playSound(event.state.settings.sound.soundType, event.state.settings.sound.volume);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (daemonUrl && client) {
      client.getState()
        .then((snapshot) => {
          setState(snapshot.state);
          setServerOffsetMs(Date.parse(snapshot.serverTime) - Date.now());
        })
        .catch(() => {
          // ignore
        });

      let eventSource: EventSource | null = null;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
      let reconnectAttempts = 0;
      const MAX_RECONNECT_ATTEMPTS = 5;
      const BASE_RECONNECT_DELAY = 1000;

      const connect = () => {
        eventSource = new EventSource(`${daemonUrl}/events`);

        eventSource.onopen = () => {
          setConnected(true);
          setError(null);
          reconnectAttempts = 0;
        };

        eventSource.onerror = () => {
          setConnected(false);
          eventSource?.close();
          eventSource = null;

          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
            reconnectAttempts += 1;
            setError(`Connection error. Reconnecting in ${Math.ceil(delay / 1000)}s...`);
            reconnectTimeout = setTimeout(connect, delay);
          } else {
            setError('Unable to reconnect. Reload the page.');
          }
        };

        const handleEvent = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data) as PomodoroEvent;
            handlePomodoroEvent(data);
          } catch {
            // ignore
          }
        };

        eventSource.addEventListener('stateUpdated', handleEvent);
        eventSource.addEventListener('settingsUpdated', handleEvent);
        eventSource.addEventListener('programUpdated', handleEvent);
        eventSource.addEventListener('phaseCompleted', handleEvent);
        eventSource.addEventListener('programCompleted', handleEvent);
      };

      connect();

      return () => {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        eventSource?.close();
        setConnected(false);
      };
    }

    const service = localService;
    if (!service) return;

    const unsubscribe = service.on('event', (event) => {
      handlePomodoroEvent(event);
    });

    return () => {
      unsubscribe();
    };
  }, [daemonUrl, client, handlePomodoroEvent, localService]);

  const runRemoteCommand = async (command: Command) => {
    if (!client) return;
    try {
      const snapshot = await client.sendCommand(command);
      setState(snapshot.state);
      setServerOffsetMs(Date.parse(snapshot.serverTime) - Date.now());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const actions: PomodoroActions = {
    start: async (task?: string) => {
      if (client) {
        await runRemoteCommand({ type: 'start', task });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'start', task });
        setState(next);
      }
    },
    pause: async () => {
      if (client) {
        await runRemoteCommand({ type: 'pause' });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'pause' });
        setState(next);
      }
    },
    resume: async () => {
      if (client) {
        await runRemoteCommand({ type: 'resume' });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'resume' });
        setState(next);
      }
    },
    reset: async () => {
      if (client) {
        await runRemoteCommand({ type: 'reset' });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'reset' });
        setState(next);
      }
    },
    skip: async () => {
      if (client) {
        await runRemoteCommand({ type: 'skip' });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'skip' });
        setState(next);
      }
    },
    updateSettings: async (settings) => {
      if (client) {
        await runRemoteCommand({ type: 'updateSettings', settings });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'updateSettings', settings });
        setState(next);
      }
    },
    startProgram: async (program) => {
      if (client) {
        await runRemoteCommand({ type: 'startProgram', program });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'startProgram', program });
        setState(next);
      }
    },
    stopProgram: async () => {
      if (client) {
        await runRemoteCommand({ type: 'stopProgram' });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'stopProgram' });
        setState(next);
      }
    },
    modifyProgram: async (sessions, appendMode = false) => {
      if (client) {
        await runRemoteCommand({ type: 'modifyProgram', sessions, appendMode });
        return;
      }
      const service = localService;
      if (service) {
        const next = service.handleCommand({ type: 'modifyProgram', sessions, appendMode });
        setState(next);
      }
    },
  };

  return (
    <PomodoroContext.Provider
      value={{
        state,
        connected,
        error,
        daemonUrl,
        serverOffsetMs,
        actions,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro(): PomodoroContextValue {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoro must be used within PomodoroProvider');
  }
  return context;
}
