/** Small DOM helpers: announcements and focus. No virtual DOM, no templates. */

let liveRegion: HTMLElement | null = null;

/** Announce a message to screen readers. Never called on a timer tick. */
export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'pqgb-live';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = '';
  liveRegion.textContent = message;
}

export function focusElement(element: Element | null | undefined): void {
  if (!element || !(element instanceof HTMLElement)) return;
  element.focus();
}

/** Commit a change-only input when the user presses Enter. */
export function commitOnEnter(event: KeyboardEvent): void {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  (event.currentTarget as HTMLElement | null)?.blur();
}

/** True when a keystroke belongs to a text field, so shortcuts stay quiet. */
export function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Basic focus trap for sheets: returns a teardown. */
export function trapFocus(root: HTMLElement | null): () => void {
  if (!root) return () => undefined;
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const handler = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  root.addEventListener('keydown', handler);
  return () => root.removeEventListener('keydown', handler);
}
