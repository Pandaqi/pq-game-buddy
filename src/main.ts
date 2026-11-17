import './core/styles/tokens.css';
import './core/styles/base.css';

import { mount } from 'svelte';
import App from './App.svelte';
import { store } from './core/session-store.svelte';
import { settings } from './core/settings.svelte';

settings.load();
store.init();

const target = document.getElementById('app');
if (target) {
  mount(App, { target });
}
