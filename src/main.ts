/** Entry point. `data-tool` on <body> marks a single-tool page from the site build. */

import './core/styles/fonts.css';
import './core/styles/tokens.css';
import './core/styles/base.css';
import './core/styles/components.css';

import { mount } from 'svelte';
import App from './App.svelte';
import { store } from './core/session-store.svelte';
import { settings } from './core/settings.svelte';

settings.load();
store.init();

const target = document.getElementById('app');
if (target) {
  const bootTool = document.body.dataset.tool ?? '';
  mount(App, { target, props: { bootTool } });
}
