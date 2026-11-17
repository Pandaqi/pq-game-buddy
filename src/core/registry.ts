/** Tool contract. Core knows nothing about specific tools; tools never import each other. */

import type { Component } from 'svelte';
import type { AudioApi } from './audio';
import type { HapticsApi } from './haptics';
import type { Translate } from './i18n';
import type { Rng } from './rng';
import type { Player } from './session';
import type { PresetSchema, PresetValues } from './template/schema';
import type { Clock } from './ticker';
import type { UndoApi } from './undo';

/** The six primitives, used as the colour identity of a tool's screens. */
export type ToolFamily = 'randomize' | 'time' | 'track' | 'reveal' | 'reference' | 'flow';

/**
 * How much a tool cares about the session's seats: `multi` seats everyone,
 * `one` works for a single player, `none` never reads players at all. The shell
 * uses it to pick the starting seat count and whether the seat strip starts open.
 */
export type SeatScope = 'multi' | 'one' | 'none';

export interface ToolMeta {
  id: string;
  title: string;
  blurb: string;
  /** Which accent the tool's screen borrows. */
  family: ToolFamily;
  /** How the tool uses the session's players. */
  seats: SeatScope;
  /** Inline SVG markup from `core/ui/icons.ts`. Trusted build-time constant. */
  icon: string;
  tags: string[];
}

export interface SessionApi {
  players(): Player[];
  instance<T extends object = Record<string, unknown>>(id: string): ToolInstance<T> | undefined;
  setActivePlayer(id: string): void;
  addPlayer(name: string): void;
  removePlayer(id: string): void;
  renamePlayer(id: string, name: string): void;
}

export interface ToolContext {
  instanceId: string;
  session: SessionApi;
  clock: Clock;
  rng: Rng;
  audio: AudioApi;
  haptics: HapticsApi;
  undo: UndoApi;
  toast(message: string, kind?: 'info' | 'error'): void;
  t: Translate;
}

export interface ToolInstance<TState extends object = Record<string, unknown>> {
  /** Live state. A `$state` proxy in the Svelte build. */
  readonly data: TState;
  /** Plain JSON snapshot for save and undo. */
  state(): TState;
  /** Tolerant restore: missing fields fall back to defaults, never throws. */
  load(state: unknown): void;
  /** Settings back out to a template. */
  presetFromState(): PresetValues;
  /** Named actions for scripts, overlay and keys. */
  commands?: Record<string, (arg?: string) => void>;
  /** Plain-text export of whatever the tool knows. */
  summary(): string;
  /** Final standings for the finish-game flow, best first. */
  results?(): ToolResult[];
  /** Release timers, wake locks and listeners when the session drops this tool. */
  dispose?(): void;
}

export interface ToolResult {
  name: string;
  score?: number;
}

export interface ToolModule<TState extends object = Record<string, unknown>> extends ToolMeta {
  preset: PresetSchema;
  /**
   * The view, in the same chunk as this module: one tool is one request. The shell
   * only ever reaches a tool through `loadTool(id)`, so nothing else is downloaded.
   */
  component: Component<{ ctx: ToolContext; instance: ToolInstance<TState> }>;
  create(ctx: ToolContext, values?: PresetValues): ToolInstance<TState>;
}

/**
 * Registry storage. Each tool keeps its own concrete state and actions, so the
 * shell holds the loosest shape it can while views stay typed per tool.
 */
export interface AnyToolModule extends ToolMeta {
  preset: PresetSchema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(ctx: ToolContext, values?: PresetValues): ToolInstance<any>;
}
