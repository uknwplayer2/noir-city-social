import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { getDef, getLook, sellPrice } from "@/game/catalog";
import { createRooftopNightRoom } from "@/game/roomLayouts";
import { createNexoOccupant } from "@/game/nexo";
import { canPlace, normRot, relayout, repairSave } from "@/game/logic";
import type { Avatar, InvItem, Pattern, Quest, Room, Rot, SaveData, Tile, Tool, UserRole } from "@/game/types";
import { SAVE_VERSION } from "@/game/types";

export type GameState = SaveData & {
  selectedUid: string | null;
  tool: Tool;
  armedUid: string | null;
  armedRot: Rot;
  movingUid: string | null;
  movingRot: Rot;
  toast: string | null;
  enter: (name: string, lookId: string) => void;
  setGuestName: (name: string) => void;
  setRole: (name: string, role: UserRole) => boolean;
  grantCoins: (name: string, amount: number) => boolean;
  leave: () => void;
  enterRooftop: () => void;
  returnHome: () => void;
  setTool: (tool: Tool) => void;
  select: (uid: string | null) => void;
  arm: (invUid: string) => void;
  cancelArm: () => void;
  rotatePreview: () => boolean;
  beginMove: (uid: string) => void;
  cancelMove: () => void;
  placeArmed: (x: number, y: number, occupied: Tile[]) => boolean;
  moveSelected: (x: number, y: number, occupied: Tile[]) => boolean;
  pickup: (uid: string) => boolean;
  buy: (defId: string) => boolean;
  sell: (invUid: string) => boolean;
  setFloor: (id: string) => void;
  setWall: (id: string) => void;
  setPattern: (pattern: Pattern) => void;
  setRoomName: (name: string) => void;
  setChatDuration: (duration: 15000 | 20000 | 0) => void;
  setLayout: (cols: number, rows: number) => number;
  setAvatarTile: (x: number, y: number, dir: Rot) => void;
  resetAll: () => void;
  setToast: (toast: string | null) => void;
  clearToast: () => void;
  claimQuest: (id: string) => boolean;
};

const QUESTS = [
  { id: "place-3", title: "Um toque a mais", goal: 3, reward: 25, matches: (s: SaveData) => s.room.items.length },
  { id: "buy-1", title: "Dê um nome", goal: 1, reward: 20, matches: (s: SaveData) => Number(s.room.name !== "Meu canto") },
  { id: "plants-2", title: "Cantinho verde", goal: 2, reward: 30, matches: (s: SaveData) => s.room.items.filter((i) => ["vaso", "palmeira", "planta"].includes(i.defId)).length },
];

function dayKey() { return new Date().toISOString().slice(0, 10); }
function dailyQuests(day: string): Quest[] {
  const offset = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
  return [0, 1, 2].map((n) => ({ id: QUESTS[(offset + n) % QUESTS.length]!.id, progress: 0, claimed: false }));
}

function uid(): string {
  return crypto.randomUUID();
}

export function createInitial(): SaveData {
  const questDay = dayKey();
  const room: Room = {
    name: "Meu canto",
    cols: 8,
    rows: 8,
    floorId: "ardosia",
    wallId: "noite",
    pattern: "lajota",
    occupants: [createNexoOccupant()],
    items: [
      { uid: "st-shelf", defId: "estante", x: 1, y: 1, rot: 0 },
      { uid: "st-lamp", defId: "luminaria", x: 6, y: 1, rot: 0 },
      { uid: "st-sofa", defId: "sofa", x: 3, y: 2, rot: 0 },
      { uid: "st-rug", defId: "tapete", x: 3, y: 3, rot: 0 },
      { uid: "st-radio", defId: "radio", x: 2, y: 3, rot: 0 },
      { uid: "st-table", defId: "mesa", x: 3, y: 4, rot: 0 },
      { uid: "st-palm", defId: "palmeira", x: 6, y: 5, rot: 0 },
      { uid: "st-mat", defId: "capacho", x: 1, y: 7, rot: 0 },
      { uid: "st-console", defId: "aparador", x: 0, y: 3, rot: 0 },
      { uid: "st-armchair", defId: "poltrona", x: 6, y: 3, rot: 0 },
      { uid: "st-bed", defId: "cama", x: 0, y: 5, rot: 0 },
      { uid: "st-sofa-long", defId: "sofa3", x: 3, y: 6, rot: 0 },
      { uid: "st-side-lamp", defId: "abajur", x: 1, y: 4, rot: 0 },
      { uid: "st-speaker", defId: "som", x: 7, y: 3, rot: 0 },
      { uid: "st-small-plant", defId: "vaso", x: 7, y: 6, rot: 0 },
      { uid: "st-corner-table", defId: "canto", x: 6, y: 2, rot: 0 },
      { uid: "st-cushion", defId: "almofada", x: 5, y: 5, rot: 0 },
    ],
  };
  const inventory: InvItem[] = [
    { uid: "st-stool", defId: "banqueta" },
    { uid: "st-cushion", defId: "almofada" },
    { uid: "st-pot", defId: "vaso" },
  ];
  return {
    version: SAVE_VERSION,
    entered: false,
    guestName: "Visita",
    role: "admin",
    lookId: "barro",
    coins: 160,
    inventory,
    room,
    avatar: { x: 4, y: 5, dir: 3 },
    questDay,
    quests: dailyQuests(questDay),
    chatDuration: 20000,
  };
}

const memory = new Map<string, string>();

const storage = (): StateStorage => {
  if (typeof window === "undefined") {
    return {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => void memory.set(k, v),
      removeItem: (k) => void memory.delete(k),
    };
  }
  return {
    getItem: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* private mode / quota */
      }
    },
    removeItem: (k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...createInitial(),
      selectedUid: null,
      tool: "walk",
      armedUid: null,
      armedRot: 0,
      movingUid: null,
      movingRot: 0,
      toast: null,
      claimQuest: (id) => {
        const s = get();
        const quest = (s.quests ?? []).find((q) => q.id === id);
        const def = QUESTS.find((q) => q.id === id);
        if (!quest || !def || quest.claimed || def.matches(s) < def.goal) return false;
        set({ coins: s.coins + def.reward, quests: (s.quests ?? []).map((q) => q.id === id ? { ...q, progress: def.goal, claimed: true } : q), toast: `+${def.reward} moedas` });
        return true;
      },
      enter: (name, lookId) =>
        set({
          entered: true,
          guestName: name.trim().slice(0, 16) || "Visita",
          lookId: getLook(lookId).id,
        }),
      setGuestName: (name) => set({ guestName: name.trim().slice(0, 16) || "uknwplayer" }),
      setRole: (name, role) => {
        const s = get();
        if (s.role !== "admin" || name.trim().toLowerCase() !== s.guestName.toLowerCase()) return false;
        set({ role, toast: `Cargo local alterado: ${role}` });
        return true;
      },
      grantCoins: (name, amount) => {
        const s = get();
        const quantity = Math.max(0, Math.min(999999, Math.round(amount)));
        if (s.role !== "admin" || name.trim().toLowerCase() !== s.guestName.toLowerCase() || quantity <= 0) return false;
        set({ coins: Math.min(999999, s.coins + quantity), toast: `${quantity} moedas concedidas` });
        return true;
      },
      leave: () => set({ entered: false, selectedUid: null, movingUid: null, armedUid: null, tool: "walk" }),
      enterRooftop: () => {
        const s = get(); if (s.room.name === "Rooftop Night") return;
        const homeState = s.homeState ?? { room: s.room, avatar: s.avatar };
        set({ room: createRooftopNightRoom(), homeState, avatar: { x: 0, y: 15, dir: 3 }, selectedUid: null, movingUid: null, armedUid: null, tool: "walk", toast: "Você chegou ao Rooftop Night" });
      },
      returnHome: () => { const s = get(); if (!s.homeState) return; set({ room: s.homeState.room, avatar: s.homeState.avatar, homeState: undefined, selectedUid: null, movingUid: null, armedUid: null, tool: "walk", toast: "De volta ao seu quarto" }); },
      setTool: (tool) => {
        if (get().homeState && tool === "edit") return;
        set({
          tool,
          armedUid: tool === "walk" ? null : get().armedUid,
          movingUid: tool === "walk" ? null : get().movingUid,
        });
      },
      select: (selectedUid) => set({ selectedUid, movingUid: null }),
      arm: (armedUid) => {
        if (get().homeState) return;
        const item = get().inventory.find((i) => i.uid === armedUid);
        if (!item) return;
        set({ armedUid, armedRot: 0, movingUid: null, selectedUid: null, tool: "edit", toast: null });
      },
      cancelArm: () => set({ armedUid: null }),
      rotatePreview: () => {
        const s = get();
        if (s.armedUid) {
          set({ armedRot: normRot(s.armedRot + 1) });
          return true;
        }
        if (s.movingUid) {
          set({ movingRot: normRot(s.movingRot + 1) });
          return true;
        }
        if (!s.selectedUid) return false;
        const item = s.room.items.find((i) => i.uid === s.selectedUid);
        const def = item ? getDef(item.defId) : null;
        if (!item || !def) return false;
        const rot = normRot(item.rot + 1);
        if (!canPlace(s.room, def, item.x, item.y, rot, item.uid)) {
          set({ toast: "Sem espaço para girar" });
          return false;
        }
        set({
          room: {
            ...s.room,
            items: s.room.items.map((it) => (it.uid === item.uid ? { ...it, rot } : it)),
          },
          toast: null,
        });
        return true;
      },
      beginMove: (uid) => {
        if (get().homeState) return;
        const item = get().room.items.find((i) => i.uid === uid);
        if (!item) return;
        set({ movingUid: uid, movingRot: item.rot, selectedUid: uid, tool: "edit", armedUid: null });
      },
      cancelMove: () => set({ movingUid: null }),
      placeArmed: (x, y, occupied) => {
        const s = get();
        if (s.homeState) return false;
        const inv = s.inventory.find((i) => i.uid === s.armedUid);
        const def = inv ? getDef(inv.defId) : null;
        if (!inv || !def) return false;
        if (!canPlace(s.room, def, x, y, s.armedRot, undefined, occupied)) {
          set({ toast: "Não cabe aqui" });
          return false;
        }
        set({
          inventory: s.inventory.filter((i) => i.uid !== inv.uid),
          room: { ...s.room, items: [...s.room.items, { uid: inv.uid, defId: inv.defId, x, y, rot: s.armedRot }] },
          armedUid: null,
          selectedUid: inv.uid,
          toast: `${def.name} no quarto`,
        });
        return true;
      },
      moveSelected: (x, y, occupied) => {
        const s = get();
        if (s.homeState) return false;
        const item = s.room.items.find((i) => i.uid === s.movingUid);
        const def = item ? getDef(item.defId) : null;
        if (!item || !def) return false;
        const rot = s.movingRot;
        if (item.x === x && item.y === y && item.rot === rot) {
          set({ movingUid: null, toast: null });
          return true;
        }
        if (!canPlace(s.room, def, x, y, rot, item.uid, occupied)) {
          set({ toast: "Não cabe aqui" });
          return false;
        }
        set({
          room: {
            ...s.room,
            items: s.room.items.map((it) => (it.uid === item.uid ? { ...it, x, y, rot } : it)),
          },
          movingUid: null,
          selectedUid: item.uid,
          toast: null,
        });
        return true;
      },
      pickup: (id) => {
        const s = get();
        if (s.homeState) return false;
        const item = s.room.items.find((i) => i.uid === id);
        const def = item ? getDef(item.defId) : null;
        if (!item || !def) return false;
        set({
          room: { ...s.room, items: s.room.items.filter((i) => i.uid !== id) },
          inventory: [...s.inventory, { uid: item.uid, defId: item.defId }],
          selectedUid: null,
          movingUid: null,
          toast: `${def.name} na mochila`,
        });
        return true;
      },
      buy: (defId) => {
        const def = getDef(defId);
        const s = get();
        if (!def || (def.adminOnly && s.role !== "admin")) return false;
        if (s.coins < def.price) {
          set({ toast: "Faltam moedas" });
          return false;
        }
        set({
          coins: s.coins - def.price,
          inventory: [...s.inventory, { uid: uid(), defId }],
          toast: `${def.name} comprado`,
        });
        return true;
      },
      sell: (invUid) => {
        const s = get();
        const item = s.inventory.find((i) => i.uid === invUid);
        const def = item ? getDef(item.defId) : null;
        if (!item || !def) return false;
        const price = sellPrice(def.price);
        set({
          inventory: s.inventory.filter((i) => i.uid !== invUid),
          coins: s.coins + price,
          armedUid: s.armedUid === invUid ? null : s.armedUid,
          toast: `Vendido por ${price}`,
        });
        return true;
      },
      setFloor: (floorId) => set({ room: { ...get().room, floorId } }),
      setWall: (wallId) => set({ room: { ...get().room, wallId } }),
      setPattern: (pattern) => set({ room: { ...get().room, pattern } }),
      setRoomName: (name) => set({ room: { ...get().room, name: name.trim().slice(0, 24) || "Meu canto" } }),
      setChatDuration: (chatDuration) => set({ chatDuration }),
      setLayout: (cols, rows) => {
        const s = get();
        const next = relayout(s.room, s.inventory, s.avatar, cols, rows);
        set({
          room: next.room,
          inventory: next.inventory,
          avatar: next.avatar,
          selectedUid: null,
          movingUid: null,
          toast: next.returned ? `${next.returned} peça(s) voltaram para a mochila` : "Layout atualizado",
        });
        return next.returned;
      },
      setAvatarTile: (x, y, dir) => set({ avatar: { x, y, dir } }),
      resetAll: () => {
        const s = get();
        const fresh = createInitial();
        set({
          ...fresh,
          homeState: undefined,
          entered: s.entered,
          guestName: s.guestName,
          lookId: s.lookId,
          selectedUid: null,
          tool: "walk",
          armedUid: null,
          movingUid: null,
          movingRot: 0,
          toast: "Quarto recomeçado",
        });
      },
      setToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: "patio-save-v1",
      version: SAVE_VERSION,
      skipHydration: true,
      storage: createJSONStorage(storage),
      migrate: (persisted) => repairSave(persisted) ?? createInitial(),
      partialize: (s) => ({
        version: s.version,
        entered: s.entered,
        guestName: s.guestName,
        role: s.role,
        lookId: s.lookId,
        coins: s.coins,
        inventory: s.inventory,
        room: s.room,
        avatar: s.avatar,
        homeState: s.homeState,
        questDay: s.questDay,
        quests: s.quests,
        chatDuration: s.chatDuration,
      }),
      merge: (persisted, current) => {
        const fixed = repairSave(persisted);
        if (!fixed) return current;
        const day = dayKey();
        const saved = persisted && typeof persisted === "object" ? persisted as Partial<SaveData> : {};
        const questDay = day;
        const quests = questDay === saved.questDay && Array.isArray(saved.quests) ? saved.quests : dailyQuests(day);
        const merged = { ...current, ...fixed, questDay, quests };
        return { ...merged, quests: (merged.quests ?? []).map((q) => {
          const def = QUESTS.find((d) => d.id === q.id);
          return def ? { ...q, progress: Math.min(def.goal, def.matches(merged)) } : q;
        }), selectedUid: null, tool: "walk", armedUid: null, movingUid: null, toast: null };
      },
    },
  ),
);


export function selectedItem(s: GameState): { uid: string; name: string } | null {
  const uid = s.movingUid ?? s.selectedUid;
  if (!uid) return null;
  const item = s.room.items.find((i) => i.uid === uid);
  const def = item ? getDef(item.defId) : null;
  return def ? { uid, name: def.name } : null;
}


export type { Avatar };
