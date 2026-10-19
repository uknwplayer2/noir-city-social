import { useGame } from "@/game/store";
import { doorTile, findPath, isBlocked } from "@/game/logic";
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
};

export function resetSim(avatar: { x: number; y: number; dir: Rot }): void {
  sim.x = avatar.x + 0.5;
  sim.y = avatar.y + 0.5;
  sim.dir = avatar.dir;
  sim.facing = ([2, 4, 6, 0][avatar.dir] ?? 4) as Facing;
  sim.path = [];
}

let bubbleId = 0;
export function say(text: string, duration = useGame.getState().chatDuration ?? 20000): void {
  sayAs(useGame.getState().guestName, text, duration);
}

export function sayAs(
  author: string,
  text: string,
  duration = useGame.getState().chatDuration ?? 20000,
  position?: { x: number; y: number },
): void {
  const clean = text.trim().slice(0, 80);
  if (!clean) return;
  sim.bubbles.push({ id: ++bubbleId, text: clean, author, x: position?.x ?? sim.x, y: position?.y ?? sim.y, age: 0, duration });
}

export function requestWalk(goal: Tile): boolean {
  const room = useGame.getState().room;
  const start = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
  const path = findPath(room, start, goal);
  if (!path) {
    useGame.getState().setToast("Sem caminho até lá");
    return false;
  }
  if (!path.length) return true;
  sim.path = path;
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
  sim.phase += dt * (sim.path.length ? 6.2 : 1.6);
  for (const bubble of sim.bubbles) bubble.age += dt;
  sim.bubbles = sim.bubbles.filter((bubble) => !bubble.duration || bubble.age < bubble.duration / 1000);
  const room = useGame.getState().room;
  const tile = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
  if (!sim.booted) return;
  if (tile.x < 0 || tile.y < 0 || tile.x >= room.cols || tile.y >= room.rows || isBlocked(room.items, tile.x, tile.y)) {
    const avatar = useGame.getState().avatar;
    resetSim(avatar);
    return;
  }
  if (!sim.path.length) return;
  const next = sim.path[0];
  if (isBlocked(room.items, next.x, next.y)) {
    sim.path = [];
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
      const landed = { x: Math.floor(sim.x), y: Math.floor(sim.y) };
      useGame.getState().setAvatarTile(landed.x, landed.y, sim.dir);
      const door = doorTile(room);
      if (landed.x === door.x && landed.y === door.y) {
        sim.bubbles.push({ id: ++bubbleId, text: "O corredor do clube ainda está em obra.", author: useGame.getState().guestName, x: sim.x, y: sim.y, age: 0, duration: useGame.getState().chatDuration ?? 20000 });
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
