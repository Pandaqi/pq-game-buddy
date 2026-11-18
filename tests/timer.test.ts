import { describe, expect, test } from 'bun:test';
import {
  applyIncrement,
  elapsedAt,
  flipClock,
  newClock,
  pauseClock,
  pendingMark,
  phasesFromPairs,
  remainingAt,
  resetClock,
  restoreClock,
  shiftDuration,
  startClock,
  toggleClock,
  type ClockState,
} from '../src/tools/timer/logic';

const WALL = 1_700_000_000_000;

function running(duration = 60000): ClockState {
  const clock = newClock({ id: 't1', duration });
  startClock(clock, 1000, WALL);
  return clock;
}

describe('timer arithmetic', () => {
  test('countdown counts down from the duration', () => {
    const clock = running(60000);
    expect(remainingAt(clock, 1000, WALL)).toBe(60000);
    expect(remainingAt(clock, 16000, WALL + 15000)).toBe(45000);
  });

  test('pause banks elapsed time and resume continues from it', () => {
    const clock = running(60000);
    pauseClock(clock, 11000, WALL + 10000);
    expect(clock.running).toBe(false);
    expect(elapsedAt(clock, 999999, WALL + 999999)).toBe(10000);
    startClock(clock, 20000, WALL + 20000);
    expect(remainingAt(clock, 25000, WALL + 25000)).toBe(45000);
  });

  test('monotonic time is used when the wall clock is behind', () => {
    const clock = running(60000);
    expect(elapsedAt(clock, 31000, WALL + 5000)).toBe(30000);
  });

  test('wall clock wins after a sleep or reload', () => {
    const clock = running(60000);
    // Monotonic origin restarted after a reload; wall time kept going.
    expect(elapsedAt(clock, 5, WALL + 45000)).toBe(45000);
  });

  test('never reports negative elapsed time', () => {
    const clock = running(60000);
    expect(elapsedAt(clock, 0, WALL - 5000)).toBe(0);
  });

  test('delay gives each run a grace period', () => {
    const clock = newClock({ id: 't1', duration: 60000, delay: 5000 });
    startClock(clock, 1000, WALL);
    expect(elapsedAt(clock, 4000, WALL + 3000)).toBe(0);
    expect(elapsedAt(clock, 11000, WALL + 10000)).toBe(5000);
  });

  test('increment adds time at handover', () => {
    const clock = running(60000);
    clock.elapsed = 20000;
    clock.running = false;
    applyIncrement(clock, 3000);
    expect(clock.elapsed).toBe(17000);
  });

  test('flip resets and restarts', () => {
    const clock = running(60000);
    clock.elapsed = 30000;
    flipClock(clock, 40000, WALL + 39000);
    expect(clock.elapsed).toBe(0);
    expect(clock.running).toBe(true);
    expect(remainingAt(clock, 40000, WALL + 39000)).toBe(60000);
  });

  test('toggle starts and pauses', () => {
    const clock = newClock({ id: 't1', duration: 60000 });
    expect(toggleClock(clock, 1000, WALL)).toBe(true);
    expect(toggleClock(clock, 5000, WALL + 4000)).toBe(false);
    expect(clock.elapsed).toBe(4000);
  });

  test('reset clears everything', () => {
    const clock = running(60000);
    clock.elapsed = 12000;
    clock.laps = [1, 2, 3];
    resetClock(clock);
    expect(clock.elapsed).toBe(0);
    expect(clock.running).toBe(false);
    expect(clock.laps).toEqual([]);
  });

  test('plus and minus thirty seconds clamps to the minimum', () => {
    const clock = running(20000);
    shiftDuration(clock, 30000);
    expect(clock.duration).toBe(50000);
    shiftDuration(clock, -120000);
    expect(clock.duration).toBe(1000);
  });

  test('threshold marks fire once each', () => {
    const clock = newClock({ id: 't1', duration: 120000 });
    expect(pendingMark(clock, 61000)).toBeNull();
    expect(pendingMark(clock, 59000)).toBe('m60');
    clock.marks.m60 = true;
    expect(pendingMark(clock, 55000)).toBeNull();
    expect(pendingMark(clock, 29000)).toBe('m30');
  });

  test('restore tolerates junk and keeps run state', () => {
    const restored = restoreClock({ duration: 90000, running: true, startWall: WALL, startMono: 10, name: 7 }, 0);
    expect(restored.duration).toBe(90000);
    expect(restored.running).toBe(true);
    // A clock with no usable name becomes a generated seat, said in any language.
    expect(restored.name).toBe('');
    expect(restored.seat).toBe(1);
    const junk = restoreClock('nonsense', 3);
    expect(junk.id).toBe('t4');
    expect(junk.duration).toBe(300000);
  });

  test('phases come from name=value pairs with units', () => {
    const phases = phasesFromPairs({ Setup: '5m', Play: '25m', Bad: 'soon' });
    expect(phases).toEqual([
      { name: 'Setup', duration: 300000 },
      { name: 'Play', duration: 1500000 },
    ]);
  });
});
