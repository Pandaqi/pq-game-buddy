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

  test('a template link names one bundled template', () => {
    expect(parseRoute('#/template/catan')).toEqual({ name: 'template', id: 'catan' });
    expect(routeTo({ name: 'template', id: 'bidding-blocks' })).toBe('#/template/bidding-blocks');
  });

  test('settings and selftest', () => {
    expect(parseRoute('#/settings')).toEqual({ name: 'settings' });
    expect(parseRoute('#/selftest')).toEqual({ name: 'selftest' });
  });

  test('unknown paths become a 404', () => {
    expect(parseRoute('#/nope/deep')).toEqual({ name: 'notfound', path: 'nope/deep' });
  });

  test('encoded and malformed segments do not throw', () => {
    expect(parseRoute('#/template/a%20b')).toEqual({ name: 'template', id: 'a b' });
    expect(parseRoute('#/template/%')).toEqual({ name: 'template', id: '%' });
    expect(parseRoute('#/display/%')).toEqual({ name: 'display', instanceId: '%' });
  });

  test('round trips through routeTo', () => {
    expect(routeTo({ name: 'home' })).toBe('#/');
    expect(routeTo({ name: 'session', tab: 'timer' })).toBe('#/play/timer');
    expect(routeTo({ name: 'settings' })).toBe('#/settings');
    expect(routeTo({ name: 'template', id: 'catan' })).toBe('#/template/catan');
  });
});
