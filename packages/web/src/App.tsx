import { Timer } from './components/Timer';
import { SettingsProvider } from './contexts/SettingsContext';
import { TimeAwarenessBackground } from './components/TimeAwarenessBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PomodoroProvider } from './contexts/PomodoroContext';

function App() {
  return (
    <ErrorBoundary>
      <PomodoroProvider>
        <SettingsProvider>
          <TimeAwarenessBackground>
            <main className="w-full max-w-md">
              <Timer />

              {/* フッター */}
              <footer
                className="mt-12 text-center text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                <p>Pomodoro Timer</p>
              </footer>
            </main>
          </TimeAwarenessBackground>
        </SettingsProvider>
      </PomodoroProvider>
    </ErrorBoundary>
  );
}

export default App;
