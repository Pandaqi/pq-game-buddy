import './helpers/language';
import { describe, expect, test } from 'bun:test';
import { parseTheme, themeCss, themeIsEmpty, themeToText } from '../src/core/theme';

describe('theme files', () => {
  test('reads names, light values, dark values and chrome flags', () => {
    const theme = parseTheme(`# my theme
name: Lantern night
paper: #fdf6e3
ink: #2b2118
dark-paper: #14100c
radius: 6px
font-body: Raleway, system-ui, sans-serif
hide-chrome: sound, mute
`);
    expect(theme.name).toBe('Lantern night');
    expect(theme.values).toEqual({
      paper: '#fdf6e3',
      ink: '#2b2118',
      radius: '6px',
      'font-body': 'Raleway, system-ui, sans-serif',
    });
    expect(theme.dark).toEqual({ paper: '#14100c' });
    expect(theme.hide).toEqual(['sound', 'mute']);
    expect(theme.diagnostics).toEqual([]);
  });

  test('bad values are reported with their line and left out', () => {
    const theme = parseTheme(['paper: #fdf6e3', 'ink: red; position: fixed', 'radius: fat'].join('\n'));
    expect(theme.values).toEqual({ paper: '#fdf6e3' });
    const errors = theme.diagnostics.filter((item) => item.severity === 'error');
    expect(errors.map((item) => item.line)).toEqual([2, 3]);
  });

  test('unknown keys and unknown chrome warn instead of failing', () => {
    const theme = parseTheme('wobble: 3\nhide-chrome: cheese\npaper: #fff');
    expect(theme.values).toEqual({ paper: '#fff' });
    expect(theme.diagnostics).toHaveLength(2);
    expect(theme.diagnostics.every((item) => item.severity === 'warning')).toBe(true);
  });

  test('a line without a separator is an error and comments are ignored', () => {
    const theme = parseTheme('# comment\npaper #fff\n');
    expect(theme.diagnostics).toHaveLength(1);
    expect(theme.diagnostics[0].severity).toBe('error');
    expect(themeIsEmpty(theme)).toBe(true);
  });

  test('css puts light values on the root and dark ones behind both switches', () => {
    const css = themeCss(parseTheme('paper: #fdf6e3\ndark-paper: #101010'));
    expect(css).toContain(':root{--paper: #fdf6e3;}');
    expect(css).toContain("[data-theme='dark']");
    expect(css).toContain('prefers-color-scheme: dark');
  });

  test('an empty theme writes no css', () => {
    expect(themeCss(parseTheme(''))).toBe('');
  });

  test('text survives a round trip', () => {
    const first = parseTheme('name: Wood\npaper: #fdf6e3\ndark-ink: #fff\nfam-time: #9c6000\nhide-chrome: mute\n');
    const second = parseTheme(themeToText(first));
    expect(second.name).toBe(first.name);
    expect(second.values).toEqual(first.values);
    expect(second.dark).toEqual(first.dark);
    expect(second.hide).toEqual(first.hide);
    expect(second.diagnostics).toEqual([]);
  });
});

describe('chrome hiding', () => {
  test('settings cannot be hidden, because it is how a theme is removed', () => {
    const theme = parseTheme('hide-chrome: settings, sound');
    expect(theme.hide).toEqual(['sound']);
    expect(
      theme.diagnostics.some(
        (item) => item.severity === 'warning' && item.message.includes('Settings cannot be hidden'),
      ),
    ).toBe(true);
  });
});
