import { describe, it, expect } from 'vitest';
import { validateProgram } from '../index';

describe('validateProgram', () => {
  it('rejects repeat programs with zero total duration', () => {
    expect(() =>
      validateProgram({
        name: 'Zero repeat',
        sessions: [{ workMinutes: 0, breakMinutes: 0 }],
        repeat: true,
      })
    ).toThrow('Repeatable programs must have a positive total duration');
  });

  it('allows non-repeat programs with zero total duration', () => {
    expect(() =>
      validateProgram({
        name: 'Zero once',
        sessions: [{ workMinutes: 0, breakMinutes: 0 }],
        repeat: false,
      })
    ).not.toThrow();
  });
});
