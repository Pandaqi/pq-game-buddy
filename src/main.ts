/** Entry point. `data-tool` or `data-template` on <body> marks a page from the site build. */

import './core/styles/fonts.css';
import './core/styles/tokens.css';
import './core/styles/base.css';
import './core/styles/components.css';
import './core/styles/cutouts.css';
import './ui/home-art.css';

import { mount } from 'svelte';
import App from './App.svelte';
import { BRAND_MARK } from './core/ui/brand-mark';
import { startLanguage } from './core/i18n.svelte';
import { store } from './core/session-store.svelte';
import { settings } from './core/settings.svelte';

settings.load();
store.init();

// A tab icon needs somewhere to live, and only the hosted build writes one into the
// page (public/ is not a URL the dev shell or a copied file has). Those two borrow the
// badge that is already in the bundle, so the tab is never blank.
if (!document.querySelector('link[rel="icon"]')) {
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/webp';
  icon.href = BRAND_MARK;
  document.head.append(icon);
}

const target = document.getElementById('app');
if (target) {
  const bootTool = document.body.dataset.tool ?? '';
  const bootTemplate = document.body.dataset.template ?? '';
  // Every language, English included, is a chunk: mount once the words are here
  // so the first paint never shows a raw key. The promise settles in a tick or
  // two on a local file and the app is offline either way.
  void startLanguage(settings.values.language).then(() => {
    mount(App, { target, props: { bootTool, bootTemplate } });
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
