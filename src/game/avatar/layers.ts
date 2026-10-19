/** Ordem de desenho: de baixo para cima */
export const LAYER_ORDER = [
  "body",
  "shoes",
  "pants",
  "shirt",
  "hair",
  "eyes",
  "mouth",
  "hat",
  "accessory",
] as const;

export type LayerSlot = (typeof LAYER_ORDER)[number];

/** Slots que aparecem como abas no menu Visuais */
export const VISUAL_TABS: { slot: LayerSlot; label: string }[] = [
  { slot: "body", label: "Corpo" },
  { slot: "eyes", label: "Olhos" },
  { slot: "mouth", label: "Boca" },
  { slot: "hair", label: "Cabelo" },
  { slot: "shirt", label: "Camisa" },
  { slot: "pants", label: "Calça" },
  { slot: "shoes", label: "Sapatos" },
  { slot: "hat", label: "Chapéu" },
  { slot: "accessory", label: "Extra" },
];

export type LayerDef = {
  id: string;
  slot: LayerSlot;
  name: string;
  /** URL da spritesheet idle (opcional — sem isso usa cor procedural) */
  sprite?: string;
  /** Spritesheet de caminhada */
  walkSprite?: string;
  /** Cor de tint / fallback procedural */
  color?: string;
  /** Frame na sheet idle */
  frame?: { x: number; y: number; w: number; h: number };
  /** Aparece no menu Visuais */
  selectable?: boolean;
  locked?: boolean;
};

/** Aparência montada do avatar */
export type AvatarFigure = {
  body: string;
  shoes?: string;
  pants?: string;
  shirt?: string;
  hair?: string;
  eyes?: string;
  mouth?: string;
  hat?: string;
  accessory?: string;
};

export const DEFAULT_FIGURE: AvatarFigure = {
  body: "body-default",
  shoes: "shoes-default",
  pants: "pants-default",
  shirt: "shirt-default",
  hair: "hair-default",
  eyes: "eyes-default",
  mouth: "mouth-default",
  hat: "hat-none",
  accessory: "accessory-none",
};

/** Presets a partir dos looks antigos (migração) */
export const LOOK_TO_FIGURE: Record<string, AvatarFigure> = {
  barro: {
    body: "body-light",
    shoes: "shoes-default",
    pants: "pants-default",
    shirt: "shirt-default",
    hair: "hair-default",
    eyes: "eyes-default",
    mouth: "mouth-default",
  },
  rio: {
    body: "body-default",
    shoes: "shoes-default",
    pants: "pants-default",
    shirt: "shirt-dark",
    hair: "hair-default",
    eyes: "eyes-default",
    mouth: "mouth-default",
  },
  noite: {
    body: "body-tan",
    shoes: "shoes-default",
    pants: "pants-default",
    shirt: "shirt-bordo",
    hair: "hair-long",
    eyes: "eyes-default",
    mouth: "mouth-smile",
  },
  flor: {
    body: "body-light",
    shoes: "shoes-default",
    pants: "pants-light",
    shirt: "shirt-default",
    hair: "hair-long",
    eyes: "eyes-happy",
    mouth: "mouth-smile",
  },
};

export function figureFromLookId(lookId: string): AvatarFigure {
  return { ...DEFAULT_FIGURE, ...(LOOK_TO_FIGURE[lookId] ?? {}) };
}

/** True while a figure still matches its legacy sprite preset. */
export function isLegacyLookFigure(figure: AvatarFigure, lookId: string): boolean {
  const preset = figureFromLookId(lookId);
  return LAYER_ORDER.every((slot) => figure[slot] === preset[slot]);
}
