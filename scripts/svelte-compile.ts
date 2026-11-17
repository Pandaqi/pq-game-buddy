/**
 * The one Svelte compile, for the dev server, the build and the tests: client
 * output with styles injected, so a component's CSS travels inside its own chunk
 * instead of being hoisted into one stylesheet the first visit has to pay for.
 * The dev server loads this file as a plugin, which is why dev and production
 * deliver styles the same way. Bun's plugin API does not say which mode it is
 * in, so `dev` is read from NODE_ENV: `bun run dev` sets development, the build
 * and the tests leave it unset and get production output.
 */

import type { BunPlugin } from 'bun';
import { compile, compileModule } from 'svelte/compiler';

export function svelteCompile(options: { dev?: boolean } = {}): BunPlugin {
  const dev = options.dev ?? process.env.NODE_ENV === 'development';
  const transpiler = new Bun.Transpiler({ loader: 'ts', target: 'browser' });

  return {
    name: 'pqgb-svelte',
    setup(build) {
      build.onLoad({ filter: /\.svelte$/ }, async (args) => {
        const source = await Bun.file(args.path).text();
        const { js } = compile(source, {
          filename: args.path,
          generate: 'client',
          css: 'injected',
          dev,
          runes: true,
        });
        return { contents: js.code, loader: 'js' };
      });

      // `.svelte.ts` modules hold state and actions; they never have a style block.
      build.onLoad({ filter: /\.svelte\.ts$/ }, async (args) => {
        const raw = await Bun.file(args.path).text();
        const stripped = transpiler.transformSync(raw);
        const { js } = compileModule(stripped, {
          filename: args.path,
          generate: 'client',
          dev,
        });
        return { contents: js.code, loader: 'js' };
      });
    },
  };
}

/** Entry point for `[serve.static] plugins` in bunfig.toml. */
export default svelteCompile();
