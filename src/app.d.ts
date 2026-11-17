declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component<Record<string, unknown>>;
  export default component;
}

declare module '*.gamebuddy' {
  const text: string;
  export default text;
}
