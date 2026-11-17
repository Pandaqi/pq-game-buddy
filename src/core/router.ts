/** Hash router: works over file://, deep links restore the session. */

export type Route =
  | { name: 'home' }
  | { name: 'session'; tab?: string }
  | { name: 'settings' }
  | { name: 'selftest' }
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
    case 'settings':
      return { name: 'settings' };
    case 'selftest':
      return { name: 'selftest' };
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
