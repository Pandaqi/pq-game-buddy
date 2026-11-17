import { describe, expect, test } from 'bun:test';
import { parseRoute, routeTo } from '../src/core/router';

describe('router', () => {
  test('home routes', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/home')).toEqual({ name: 'home' });
  });

  test('session and tool routes carry the tab', () => {
    expect(parseRoute('#/play')).toEqual({ name: 'session', tab: undefined });
    expect(parseRoute('#/play/timer')).toEqual({ name: 'session', tab: 'timer' });
    expect(parseRoute('#/tool/dice')).toEqual({ name: 'session', tab: 'dice' });
  });

  test('settings and selftest', () => {
    expect(parseRoute('#/settings')).toEqual({ name: 'settings' });
    expect(parseRoute('#/selftest')).toEqual({ name: 'selftest' });
  });

  test('unknown paths become a 404', () => {
    expect(parseRoute('#/nope/deep')).toEqual({ name: 'notfound', path: 'nope/deep' });
  });

  test('round trips through routeTo', () => {
    expect(routeTo({ name: 'home' })).toBe('#/');
    expect(routeTo({ name: 'session', tab: 'timer' })).toBe('#/play/timer');
    expect(routeTo({ name: 'settings' })).toBe('#/settings');
  });
});
