/**
 * Test preload: compile `.svelte` and `.svelte.ts` for the client with styles
 * injected, then give tests a DOM. bun-plugin-svelte is still used for the dev
 * server and the production build; its virtual CSS modules do not survive the
 * test runner's module graph.
 */

import { plugin } from 'bun';
import { compile, compileModule } from 'svelte/compiler';

const transpiler = new Bun.Transpiler({ loader: 'ts', target: 'browser' });

plugin({
  name: 'pqgb-svelte-tests',
  setup(build) {
    build.onLoad({ filter: /\.svelte$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const { js } = compile(source, {
        filename: args.path,
        generate: 'client',
        css: 'injected',
        dev: false,
        runes: true,
        hmr: false,
      });
      return { contents: js.code, loader: 'js' };
    });

    build.onLoad({ filter: /\.svelte\.ts$/ }, async (args) => {
      const raw = await Bun.file(args.path).text();
      const stripped = transpiler.transformSync(raw);
      const { js } = compileModule(stripped, {
        filename: args.path,
        generate: 'client',
        dev: false,
      });
      return { contents: js.code, loader: 'js' };
    });
  },
});

if (typeof globalThis.document === 'undefined') {
  const { GlobalRegistrator } = await import('@happy-dom/global-registrator');
  GlobalRegistrator.register({ url: 'http://localhost/' });
}
