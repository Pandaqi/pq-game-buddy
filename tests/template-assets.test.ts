import { beforeEach, describe, expect, test } from 'bun:test';
import {
  assetMark,
  assetName,
  isImageFile,
  isTemplateFile,
  isThemeFile,
  listAssets,
  saveAsset,
} from '../src/core/template/assets';
import { KEYS, writeJson } from '../src/core/storage';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

beforeEach(() => {
  writeJson(KEYS.templateAssets, []);
});

describe('template assets', () => {
  test('names lose their extension, icon suffix and punctuation', () => {
    expect(assetName('Catan.Icon.svg')).toBe('catan');
    expect(assetName('my game.png')).toBe('my-game');
    expect(assetName('  --Odd__Name!!.WEBP')).toBe('odd__name');
  });

  test('only images and the two template kinds are recognised', () => {
    expect(isImageFile({ type: 'image/svg+xml', name: 'x' })).toBe(true);
    expect(isImageFile({ type: '', name: 'x.jpeg' })).toBe(true);
    expect(isImageFile({ type: 'text/plain', name: 'x.txt' })).toBe(false);
    expect(isTemplateFile('game.gamebuddy')).toBe(true);
    expect(isTemplateFile('session.json')).toBe(false);
    expect(isThemeFile('paper.gamebuddy-theme')).toBe(true);
    expect(isThemeFile('paper.css')).toBe(false);
  });

  test('an image is stored under its name and drawn through an img', () => {
    expect(saveAsset('catan', 'image/png', PNG)).toBe(true);
    expect(assetMark('catan')).toContain('<img');
    expect(assetMark('catan')).toContain(PNG);
    expect(assetMark('missing')).toBe('');
  });

  test('a new image with the same name replaces the old one', () => {
    saveAsset('catan', 'image/png', PNG);
    saveAsset('catan', 'image/png', `${PNG}iVBORw0KGgo=`);
    expect(listAssets()).toHaveLength(1);
  });

  test('non-image data URLs are refused', () => {
    expect(saveAsset('bad', 'image/png', 'data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(saveAsset('bad', 'text/html', PNG)).toBe(false);
    expect(listAssets()).toHaveLength(0);
  });
});
