/**
 * Runtime mirror of the session for views. The plain session object is the
 * source of truth for persistence; each tool instance holds its own live state.
 */

import { audio } from './audio';
import { haptics } from './haptics';
import { t } from './i18n.svelte';
import type { AnyToolModule, SessionApi, ToolContext, ToolInstance } from './registry';
import { hasTool, loadTool } from './tools.generated';
import { createRng } from './rng';
import type { InstanceRecord, Player, Session } from './session';
import { makePlayers, newSessionId, nextPlayerId, PLAYER_COLORS, initialOf } from './session';
import { KEYS, readJson, storage, writeJson } from './storage';
import type { PresetValues } from './template/schema';
import { withDefaults } from './template/schema';
import { serializeTemplate } from './template/serialize';
import { schemas } from './schemas.generated';
import { clock } from './ticker';
import { createUndo, type UndoApi } from './undo';

export interface ToolEntry {
  id: string;
  toolId: string;
  label: string;
  module: AnyToolModule;
  instance: ToolInstance<Record<string, unknown>>;
  ctx: ToolContext;
  undo: UndoApi;
  broken: string | null;
}

export interface StartInput {
  gameName: string;
  players: string[];
  tools: { toolId: string; instanceId: string; values?: PresetValues }[];
  templateText?: string;
  templateId?: string;
  notes?: string;
}

export interface SessionIndexEntry {
  id: string;
  game: string;
  updatedAt: number;
}

function brokenInstance(reason: string): ToolInstance<Record<string, unknown>> {
  const data = { reason };
  return {
    data,
    state: () => ({ ...data }),
    load: () => undefined,
    presetFromState: () => ({}),
    summary: () => reason,
  };
}

function labelFor(module: AnyToolModule, instanceId: string): string {
  return instanceId && instanceId !== module.id ? `${module.title} · ${instanceId}` : module.title;
}

class SessionStore {
  session = $state<Session | null>(null);
  activeId = $state<string | null>(null);
  version = $state(0);
  lastSession = $state<SessionIndexEntry | null>(null);
  notice = $state<{ message: string; kind: 'info' | 'error'; id: number } | null>(null);
  unavailable = $state<{ toolId: string; instanceId: string }[]>([]);

  private entriesList: ToolEntry[] = [];
  private modules = new Map<string, AnyToolModule>();
  private moduleLoads = new Map<string, Promise<AnyToolModule | null>>();
  private runId = 0;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private noticeId = 0;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  init(): void {
    const index = readJson<SessionIndexEntry[]>(KEYS.sessions, []);
    this.lastSession = index.length ? index[0] : null;
  }

  get entries(): ToolEntry[] {
    return this.entriesList;
  }

  players(): Player[] {
    return this.session?.players ?? [];
  }

  get activeEntry(): ToolEntry | null {
    if (!this.activeId) return null;
    return this.entriesList.find((entry) => entry.id === this.activeId) ?? null;
  }

  toast(message: string, kind: 'info' | 'error' = 'info'): void {
    this.noticeId += 1;
    this.notice = { message, kind, id: this.noticeId };
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.notice = null;
    }, 3200);
  }

  dismissNotice(): void {
    this.notice = null;
  }

  bump(): void {
    this.version += 1;
    this.scheduleSave();
  }

  private sessionApi: SessionApi = {
    players: () => this.players(),
    instance: <T extends object>(id: string) =>
      this.entriesList.find((entry) => entry.id === id)?.instance as ToolInstance<T> | undefined,
    setActivePlayer: (id) => this.setActivePlayer(id),
    addPlayer: (name) => this.addPlayer(name),
    removePlayer: (id) => this.removePlayer(id),
    renamePlayer: (id, name) => this.renamePlayer(id, name),
  };

  /** Release wake locks and listeners held by tool instances we are dropping. */
  private disposeEntries(): void {
    for (const entry of this.entriesList) {
      try {
        entry.instance.dispose?.();
      } catch (error) {
        console.error(`[tool:${entry.toolId}] dispose failed`, error);
      }
    }
    this.entriesList = [];
  }

  private createEntry(module: AnyToolModule, instanceId: string, values?: PresetValues): ToolEntry {
    const entry: ToolEntry = {
      id: instanceId,
      toolId: module.id,
      label: labelFor(module, instanceId),
      module,
      instance: brokenInstance('not created yet'),
      ctx: null as unknown as ToolContext,
      undo: null as unknown as UndoApi,
      broken: null,
    };

    const ctx: ToolContext = {
      instanceId,
      session: this.sessionApi,
      clock,
      rng: createRng(),
      audio,
      haptics,
      undo: {
        push: (label, key) => entry.undo.push(label, key),
        batch: (label, run) => entry.undo.batch(label, run),
        undo: () => entry.undo.undo(),
        canUndo: () => entry.undo.canUndo(),
        label: () => entry.undo.label(),
        size: () => entry.undo.size(),
        clear: () => entry.undo.clear(),
      },
      toast: (message, kind) => this.toast(message, kind),
      t,
    };
    entry.ctx = ctx;

    try {
      const presets = withDefaults(module.preset, values);
      entry.instance = module.create(ctx, presets) as ToolInstance<Record<string, unknown>>;
    } catch (error) {
      console.error(`[tool:${module.id}] failed to start`, error);
      entry.broken = error instanceof Error ? error.message : String(error);
      entry.instance = brokenInstance(`This tool failed to start: ${entry.broken}`);
    }

    entry.undo = createUndo({
      read: () => entry.instance.state(),
      write: (state) => {
        entry.instance.load(state);
        this.bump();
      },
      onChange: () => this.bump(),
    });

    return entry;
  }

  /**
   * A tool's code is fetched the first time a session needs it, then kept. `create`
   * stays synchronous, so no view ever observes a half-built instance.
   */
  private async moduleFor(toolId: string): Promise<AnyToolModule | null> {
    const ready = this.modules.get(toolId);
    if (ready) return ready;
    if (!hasTool(toolId)) return null;
    const running = this.moduleLoads.get(toolId);
    if (running) return running;
    const promise = loadTool(toolId)
      .then((module) => {
        this.modules.set(toolId, module);
        return module;
      })
      .catch((error: unknown) => {
        console.error(`[tool:${toolId}] failed to load`, error);
        return null;
      })
      .finally(() => this.moduleLoads.delete(toolId));
    this.moduleLoads.set(toolId, promise);
    return promise;
  }

  async start(input: StartInput): Promise<void> {
    this.runId += 1;
    const run = this.runId;
    // Load first, build second: the whole entry list appears in one synchronous pass.
    const loaded = await Promise.all(
      input.tools.map(async (spec) => ({ spec, module: await this.moduleFor(spec.toolId) })),
    );
    if (run !== this.runId) return;

    this.disposeEntries();
    this.unavailable = [];
    const now = Date.now();
    const session: Session = {
      id: newSessionId(),
      gameName: input.gameName,
      templateId: input.templateId,
      templateText: input.templateText,
      players: makePlayers(input.players.length ? input.players : ['Player 1', 'Player 2']),
      instances: [],
      notes: input.notes ?? '',
      createdAt: now,
      updatedAt: now,
    };

    // Tools read session players while they are created, so the new session
    // has to be live before the first tool starts.
    this.session = session;
    for (const { spec, module } of loaded) {
      if (!module) {
        this.unavailable.push({ toolId: spec.toolId, instanceId: spec.instanceId });
        continue;
      }
      if (this.entriesList.some((entry) => entry.id === spec.instanceId)) {
        this.toast(t('toast.duplicate-tool', { name: spec.instanceId }), 'error');
        continue;
      }
      const entry = this.createEntry(module, spec.instanceId, spec.values);
      this.entriesList.push(entry);
      session.instances.push({ id: entry.id, toolId: entry.toolId, state: entry.instance.state() });
    }

    this.activeId = this.entriesList.length ? this.entriesList[0].id : null;
    this.saveNow();
  }

  async resume(record: Session): Promise<void> {
    this.runId += 1;
    const run = this.runId;
    const loaded = await Promise.all(
      record.instances.map(async (saved) => ({ saved, module: await this.moduleFor(saved.toolId) })),
    );
    if (run !== this.runId) return;

    this.disposeEntries();
    this.unavailable = [];
    this.session = record;
    for (const { saved, module } of loaded) {
      if (!module) {
        this.unavailable.push({ toolId: saved.toolId, instanceId: saved.id });
        continue;
      }
      const entry = this.createEntry(module, saved.id);
      entry.instance.load(saved.state);
      this.entriesList.push(entry);
    }
    this.activeId = this.entriesList.length ? this.entriesList[0].id : null;
    this.version += 1;
  }

  /** Resume the most recent saved session. False when there is none. */
  async loadLatest(): Promise<boolean> {
    const index = readJson<SessionIndexEntry[]>(KEYS.sessions, []);
    for (const item of index) {
      const record = readJson<Session | null>(KEYS.session(item.id), null);
      if (record && record.id) {
        await this.resume(record);
        this.lastSession = item;
        return true;
      }
    }
    this.lastSession = null;
    return false;
  }

  setTab(id: string): void {
    if (this.activeId === id) return;
    this.activeId = id;
    this.version += 1;
  }

  close(): void {
    this.saveNow();
    if (this.session) {
      this.lastSession = { id: this.session.id, game: this.session.gameName, updatedAt: this.session.updatedAt };
    }
    this.disposeEntries();
    this.session = null;
    this.activeId = null;
    this.version += 1;
  }

  addPlayer(name: string): void {
    const session = this.session;
    if (!session) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    session.players.push({
      id: nextPlayerId(session.players),
      name: trimmed,
      color: PLAYER_COLORS[session.players.length % PLAYER_COLORS.length],
      initial: initialOf(trimmed),
      active: false,
    });
    this.bump();
  }

  removePlayer(id: string): void {
    const session = this.session;
    if (!session) return;
    const index = session.players.findIndex((player) => player.id === id);
    if (index < 0) return;
    session.players.splice(index, 1);
    if (session.players.length && !session.players.some((player) => player.active)) {
      session.players[0].active = true;
    }
    this.bump();
  }

  renamePlayer(id: string, name: string): void {
    const player = this.session?.players.find((item) => item.id === id);
    if (!player) return;
    player.name = name.trim() || player.name;
    player.initial = initialOf(player.name);
    this.bump();
  }

  setActivePlayer(id: string): void {
    const session = this.session;
    if (!session) return;
    for (const player of session.players) player.active = player.id === id;
    this.bump();
  }

  undoActive(): void {
    const entry = this.activeEntry;
    if (!entry) return;
    if (entry.undo.undo()) {
      this.toast(t('session.undo-with', { label: entry.label }));
    }
  }

  /** Save as template: players, tool instances and their current settings. */
  exportTemplate(): string {
    const session = this.session;
    if (!session) return '';
    const players = session.players.map((player) => player.name);
    const tools = this.entriesList.map((entry) => ({
      toolId: entry.toolId,
      instanceId: entry.id,
      values: entry.instance.presetFromState(),
    }));
    const spec = {
      game: {
        name: session.gameName,
        players: String(players.length),
        tags: ['imported'] as string[],
        author: 'saved from a session',
        license: 'CC-BY-SA-4.0',
        format: 1,
      },
      players,
      tools,
    };
    return serializeTemplate(spec, (id) => schemas[id]);
  }

  /** Full session (players, tools and live state) as a portable JSON file. */
  exportSessionJson(): string {
    this.saveNow();
    return JSON.stringify({ version: 1, session: this.session }, null, 2);
  }

  /** Remember that this game already produced a play-log entry. */
  markPlaySaved(playId: string): void {
    if (!this.session) return;
    this.session.playId = playId;
    this.bump();
  }

  /** Ask every tool that knows how to re-read the session players to do so. */
  syncPlayersToTools(): number {
    let count = 0;
    for (const entry of this.entriesList) {
      const sync = (entry.instance as { syncPlayers?: () => void }).syncPlayers;
      if (typeof sync !== 'function') continue;
      sync.call(entry.instance);
      count += 1;
    }
    return count;
  }

  setNotes(notes: string): void {
    if (!this.session) return;
    this.session.notes = notes;
    this.bump();
  }

  private sync() {
    const session = this.session;
    if (!session) return;
    for (const saved of session.instances) {
      const entry = this.entriesList.find((item) => item.id === saved.id);
      if (entry) saved.state = entry.instance.state();
    }
  }

  scheduleSave(): void {
    if (!this.session) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 250);
  }

  saveNow(): void {
    const session = this.session;
    if (!session) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.sync();
    session.updatedAt = Date.now();
    const ok = writeJson(KEYS.session(session.id), session);
    if (!ok) {
      this.toast(t('toast.save-failed'), 'error');
      return;
    }
    const index = readJson<SessionIndexEntry[]>(KEYS.sessions, []);
    const next = index.filter((item) => item.id !== session.id);
    next.unshift({ id: session.id, game: session.gameName, updatedAt: session.updatedAt });
    writeJson(KEYS.sessions, next.slice(0, 20));
    this.lastSession = next[0];
  }

  forgetSession(id: string): void {
    storage.remove(KEYS.session(id));
    const index = readJson<SessionIndexEntry[]>(KEYS.sessions, []).filter((item) => item.id !== id);
    writeJson(KEYS.sessions, index);
    if (this.lastSession?.id === id) this.lastSession = index[0] ?? null;
    this.bump();
  }
}

export const store = new SessionStore();
