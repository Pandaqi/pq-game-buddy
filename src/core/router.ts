/** Hash router: works over file://, deep links restore the session. */

/**
 * A hash is user input: `#/template/%` makes `decodeURIComponent` throw, and a typo in a
 * link should land the router on the same route with the text as written, not on a crash.
 */
function decodeSegment(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export type Route =
  | { name: 'home' }
  | { name: 'session'; tab?: string }
  | { name: 'settings' }
  | { name: 'selftest' }
  | { name: 'log' }
  | { name: 'templates' }
  | { name: 'editor' }
  | { name: 'template'; id: string }
  | { name: 'display'; instanceId: string }
  | { name: 'import'; payload: string }
  | { name: 'toolfile'; payload: string }
  | { name: 'notfound'; path: string };

export function parseRoute(hash: string): Route {
  const raw = String(hash ?? '').replace(/^#/, '');
  const path = raw.replace(/^\/+/, '');
  if (!path) return { name: 'home' };
  const [head, ...rest] = path.split('/');
  switch (head) {
    case 'play':
      return { name: 'session', tab: rest[0] || undefined };
    case 'tool':
      return { name: 'session', tab: rest[0] || undefined };
    // `#/toolfile/<payload>` is a shared tool file: decoded, shown, then installed.
    case 'toolfile':
      return { name: 'toolfile', payload: rest.join('/') };
    case 'settings':
      return { name: 'settings' };
    case 'selftest':
      return { name: 'selftest' };
    case 'log':
      return { name: 'log' };
    case 'templates':
      return { name: 'templates' };
    case 'editor':
      return { name: 'editor' };
    // A bundled template by id, so a website can link to one game: the text comes from
    // the shelf that holds it, not from the URL.
    case 'template':
      return { name: 'template', id: decodeSegment(rest[0] || '') };
    case 'display':
      return { name: 'display', instanceId: decodeSegment(rest.join('/')) };
    case 'import':
      return { name: 'import', payload: rest.join('/') };
    case 'home':
      return { name: 'home' };
    default:
      return { name: 'notfound', path };
  }
}

export function routeTo(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'session':
      return route.tab ? `#/play/${route.tab}` : '#/play';
    case 'settings':
      return '#/settings';
    case 'selftest':
      return '#/selftest';
    case 'log':
      return '#/log';
    case 'templates':
      return '#/templates';
    case 'editor':
      return '#/editor';
    case 'template':
      return `#/template/${encodeURIComponent(route.id)}`;
    case 'display':
      return `#/display/${encodeURIComponent(route.instanceId)}`;
    case 'import':
      return `#/import/${route.payload}`;
    case 'toolfile':
      return `#/toolfile/${route.payload}`;
    default:
      return '#/';
  }
}

export function navigate(route: Route): void {
  if (typeof location === 'undefined') return;
  const target = routeTo(route);
  if (location.hash === target) return;
  location.hash = target;
}
