import { getDef } from "@/game/catalog";
import { tilesOf } from "@/game/logic";
import type { Placed, Room } from "@/game/types";

export const TILE_W = 64;
export const TILE_H = 32;
export const WALL_H = 108;

export type Cam = { scale: number; panX: number; panY: number };

export function projectRaw(x: number, y: number, z: number): [number, number] {
  return [(x - y) * (TILE_W / 2), (x + y) * (TILE_H / 2) - z];
}

export function project(x: number, y: number, z: number, cam: Cam): [number, number] {
  const [rx, ry] = projectRaw(x, y, z);
  return [rx * cam.scale + cam.panX, ry * cam.scale + cam.panY];
}

export function frameCamera(
  viewW: number,
  viewH: number,
  cols: number,
  rows: number,
  userScale: number,
  panX: number,
  panY: number,
): Cam {
  const pts = [
    projectRaw(0, 0, WALL_H),
    projectRaw(cols, 0, WALL_H),
    projectRaw(0, rows, 0),
    projectRaw(cols, rows, 0),
  ];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const base = Math.min((viewW - 28) / bw, (viewH - 28) / bh);
  const scale = base * userScale;
  return {
    scale,
    panX: viewW / 2 - ((minX + maxX) / 2) * scale + panX,
    panY: viewH / 2 - ((minY + maxY) / 2) * scale + panY,
  };
}

export function tileAt(px: number, py: number, cam: Cam): { x: number; y: number } {
  const dx = (px - cam.panX) / cam.scale;
  const dy = (py - cam.panY) / cam.scale;
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  const x = (dx / hw + dy / hh) / 2;
  const y = (dy / hh - dx / hw) / 2;
  return { x: Math.floor(x), y: Math.floor(y) };
}

export function columnHits(
  px: number,
  py: number,
  tileX: number,
  tileY: number,
  height: number,
  cam: Cam,
): boolean {
  return columnHitHeight(px, py, tileX, tileY, height, cam) !== null;
}

function columnHitHeight(
  px: number,
  py: number,
  tileX: number,
  tileY: number,
  height: number,
  cam: Cam,
): number | null {
  const steps = Math.max(1, Math.ceil(height / 4));
  let highestHit: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const z = (height * i) / steps;
    const t = tileAt(px, py + z * cam.scale, cam);
    if (t.x === tileX && t.y === tileY && (highestHit === null || z > highestHit)) highestHit = z;
  }
  return highestHit;
}

export function itemDepth(item: Placed): number {
  const def = getDef(item.defId);
  if (!def) return item.x + item.y;
  const tiles = tilesOf(def, item.x, item.y, item.rot);
  let d = 0;
  for (const t of tiles) d = Math.max(d, t.x + t.y);
  return d;
}

export type Pick =
  | { kind: "item"; uid: string }
  | { kind: "tile"; x: number; y: number }
  | null;

function layerRank(def: NonNullable<ReturnType<typeof getDef>>): number {
  if (def.layer === "object") return 3;
  if (def.layer === "floor") return 0;
  return 1;
}

function isFloorish(def: NonNullable<ReturnType<typeof getDef>>): boolean {
  return def.layer === "floor" || def.isWalkable === true || def.height <= 6;
}

export function pick(px: number, py: number, room: Room, cam: Cam): Pick {
  type Candidate = {
    uid: string;
    hitHeight: number;
    depth: number;
    rank: number;
    itemHeight: number;
  };

  let best: Candidate | null = null;

  for (const it of room.items) {
    const def = getDef(it.defId);
    if (!def) continue;

    const tiles = tilesOf(def, it.x, it.y, it.rot);
    const floorish = isFloorish(def);
    const testHeight = floorish
      ? Math.max(def.height, 4)
      : def.height + Math.max(8, def.height * 0.15);
    let hitHeight: number | null = null;
    for (const tile of tiles) {
      const z = columnHitHeight(px, py, tile.x, tile.y, testHeight, cam);
      if (z !== null && (hitHeight === null || z > hitHeight)) hitHeight = z;
    }
    if (hitHeight === null) continue;

    if (floorish && hitHeight > Math.max(6, def.height + 2)) continue;

    const rank = layerRank(def);
    const depth = itemDepth(it);
    const itemHeight = def.height;
    const sameTouchHeight = best !== null && Math.abs(hitHeight - best.hitHeight) <= 0.5;
    const better =
      !best ||
      rank > best.rank ||
      (rank === best.rank && hitHeight > best.hitHeight + 0.5) ||
      (rank === best.rank && sameTouchHeight && itemHeight > best.itemHeight) ||
      (rank === best.rank && sameTouchHeight && itemHeight === best.itemHeight && depth > best.depth);

    if (better) best = { uid: it.uid, hitHeight, depth, rank, itemHeight };
  }
  if (best) return { kind: "item", uid: best.uid };
  const t = tileAt(px, py, cam);
  if (t.x >= 0 && t.y >= 0 && t.x < room.cols && t.y < room.rows) return { kind: "tile", ...t };
  return null;
}
