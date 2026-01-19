import { describe, it, expect } from 'vitest';
import { applyCommand, advanceState } from '../stateMachine';
import { createInitialState } from '../../../protocol/src/index';

describe('program start', () => {
  it('skips zero-length work phase and moves to break', () => {
    const nowMs = Date.parse('2025-01-01T00:00:00.000Z');
    const initial = createInitialState();
    const { state: started } = applyCommand(
      initial,
      {
        type: 'startProgram',
        program: {
          name: 'Zero work',
          sessions: [{ workMinutes: 0, breakMinutes: 5 }],
          repeat: false,
        },
      },
      nowMs
    );

    const { state: advanced } = advanceState(started, nowMs);

    expect(advanced.program?.run.phase).toBe('break');
    expect(advanced.mode).toBe('shortBreak');
    expect(advanced.status).toBe('running');
    expect(advanced.timeLeftSeconds).toBe(5 * 60);
  });
});
