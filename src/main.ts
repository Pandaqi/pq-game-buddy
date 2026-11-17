/** Entry point. `data-tool` on <body> marks a single-tool page from the site build. */

import './core/styles/fonts.css';
import './core/styles/tokens.css';
import './core/styles/base.css';
import './core/styles/components.css';

import { mount } from 'svelte';
import App from './App.svelte';
import { startLanguage } from './core/i18n.svelte';
import { store } from './core/session-store.svelte';
import { settings } from './core/settings.svelte';

settings.load();
store.init();

const target = document.getElementById('app');
if (target) {
  const bootTool = document.body.dataset.tool ?? '';
  // Every language, English included, is a chunk: mount once the words are here
  // so the first paint never shows a raw key. The promise settles in a tick or
  // two on a local file and the app is offline either way.
  void startLanguage(settings.values.language).then(() => {
    mount(App, { target, props: { bootTool } });
  });
}

// The build adds the manifest link to hosted pages only, and to tool pages as
// `../manifest.webmanifest`. The single file and the dev shell never see it, so
// neither tries to register a worker that is not there. The worker lives next to
// the manifest, so its scope is the app root even when the page is /tool/.
const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
if (manifestLink && 'serviceWorker' in navigator) {
  const root = new URL('./', manifestLink.href);
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.pathname }).catch(() => {
      /* installed file, private mode or an unsupported browser: the app still works */
    });
  });
}
