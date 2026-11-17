import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { PROMPT_PACKS, PACK_IDS } from '../../data/prompts';
import { drawFrom, parseCustomPacks, summaryOf, type CustomPack, type PromptCard } from './logic';
import Prompts from './Prompts.svelte';
import en from './locales/en';
import meta from './meta';
import preset from './preset';

registerToolStrings('prompts', en);

export interface PromptsState {
  packs: string[];
  draw: number;
  designer: boolean;
  cards: PromptCard[];
  locked: string[];
  excluded: string[];
  favorites: string[];
  custom: CustomPack[];
  history: string[];
  seed: string;
}

export interface PromptsActions {
  setDraw(value: number): void;
  togglePack(id: string): void;
  setDesigner(value: boolean): void;
  setSeed(value: string): void;
  draw(): void;
  reroll(index: number): void;
  toggleLock(item: string): void;
  exclude(item: string): void;
  toggleFavorite(item: string): void;
  importPacks(text: string): void;
  clear(): void;
}

export type PromptsInstance = ToolInstance<PromptsState> & PromptsActions;

function create(ctx: ToolContext, values: PresetValues = {}): PromptsInstance {
  const chosen = Array.isArray(values.packs) ? (values.packs as string[]).map(String).filter((id) => PACK_IDS.includes(id)) : [];
  const seed = String(values.seed ?? '');
  if (seed.trim()) ctx.rng.seed(seed.trim());

  const data = $state<PromptsState>({
    packs: chosen.length ? chosen : ['genres', 'themes', 'mechanics'],
    draw: Math.max(1, Number(values.draw ?? 1)),
    designer: !!values.designer,
    cards: [],
    locked: Array.isArray(values.locks) ? (values.locks as string[]).map(String) : [],
    excluded: [],
    favorites: [],
    custom: [],
    history: [],
    seed,
  });

  function pool(packId: string): string[] {
    const built = PROMPT_PACKS.find((pack) => pack.id === packId);
    if (built) return built.items;
    const custom = data.custom.find((pack) => pack.name === packId);
    return custom?.items ?? [];
  }

  function packName(packId: string): string {
    return PROMPT_PACKS.find((pack) => pack.id === packId)?.name ?? packId;
  }

  function mergedPool(ids: string[]): string[] {
    return ids.flatMap((id) => pool(id));
  }

  function note(text: string): void {
    data.history = [text, ...data.history].slice(0, 10);
  }

  const instance: PromptsInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as PromptsState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<PromptsState>;
      if (Array.isArray(raw.packs)) {
        const list = raw.packs.map(String).filter(Boolean);
        if (list.length) data.packs = list;
      }
      if (typeof raw.draw === 'number') data.draw = Math.max(1, raw.draw);
      if (typeof raw.designer === 'boolean') data.designer = raw.designer;
      if (Array.isArray(raw.cards)) {
        data.cards = raw.cards
          .filter((card) => card && typeof card.item === 'string')
          .map((card) => ({ pack: String(card.pack ?? ''), item: card.item }));
      }
      if (Array.isArray(raw.locked)) data.locked = raw.locked.map(String);
      if (Array.isArray(raw.excluded)) data.excluded = raw.excluded.map(String);
      if (Array.isArray(raw.favorites)) data.favorites = raw.favorites.map(String);
      if (Array.isArray(raw.custom)) {
        data.custom = raw.custom
          .filter((pack) => pack && typeof pack.name === 'string' && Array.isArray(pack.items))
          .map((pack) => ({ name: pack.name, items: pack.items.map(String) }));
      }
      if (Array.isArray(raw.history)) data.history = raw.history.map(String).slice(0, 10);
      if (typeof raw.seed === 'string') data.seed = raw.seed;
    },
    presetFromState() {
      return {
        packs: data.packs,
        draw: data.draw,
        designer: data.designer,
        locks: data.locked,
        seed: data.seed,
      };
    },
    commands: {
      draw: () => instance.draw(),
      reroll: (arg) => instance.reroll(Number(arg ?? 0) || 0),
    },
    summary: () => summaryOf(data.cards, data.favorites),
    setDraw(value) {
      data.draw = Math.max(1, Math.min(10, Math.round(value)));
    },
    togglePack(id) {
      ctx.undo.push(translate('prompts.undo-packs'));
      data.packs = data.packs.includes(id) ? data.packs.filter((pack) => pack !== id) : [...data.packs, id];
      if (!data.packs.length) data.packs = [id];
    },
    setDesigner(value) {
      ctx.undo.push(translate('prompts.undo-designer'));
      data.designer = value;
    },
    setSeed(value) {
      data.seed = value;
    },
    draw() {
      if (data.seed.trim()) ctx.rng.seed(data.seed.trim());
      const blocked = [...data.excluded, ...data.cards.map((card) => card.item)];
      const cards: PromptCard[] = [];
      const kept = data.cards.filter((card) => data.locked.includes(card.item));
      cards.push(...kept);

      if (data.designer) {
        const picks: [string, number][] = [
          ['genres', 1],
          ['mechanics', 2],
          ['themes', 1],
          ['constraints', 1],
        ];
        for (const [id, count] of picks) {
          const source = pool(id);
          if (!source.length) continue;
          for (const item of drawFrom(source, count, ctx.rng, [...blocked, ...cards.map((card) => card.item)])) {
            cards.push({ pack: packName(id), item });
          }
        }
      } else {
        const source = mergedPool(data.packs);
        if (!source.length) {
          ctx.toast(translate('prompts.toast-empty-packs'), 'error');
          return;
        }
        for (const item of drawFrom(source, data.draw, ctx.rng, [...blocked, ...cards.map((card) => card.item)])) {
          const owner = data.packs.find((id) => pool(id).includes(item)) ?? 'custom';
          cards.push({ pack: packName(owner), item });
        }
      }

      if (!cards.length) {
        ctx.toast(translate('prompts.toast-all-excluded'));
        return;
      }
      ctx.undo.push(translate('prompts.undo-draw'));
      data.cards = cards;
      ctx.audio.play('click');
      ctx.haptics.buzz('short');
      const drawn = cards.length - kept.length;
      note(drawn === 1 ? translate('prompts.note-drew-one') : translate('prompts.note-drew-many', { count: drawn }));
    },
    reroll(index) {
      const card = data.cards[index];
      if (!card) return;
      const poolId = PACK_IDS.find((id) => packName(id) === card.pack) ?? data.packs[0];
      const source = pool(poolId);
      const [item] = drawFrom(source, 1, ctx.rng, [...data.excluded, ...data.cards.map((entry) => entry.item)]);
      if (!item) {
        ctx.toast(translate('prompts.toast-nothing-left'));
        return;
      }
      ctx.undo.push(translate('prompts.undo-reroll'));
      data.cards = data.cards.map((entry, at) => (at === index ? { ...entry, item } : entry));
    },
    toggleLock(item) {
      data.locked = data.locked.includes(item) ? data.locked.filter((entry) => entry !== item) : [...data.locked, item];
    },
    exclude(item) {
      ctx.undo.push(translate('prompts.undo-exclude'));
      data.excluded = [...data.excluded, item];
      data.cards = data.cards.filter((card) => card.item !== item);
    },
    toggleFavorite(item) {
      data.favorites = data.favorites.includes(item) ? data.favorites.filter((entry) => entry !== item) : [...data.favorites, item];
    },
    importPacks(text) {
      const packs = parseCustomPacks(text);
      if (!packs.length) {
        ctx.toast(translate('prompts.toast-pack-format'), 'error');
        return;
      }
      ctx.undo.push(translate('prompts.undo-import'));
      data.custom = packs;
      data.packs = [...new Set([...data.packs, ...packs.map((pack) => pack.name)])];
      ctx.toast(
        packs.length === 1
          ? translate('prompts.toast-packs-ready-one')
          : translate('prompts.toast-packs-ready-many', { count: packs.length }),
      );
    },
    clear() {
      ctx.undo.push(translate('prompts.undo-clear'));
      data.cards = [];
      data.locked = [];
      data.history = [];
    },
  };

  return instance;
}

export default { ...meta, preset, component: Prompts, create };
