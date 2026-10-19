import type { AvatarFigure, LayerDef, LayerSlot } from "./layers";
import { DEFAULT_FIGURE } from "./layers";
import bodyDefaultSprite from "@/game/assets/avatar/layers/body/body-default.png";

/**
 * ============================================================
 * COMO CRIAR UM LAYER NOVO
 * ============================================================
 * 1. (Opcional) Coloque o PNG em:
 *    src/game/assets/avatar/layers/<slot>/nome.png
 *    Tamanho sugerido: 128×160, fundo transparente, pés na base.
 *
 * 2. Importe a imagem no topo deste arquivo:
 *    import hairPunk from "@/game/assets/avatar/layers/hair/punk.png";
 *
 * 3. Adicione um objeto em LAYER_CATALOG:
 *    {
 *      id: "hair-punk",          // único
 *      slot: "hair",             // body|eyes|mouth|hair|shirt|pants|shoes|hat|accessory
 *      name: "Cabelo punk",
 *      sprite: hairPunk,         // opcional
 *      color: "#1a1a1a",         // fallback se não houver sprite
 *      selectable: true,
 *    }
 *
 * 4. Pronto — aparece na aba do slot no menu Visuais.
 * ============================================================
 */

export const LAYER_CATALOG: LayerDef[] = [
  // —— Corpo / manequim ——
  { id: "body-default", slot: "body", name: "Base Noir", color: "#e8b898", sprite: bodyDefaultSprite, frameColumns: 8, selectable: true },
  { id: "body-light", slot: "body", name: "Pele clara", color: "#f0c7a4", selectable: true },
  { id: "body-tan", slot: "body", name: "Pele morena", color: "#c98b6a", selectable: true },
  { id: "body-deep", slot: "body", name: "Pele escura", color: "#8d5a3c", selectable: true },

  // —— Olhos ——
  { id: "eyes-default", slot: "eyes", name: "Olhos normais", color: "#2a221c", selectable: true },
  { id: "eyes-happy", slot: "eyes", name: "Olhos felizes", color: "#2a221c", selectable: true },
  { id: "eyes-sleepy", slot: "eyes", name: "Olhos sonolentos", color: "#2a221c", selectable: true },
  { id: "eyes-cool", slot: "eyes", name: "Óculos escuros", color: "#111111", selectable: true },
  { id: "eyes-wide", slot: "eyes", name: "Olhos abertos", color: "#1a3050", selectable: true },

  // —— Boca ——
  { id: "mouth-default", slot: "mouth", name: "Boca neutra", color: "#8a4a4a", selectable: true },
  { id: "mouth-smile", slot: "mouth", name: "Sorriso", color: "#8a4a4a", selectable: true },
  { id: "mouth-open", slot: "mouth", name: "Boca aberta", color: "#6a3030", selectable: true },
  { id: "mouth-smirk", slot: "mouth", name: "Sorriso de lado", color: "#8a4a4a", selectable: true },

  // —— Cabelo ——
  { id: "hair-default", slot: "hair", name: "Cabelo curto", color: "#271b17", selectable: true },
  { id: "hair-long", slot: "hair", name: "Cabelo longo", color: "#4a3428", selectable: true },
  { id: "hair-blonde", slot: "hair", name: "Loiro curto", color: "#c4a05a", selectable: true },
  { id: "hair-none", slot: "hair", name: "Careca", color: "transparent", selectable: true },

  // —— Camisa ——
  { id: "shirt-default", slot: "shirt", name: "Camisa clara", color: "#d8c7aa", selectable: true },
  { id: "shirt-dark", slot: "shirt", name: "Camisa preta", color: "#332d2c", selectable: true },
  { id: "shirt-bordo", slot: "shirt", name: "Camisa bordô", color: "#76232d", selectable: true },
  { id: "shirt-white", slot: "shirt", name: "Camisa branca", color: "#f0ebe3", selectable: true },

  // —— Calça ——
  { id: "pants-default", slot: "pants", name: "Calça escura", color: "#302a29", selectable: true },
  { id: "pants-light", slot: "pants", name: "Calça clara", color: "#71604f", selectable: true },
  { id: "pants-blue", slot: "pants", name: "Calça azul", color: "#2c3a4e", selectable: true },

  // —— Sapatos ——
  { id: "shoes-default", slot: "shoes", name: "Sapatos pretos", color: "#1a1512", selectable: true },
  { id: "shoes-brown", slot: "shoes", name: "Sapatos marrons", color: "#5c3824", selectable: true },

  // —— Chapéu / acessório (vazios por padrão — adicione arte depois) ——
  { id: "hat-none", slot: "hat", name: "Sem chapéu", color: "transparent", selectable: true },
  { id: "accessory-none", slot: "accessory", name: "Sem extra", color: "transparent", selectable: true },
];

const BY_ID = new Map(LAYER_CATALOG.map((l) => [l.id, l]));

export function getLayer(id: string | undefined | null): LayerDef | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function layersForSlot(slot: LayerSlot): LayerDef[] {
  return LAYER_CATALOG.filter((l) => l.slot === slot && l.selectable !== false);
}

export function resolveFigure(partial?: Partial<AvatarFigure> | null): AvatarFigure {
  return {
    ...DEFAULT_FIGURE,
    ...partial,
  };
}
