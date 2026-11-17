import { describe, expect, test } from 'bun:test';
import { manifest } from '../src/core/manifest.generated';
import { defaultsFor } from '../src/core/template/schema';
import { svelteClient } from './helpers/svelte-client';
import { testContext } from './helpers/test-context';

describe('tool components', () => {
  for (const module of manifest) {
    test(`${module.id} mounts with its defaults`, async () => {
      const { mount, unmount, tick } = await svelteClient();
      const ctx = testContext();
      const instance = module.create(ctx, defaultsFor(module.preset));
      const target = document.createElement('div');
      document.body.appendChild(target);

      const app = mount(module.component, { target, props: { ctx, instance } });
      await tick();

      expect(target.childElementCount).toBeGreaterThan(0);
      unmount(app);
      target.remove();
    });

    test(`${module.id} mounts from a template state`, async () => {
      const { mount, unmount, tick } = await svelteClient();
      const ctx = testContext();
      const instance = module.create(ctx, defaultsFor(module.preset));
      instance.load(instance.state());
      const target = document.createElement('div');
      document.body.appendChild(target);
      const app = mount(module.component, { target, props: { ctx, instance } });
      await tick();
      expect(target.textContent ?? '').not.toBe('');
      unmount(app);
      target.remove();
    });

    test(`${module.id} round trips its state`, () => {
      const ctx = testContext();
      const instance = module.create(ctx, defaultsFor(module.preset));
      const snapshot = JSON.parse(JSON.stringify(instance.state())) as Record<string, unknown>;
      instance.load(snapshot);
      expect(JSON.parse(JSON.stringify(instance.state()))).toEqual(snapshot);
      expect(instance.summary().length).toBeGreaterThan(0);
      expect(Object.keys(instance.presetFromState()).length).toBeGreaterThan(0);
    });

    test(`${module.id} ignores junk state`, () => {
      const ctx = testContext();
      const instance = module.create(ctx);
      expect(() => instance.load(null)).not.toThrow();
      expect(() => instance.load('nonsense')).not.toThrow();
      expect(() => instance.load({ unknown: true })).not.toThrow();
    });
  }
});
