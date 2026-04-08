import { describe, expect, it } from 'vitest';
import { todayKey, weekKey, formatDuration } from './time';

describe('time utilities', () => {
  it('formats today key in YYYY-MM-DD', () => {
    const key = todayKey(new Date('2025-01-02T12:00:00Z'));
    expect(key).toBe('2025-01-02');
  });

  it('derives ISO week keys', () => {
    const key = weekKey(new Date('2025-01-02T12:00:00Z'));
    expect(key.startsWith('2025-W')).toBe(true);
  });

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65_000)).toBe('01:05');
    expect(formatDuration(3_600_000)).toBe('01:00:00');
  });
});
