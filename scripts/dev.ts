/**
 * Dev server: Bun serves index.html with HMR, compiling Svelte with the same
 * plugin as the build (`[serve.static] plugins` in bunfig.toml).
 */

import { join } from 'node:path';

const root = join(import.meta.dir, '..');

const proc = Bun.spawn(['bun', './index.html'], {
  cwd: root,
  stdio: ['inherit', 'inherit', 'inherit'],
  env: { ...process.env, NODE_ENV: 'development' },
});

const code = await proc.exited;
process.exit(code);
