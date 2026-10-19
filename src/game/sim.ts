import { useGame } from "@/game/store";
import { BUBBLE_LIFETIME_MS } from "@/game/bubbles";
import { doorTile, findPath, findSeatAt, isBlocked, neighbors, tilesOf } from "@/game/logic";
import { getDef } from "@/game/catalog";
import type { Facing, Rot, Tile } from "@/game/types";

const SPEED = 2.7;

export type Sim = {
  x: number;
  y: number;
  dir: Rot;
  facing: Facing;
  path: Tile[];
  phase: number;
  time: number;
  bubbles: { id: number; text: string; author: string; x: number; y: number; age: number; duration: number }[];
  handsPocket: boolean;
  hover: Tile | null;
  booted: boolean;
  state: "idle" | "walk" | "sit" | "lay" | "dance";
  sitUid: string | null;
  danceId: number;
  pendingSeatUid: string | null;
  standPosition: Tile | null;
};

export const sim: Sim = {
  x: 4.5,
  y: 6.5,
  dir: 3,
  facing: 0,
  path: [],
  phase: 0,
  time: 0,
  bubbles: [],
  handsPocket: false,
  hover: null,
  booted: false,
  state: "idle",
  sitUid: null,
  danceId: 0,
  pendingSeatUid: null,
  standPosition: null,
};

export function resetSim(avatar: { x: number; y: number; dir: Rot }): void {
  sim.x = avatar.x + 0.5;
  sim.y = avatar.y + 0.5;
  sim.dir = avatar.dir;
  sim.bubbles = [];
  sim.facing = ([2, 4, 6, 0][avatar.dir] ?? 4) as Facing;
  sim.path = [];
  sim.state = "idle";
  sim.sitUid = null;
  sim.danceId = 0;
  sim.pendingSeatUid = null;
  sim.standPosition = null;
}

export function standUp(): void {
  if (sim.state !== "sit" && sim.state !== "lay") return;
  if (sim.standPosition && !isBlocked(useGame.getState().room.items, sim.standPosition.x, sim.standPosition.y)) {
    sim.x = sim.standPosition.x + 0.5;
    sim.y = sim.standPosition.y + 0.5;
  }
  sim.state = "idle";
  sim.sitUid = null;
  sim.standPosition = null;
}

function sitOn(uid: string): boolean {
  const room = useGame.getState().room;
  const item = room.items.find((candidate) => candidate.uid === uid);
  const def = item ? getDef(item.defId) : null;
  if (!item || !def || (!def.canSit && !def.canLay)) return false;
  standUp();
  stopDance();
  const approach = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
  const footprint = tilesOf(def, item.x, item.y, item.rot);
  const seatTile = footprint.reduce((best, tile) => {
    const distance = Math.abs(tile.x - approach.x) + Math.abs(tile.y - approach.y);
    const bestDistance = Math.abs(best.x - approach.x) + Math.abs(best.y - approach.y);
    return distance < bestDistance ? tile : best;
  }, footprint[0]!);
  sim.standPosition = approach;
  sim.x = seatTile.x + 0.5;
  sim.y = seatTile.y + 0.5;
  sim.state = def.canLay ? "lay" : "sit";
  sim.sitUid = uid;
  sim.pendingSeatUid = null;
  sim.path = [];
  sim.danceId = 0;
  return true;
}

export function trySitOrLay(preferLay = false): boolean {
  const room = useGame.getState().room;
  const item = findSeatAt(room, Math.floor(sim.x), Math.floor(sim.y));
  if (!item) {
    useGame.getState().setToast("Nada para sentar aqui");
    return false;
  }
  const def = getDef(item.defId);
  if (!def) return false;
  sim.state = preferLay && def.canLay ? "lay" : def.canSit ? "sit" : def.canLay ? "lay" : "idle";
  if (sim.state === "idle") return false;
  sim.sitUid = item.uid;
  sim.path = [];
  sim.danceId = 0;
  return true;
}

export function setDance(id: number): void {
  standUp();
  sim.danceId = Math.max(0, Math.min(4, Math.trunc(id)));
  sim.state = sim.danceId ? "dance" : "idle";
  sim.path = [];
  sim.pendingSeatUid = null;
}

export function stopDance(): void {
  if (sim.state === "dance") sim.state = "idle";
  sim.danceId = 0;
}

/** Walk to the closest free tile beside a seat, then switch to a seated pose. */
export function requestSeat(uid: string): boolean {
  if (sim.state === "sit" || sim.state === "lay") standUp();
  const room = useGame.getState().room;
  const item = room.items.find((candidate) => candidate.uid === uid);
  const def = item ? getDef(item.defId) : null;
  if (!item || !def || (!def.canSit && !def.canLay)) return false;
  const footprint = tilesOf(def, item.x, item.y, item.rot);
  const candidates = new Map<string, Tile>();
  for (const tile of footprint) {
    for (const near of neighbors(tile)) {
      if (!isBlocked(room.items, near.x, near.y)) candidates.set(`${near.x},${near.y}`, near);
    }
  }
  const start = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
  let best: { path: Tile[]; tile: Tile } | null = null;
  for (const tile of candidates.values()) {
    const path = findPath(room, start, tile);
    if (path && (!best || path.length < best.path.length)) best = { path, tile };
  }
  if (!best) {
    useGame.getState().setToast("Não há espaço livre junto ao móvel");
    return false;
  }
  sim.pendingSeatUid = uid;
  if (!best.path.length) return sitOn(uid);
  sim.path = best.path;
  sim.state = "walk";
  return true;
}

export function requestNearestSeat(): boolean {
  const room = useGame.getState().room;
  const current = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
  const seats = room.items
    .filter((item) => {
      const def = getDef(item.defId);
      return Boolean(def?.canSit || def?.canLay);
    })
    .sort((a, b) => {
      const distance = (uid: string) => {
        const item = room.items.find((candidate) => candidate.uid === uid)!;
        const def = getDef(item.defId)!;
        return Math.min(...tilesOf(def, item.x, item.y, item.rot).map((tile) => Math.abs(tile.x - current.x) + Math.abs(tile.y - current.y)));
      };
      return distance(a.uid) - distance(b.uid);
    });
  for (const item of seats) if (requestSeat(item.uid)) return true;
  useGame.getState().setToast("Não há assentos acessíveis neste quarto");
  return false;
}

let bubbleId = 0;
export function say(text: string): void {
  sayAs(useGame.getState().guestName, text);
}

export function sayAs(
  author: string,
  text: string,
  position?: { x: number; y: number },
): void {
  const clean = text.trim().slice(0, 80);
  if (!clean) return;
  sim.bubbles.push({ id: ++bubbleId, text: clean, author, x: position?.x ?? sim.x, y: position?.y ?? sim.y, age: 0, duration: BUBBLE_LIFETIME_MS });
}

export function requestWalk(goal: Tile): boolean {
  standUp();
  stopDance();
  sim.pendingSeatUid = null;
  const room = useGame.getState().room;
  const start = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
  const path = findPath(room, start, goal);
  if (!path) {
    useGame.getState().setToast("Sem caminho até lá");
    return false;
  }
  if (!path.length) {
    const seat = findSeatAt(room, goal.x, goal.y);
    if (seat) return trySitOrLay(Boolean(getDef(seat.defId)?.canLay && !getDef(seat.defId)?.canSit));
    return true;
  }
  sim.path = path;
  sim.state = "walk";
  return true;
}

function facingFromDelta(dx: number, dy: number): Facing {
  if (dx > 0 && dy < 0) return 1;
  if (dx > 0 && dy > 0) return 3;
  if (dx < 0 && dy > 0) return 5;
  if (dx < 0 && dy < 0) return 7;
  if (dx > 0) return 2;
  if (dx < 0) return 6;
  if (dy > 0) return 4;
  return 0;
}

export function tickSim(dt: number): void {
  sim.time += dt;
  sim.phase += dt * (sim.state === "dance" ? 10 : sim.path.length ? 6.2 : 1.6);
  for (const bubble of sim.bubbles) bubble.age += dt;
  sim.bubbles = sim.bubbles.filter((bubble) => !bubble.duration || bubble.age < bubble.duration / 1000);
  const room = useGame.getState().room;
  const tile = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
  if (!sim.booted) return;
  if (sim.state === "sit" || sim.state === "lay" || sim.state === "dance") return;
  if (tile.x < 0 || tile.y < 0 || tile.x >= room.cols || tile.y >= room.rows || isBlocked(room.items, tile.x, tile.y)) {
    const avatar = useGame.getState().avatar;
    resetSim(avatar);
    return;
  }
  if (!sim.path.length) return;
  const next = sim.path[0];
  if (isBlocked(room.items, next.x, next.y)) {
    sim.path = [];
    sim.state = "idle";
    sim.pendingSeatUid = null;
    useGame.getState().setToast("O caminho fechou");
    return;
  }
  const tx = next.x + 0.5;
  const ty = next.y + 0.5;
  const dx = tx - sim.x;
  const dy = ty - sim.y;
  const dist = Math.hypot(dx, dy);
  if (dx !== 0 || dy !== 0) {
    sim.facing = facingFromDelta(dx, dy);
    if (Math.abs(dx) > Math.abs(dy)) sim.dir = dx > 0 ? 0 : 2;
    else sim.dir = dy > 0 ? 1 : 3;
  }
  if (dist < 0.02) {
    sim.x = tx;
    sim.y = ty;
    sim.path.shift();
    if (!sim.path.length) {
      sim.state = "idle";
      const landed = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
      useGame.getState().setAvatarTile(landed.x, landed.y, sim.dir);
      if (sim.pendingSeatUid) sitOn(sim.pendingSeatUid);
      const door = doorTile(room);
      if (landed.x === door.x && landed.y === door.y) {
        sim.bubbles.push({ id: ++bubbleId, text: "O corredor do clube ainda está em obra.", author: useGame.getState().guestName, x: sim.x, y: sim.y, age: 0, duration: BUBBLE_LIFETIME_MS });
      }
    }
    return;
  }
  const step = Math.min(dist, SPEED * dt);
  sim.x += (dx / dist) * step;
  sim.y += (dy / dist) * step;
}

export function avatarTiles(): Tile[] {
  const tiles = [{ x: Math.floor(sim.x), y: Math.floor(sim.y) }];
  if (sim.path[0]) tiles.push(sim.path[0]);
  return tiles;
}
