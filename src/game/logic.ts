import { getDef, getFloor, getLook, getWall } from "@/game/catalog";
import { resolveFigure } from "@/game/avatar/catalog";
import { figureFromLookId, type AvatarFigure } from "@/game/avatar/layers";
import { getBubbleSize, getBubbleSpeed, getBubbleStyle } from "@/game/bubbles";
import type { Avatar, FurniDef, InvItem, Placed, Room, Rot, SaveData, Tile } from "@/game/types";
import { SAVE_VERSION } from "@/game/types";

export function dims(def: { w: number; d: number }, rot: Rot): { w: number; d: number } {
  return rot % 2 === 1 ? { w: def.d, d: def.w } : { w: def.w, d: def.d };
}

export function mapPoint(lx: number, ly: number, rot: Rot, w: number, d: number): [number, number] {
  switch (rot) {
    case 0:
      return [lx, ly];
    case 1:
      return [ly, w - lx];
    case 2:
      return [w - lx, d - ly];
    case 3:
      return [d - ly, lx];
    default:
      return [lx, ly];
  }
}

export function tilesOf(def: { w: number; d: number }, x: number, y: number, rot: Rot): Tile[] {
  const { w, d } = dims(def, rot);
  const out: Tile[] = [];
  for (let ix = 0; ix < w; ix++) {
    for (let iy = 0; iy < d; iy++) out.push({ x: x + ix, y: y + iy });
  }
  return out;
}

export function inRoom(room: { cols: number; rows: number }, t: Tile): boolean {
  return t.x >= 0 && t.y >= 0 && t.x < room.cols && t.y < room.rows;
}

export function doorTile(room: { rows: number }): Tile {
  return { x: 0, y: Math.max(0, room.rows - 1) };
}

export function isBlocked(items: Placed[], x: number, y: number, ignoreUid?: string): boolean {
  for (const it of items) {
    if (it.uid === ignoreUid) continue;
    const def = getDef(it.defId);
    if (!def?.blocks || def.isWalkable) continue;
    if (tilesOf(def, it.x, it.y, it.rot).some((t) => t.x === x && t.y === y)) return true;
  }
  return false;
}

const AVATAR_HEIGHT = 54;

export function isBlockedAtHeight(items: Placed[], x: number, y: number, z: number, ignoreUid?: string): boolean {
  for (const item of items) {
    if (item.uid === ignoreUid) continue;
    const def = getDef(item.defId);
    if (!def?.blocks || def.isWalkable || !tilesOf(def, item.x, item.y, item.rot).some((tile) => tile.x === x && tile.y === y)) continue;
    const bottom = item.z ?? 0;
    const top = bottom + def.height;
    if (z < top - 0.5 && z + AVATAR_HEIGHT > bottom + 0.5) return true;
  }
  return false;
}

export function walkSurfaceLevels(room: Room, x: number, y: number): number[] {
  const levels = new Set<number>();
  if (!isBlockedAtHeight(room.items, x, y, 0)) levels.add(0);
  for (const item of room.items) {
    const def = getDef(item.defId);
    if (!def || (!def.isWalkable && !def.canStack)) continue;
    if (!tilesOf(def, item.x, item.y, item.rot).some((tile) => tile.x === x && tile.y === y)) continue;
    const z = (item.z ?? 0) + (def.layer === "floor" ? def.height : def.stackHeight ?? def.height);
    if (!isBlockedAtHeight(room.items, x, y, z, item.uid)) levels.add(z);
  }
  return [...levels].sort((a, b) => a - b);
}

export function walkSurfaceAt(room: Room, x: number, y: number): number {
  const levels = walkSurfaceLevels(room, x, y);
  return levels[levels.length - 1] ?? 0;
}

export function tileStackHeight(items: Placed[], x: number, y: number, ignoreUid?: string): number {
  let max = 0;
  for (const item of items) {
    if (item.uid === ignoreUid) continue;
    const def = getDef(item.defId);
    if (!def || !tilesOf(def, item.x, item.y, item.rot).some((tile) => tile.x === x && tile.y === y)) continue;
    max = Math.max(max, (item.z ?? 0) + (def.stackHeight ?? def.height));
  }
  return max;
}

export function stackSurfaceHeight(item: Placed): number {
  const def = getDef(item.defId);
  return (item.z ?? 0) + (def?.stackHeight ?? def?.height ?? 0);
}

function overlaps(a: Tile[], b: Tile[]): boolean {
  return a.some((tile) => b.some((other) => tile.x === other.x && tile.y === other.y));
}

function isDescendant(items: Placed[], candidateUid: string, ancestorUid: string): boolean {
  let current = items.find((item) => item.uid === candidateUid);
  const seen = new Set<string>();
  while (current?.supportUid && !seen.has(current.uid)) {
    if (current.supportUid === ancestorUid) return true;
    seen.add(current.uid);
    current = items.find((item) => item.uid === current!.supportUid);
  }
  return false;
}

export function hasStackedChildren(items: Placed[], uid: string): boolean {
  return items.some((item) => item.supportUid === uid || isDescendant(items, item.uid, uid));
}

export function findSeatAt(room: Room, x: number, y: number): Placed | null {
  let best: Placed | null = null;
  let bestHeight = -1;
  for (const item of room.items) {
    const def = getDef(item.defId);
    if (!def?.canSit && !def?.canLay) continue;
    if (!tilesOf(def, item.x, item.y, item.rot).some((tile) => tile.x === x && tile.y === y)) continue;
    const height = def.stackHeight ?? def.height;
    if (height >= bestHeight) {
      best = item;
      bestHeight = height;
    }
  }
  return best;
}

export function canPlace(
  room: Room,
  def: FurniDef,
  x: number,
  y: number,
  rot: Rot,
  ignoreUid?: string,
  occupied: Tile[] = [],
  supportUid?: string,
  baseZOverride?: number,
): boolean {
  const tiles = tilesOf(def, x, y, rot);
  if (!tiles.length) return false;
  const support = supportUid ? room.items.find((item) => item.uid === supportUid) : undefined;
  const supportDef = support ? getDef(support.defId) : undefined;
  if (supportUid && (!support || !(supportDef?.canStack || supportDef?.isWalkable) || support.uid === ignoreUid || isDescendant(room.items, support.uid, ignoreUid ?? ""))) return false;
  const baseZ = support ? stackSurfaceHeight(support) : Math.max(0, baseZOverride ?? 0);
  if (support && !tiles.every((tile) => tilesOf(supportDef!, support.x, support.y, support.rot).some((surface) => surface.x === tile.x && surface.y === tile.y))) return false;
  for (const t of tiles) {
    if (!inRoom(room, t)) return false;
    if (def.blocks && baseZ <= 0 && occupied.some((o) => o.x === t.x && o.y === t.y)) return false;
  }
  for (const other of room.items) {
    if (other.uid === ignoreUid) continue;
    const otherDef = getDef(other.defId);
    if (!otherDef || otherDef.layer !== def.layer) continue;
    if (!overlaps(tiles, tilesOf(otherDef, other.x, other.y, other.rot))) continue;
    const otherBottom = other.z ?? 0;
    const otherTop = otherBottom + otherDef.height;
    const itemTop = baseZ + def.height;
    if (baseZ < otherTop - 0.5 && itemTop > otherBottom + 0.5) return false;
  }
  return true;
}

export function stackTopHeight(items: Placed[], uid: string): number {
  return items.reduce((height, item) => {
    return item.uid === uid || isDescendant(items, item.uid, uid) ? Math.max(height, stackSurfaceHeight(item)) : height;
  }, 0);
}

export function detachStackChildren(items: Placed[], uid: string): Placed[] {
  return items.map((item) => item.supportUid === uid ? { ...item, supportUid: undefined } : item);
}

export function findWalkPath(room: Room, start: Tile, goal: Tile, goalZ: number, allowDiagonal = room.diagonalMovement === true): Tile[] | null {
  if (!inRoom(room, start) || !inRoom(room, goal) || isBlockedAtHeight(room.items, start.x, start.y, start.z ?? 0)) return null;
  const nodeKey = (node: Tile) => `${node.x},${node.y},${Math.round((node.z ?? 0) * 10)}`;
  const startNode = { x: start.x, y: start.y, z: start.z ?? walkSurfaceAt(room, start.x, start.y) };
  const open: Tile[] = [startNode];
  const previous = new Map<string, string>();
  const distance = new Map<string, number>([[nodeKey(startNode), 0]]);
  const nodes = new Map<string, Tile>([[nodeKey(startNode), startNode]]);
  const visited = new Set<string>();
  while (open.length) {
    open.sort((a, b) => (distance.get(nodeKey(a)) ?? Infinity) - (distance.get(nodeKey(b)) ?? Infinity));
    const current = open.shift();
    if (!current) break;
    const currentKey = nodeKey(current);
    if (visited.has(currentKey)) continue;
    if (current.x === goal.x && current.y === goal.y && Math.abs((current.z ?? 0) - goalZ) < 0.5) {
      const path: Tile[] = [];
      let key = currentKey;
      while (previous.has(key)) {
        path.push(nodes.get(key)!);
        key = previous.get(key)!;
      }
      path.reverse();
      return path;
    }
    visited.add(currentKey);
    const adjacent = [current, ...neighbors(current).filter((tile) => allowDiagonal || tile.x === current.x || tile.y === current.y)];
    for (const tile of adjacent) {
      if (!inRoom(room, tile)) continue;
      const surfaces = walkSurfaceLevels(room, tile.x, tile.y);
      if (tile.x === startNode.x && tile.y === startNode.y && !surfaces.some((z) => Math.abs(z - (startNode.z ?? 0)) < 0.5)) surfaces.push(startNode.z ?? 0);
      if (tile.x === goal.x && tile.y === goal.y && !surfaces.some((z) => Math.abs(z - goalZ) < 0.5)) surfaces.push(goalZ);
      for (const z of surfaces) {
        if (isBlockedAtHeight(room.items, tile.x, tile.y, z)) continue;
        const next = { x: tile.x, y: tile.y, z };
        const nextKey = nodeKey(next);
        if (visited.has(nextKey)) continue;
        const stepCost = (tile.x === current.x && tile.y === current.y ? 0.8 : Math.hypot(tile.x - current.x, tile.y - current.y)) + Math.abs(z - (current.z ?? 0)) / 120;
        const nextDistance = (distance.get(currentKey) ?? 0) + stepCost;
        if (nextDistance >= (distance.get(nextKey) ?? Infinity)) continue;
        previous.set(nextKey, currentKey);
        distance.set(nextKey, nextDistance);
        nodes.set(nextKey, next);
        if (!open.some((node) => nodeKey(node) === nextKey)) open.push(next);
      }
    }
  }
  return null;
}

export function neighbors(t: Tile): Tile[] {
  return [
    { x: t.x + 1, y: t.y },
    { x: t.x + 1, y: t.y + 1 },
    { x: t.x, y: t.y + 1 },
    { x: t.x - 1, y: t.y + 1 },
    { x: t.x - 1, y: t.y },
    { x: t.x - 1, y: t.y - 1 },
    { x: t.x, y: t.y - 1 },
    { x: t.x + 1, y: t.y - 1 },
  ];
}

export function findPath(room: Room, start: Tile, goal: Tile, allowDiagonal = room.diagonalMovement === true): Tile[] | null {
  if (start.x === goal.x && start.y === goal.y) return [];
  if (!inRoom(room, goal) || isBlocked(room.items, goal.x, goal.y)) return null;
  if (!inRoom(room, start)) return null;
  const key = (t: Tile) => `${t.x},${t.y}`;
  const open: Tile[] = [start];
  const came = new Map<string, string>();
  const g = new Map<string, number>([[key(start), 0]]);
  const h = (t: Tile) => {
    const dx = Math.abs(t.x - goal.x);
    const dy = Math.abs(t.y - goal.y);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const f = new Map<string, number>([[key(start), h(start)]]);
  const seen = new Set<string>();
  while (open.length) {
    open.sort((a, b) => (f.get(key(a)) ?? 0) - (f.get(key(b)) ?? 0));
    const cur = open.shift();
    if (!cur) break;
    const ck = key(cur);
    if (seen.has(ck)) continue;
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: Tile[] = [];
      let k = ck;
      while (came.has(k)) {
        const [x, y] = k.split(",").map(Number);
        path.push({ x, y });
        k = came.get(k) as string;
      }
      path.reverse();
      return path;
    }
    seen.add(ck);
    for (const n of neighbors(cur)) {
      const dx = n.x - cur.x;
      const dy = n.y - cur.y;
      const diagonal = dx !== 0 && dy !== 0;
      if (diagonal && !allowDiagonal) continue;
      if (!inRoom(room, n) || isBlocked(room.items, n.x, n.y)) continue;
      if (diagonal && (isBlocked(room.items, cur.x + dx, cur.y) || isBlocked(room.items, cur.x, cur.y + dy))) continue;
      const nk = key(n);
      const ng = (g.get(ck) ?? 0) + (diagonal ? Math.SQRT2 : 1);
      if (ng < (g.get(nk) ?? Infinity)) {
        came.set(nk, ck);
        g.set(nk, ng);
        f.set(nk, ng + h(n));
        if (!open.some((o) => o.x === n.x && o.y === n.y)) open.push(n);
      }
    }
  }
  return null;
}

export function nearestFree(room: Room, origins: Tile[]): Tile | null {
  const q = origins.map((t) => ({ ...t }));
  const seen = new Set(q.map((t) => `${t.x},${t.y}`));
  while (q.length) {
    const t = q.shift();
    if (!t) break;
    if (inRoom(room, t) && !isBlocked(room.items, t.x, t.y)) return t;
    for (const n of neighbors(t)) {
      const k = `${n.x},${n.y}`;
      if (seen.has(k)) continue;
      if (n.x < -1 || n.y < -1 || n.x > room.cols || n.y > room.rows) continue;
      seen.add(k);
      q.push(n);
    }
  }
  return null;
}

export function findStand(room: Room, prefer: Tile): Tile {
  if (inRoom(room, prefer) && !isBlocked(room.items, prefer.x, prefer.y)) return prefer;
  return nearestFree(room, [prefer]) ?? { x: 0, y: Math.max(0, room.rows - 1) };
}

export function normRot(n: number): Rot {
  const r = ((Math.round(n) % 4) + 4) % 4;
  return r as Rot;
}

export function relayout(
  room: Room,
  inv: InvItem[],
  avatar: Avatar,
  cols: number,
  rows: number,
): { room: Room; inventory: InvItem[]; avatar: Avatar; returned: number } {
  const next: Room = { ...room, cols, rows, items: [] };
  const kept: Placed[] = [];
  const returned: InvItem[] = [];
  for (const it of room.items) {
    const def = getDef(it.defId);
    if (!def) continue;
    const probe: Room = { ...next, items: kept };
    if (canPlace(probe, def, it.x, it.y, it.rot, undefined, [], it.supportUid, it.z)) kept.push(it);
    else returned.push({ uid: it.uid, defId: it.defId });
  }
  next.items = kept;
  const stand = findStand(next, avatar);
  const avatarZ = stand.x === avatar.x && stand.y === avatar.y && walkSurfaceLevels(next, stand.x, stand.y).some((z) => Math.abs(z - (avatar.z ?? 0)) < 0.5)
    ? avatar.z ?? 0
    : 0;
  return {
    room: next,
    inventory: [...inv, ...returned],
    avatar: { ...avatar, x: stand.x, y: stand.y, z: avatarZ },
    returned: returned.length,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

export function repairSave(raw: unknown): SaveData | null {
  if (!isRecord(raw) || ![1, 2, 3, 4, SAVE_VERSION].includes(Number(raw.version))) return null;
  const legacyVersion = raw.version === 1;
  if (!isRecord(raw.room) || !Array.isArray(raw.inventory)) return null;
  const cols = clampInt(raw.room.cols, 4, 16, 8);
  const rows = clampInt(raw.room.rows, 4, 16, 8);
  const itemsIn = Array.isArray(raw.room.items) ? raw.room.items : [];
  const pattern = raw.room.pattern;
  const room: Room = {
    name: clip(raw.room.name, 24, "Meu canto"),
    cols,
    rows,
    floorId: getFloor(String(raw.room.floorId ?? "")).id,
    wallId: getWall(String(raw.room.wallId ?? "")).id,
    pattern: pattern === "liso" || pattern === "xadrez" || pattern === "tabua" || pattern === "lajota" ? pattern : "tabua",
    diagonalMovement: raw.room.diagonalMovement === true,
    items: [],
    occupants: [],
  };
  const inv: InvItem[] = [];
  const seen = new Set<string>();
  const takeInv = (uid: unknown, defId: unknown) => {
    if (typeof uid !== "string" || typeof defId !== "string" || !getDef(defId) || seen.has(uid)) return;
    seen.add(uid);
    inv.push({ uid, defId });
  };
  for (const entry of raw.inventory) {
    if (!isRecord(entry)) continue;
    takeInv(entry.uid, entry.defId);
  }
  for (const entry of itemsIn) {
    if (!isRecord(entry)) continue;
    const def = typeof entry.defId === "string" ? getDef(entry.defId) : null;
    const uid = entry.uid;
    if (!def || typeof uid !== "string" || seen.has(uid)) continue;
    const placed: Placed = {
      uid,
      defId: def.id,
      x: Math.round(Number(entry.x) || 0),
      y: Math.round(Number(entry.y) || 0),
      rot: normRot(Number(entry.rot) || 0),
      mirror: entry.mirror === true,
      z: typeof entry.z === "number" && Number.isFinite(entry.z) ? Math.max(0, entry.z) : 0,
      ...(typeof entry.supportUid === "string" ? { supportUid: entry.supportUid } : {}),
    };
    const support = placed.supportUid ? room.items.find((item) => item.uid === placed.supportUid) : undefined;
    if (placed.supportUid && !support) placed.supportUid = undefined;
    if (support) placed.z = stackSurfaceHeight(support);
    if (canPlace(room, def, placed.x, placed.y, placed.rot, undefined, [], placed.supportUid, placed.z)) {
      seen.add(uid);
      room.items.push(placed);
    } else {
      takeInv(uid, def.id);
    }
  }
  if (legacyVersion && room.name === "Meu canto") {
    const starterExpansion: Placed[] = [
      { uid: "st-console", defId: "aparador", x: 0, y: 3, rot: 0 },
      { uid: "st-armchair", defId: "poltrona", x: 6, y: 3, rot: 0 },
      { uid: "st-bed", defId: "cama", x: 0, y: 5, rot: 0 },
      { uid: "st-sofa-long", defId: "sofa3", x: 3, y: 6, rot: 0 },
      { uid: "st-side-lamp", defId: "abajur", x: 1, y: 4, rot: 0 },
      { uid: "st-speaker", defId: "som", x: 7, y: 3, rot: 0 },
      { uid: "st-small-plant", defId: "vaso", x: 7, y: 6, rot: 0 },
      { uid: "st-corner-table", defId: "canto", x: 6, y: 2, rot: 0 },
      { uid: "st-cushion", defId: "almofada", x: 5, y: 5, rot: 0 },
    ];
    for (const item of starterExpansion) {
      const def = getDef(item.defId);
      if (!def || seen.has(item.uid) || !canPlace(room, def, item.x, item.y, item.rot)) continue;
      seen.add(item.uid);
      room.items.push(item);
    }
  }
  const occupantsIn = Array.isArray(raw.room.occupants) ? raw.room.occupants : [];
  const nexoIn = occupantsIn.find((entry) => isRecord(entry) && entry.id === "nexo-roommate");
  if (isRecord(nexoIn) && typeof nexoIn.x === "number" && typeof nexoIn.y === "number") {
    let x = Math.max(0, Math.min(cols - 1, nexoIn.x));
    let y = Math.max(0, Math.min(rows - 1, nexoIn.y));
    if (isBlocked(room.items, Math.floor(x), Math.floor(y))) {
      let nearest: { x: number; y: number; distance: number } | null = null;
      for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
        if (isBlocked(room.items, tx, ty)) continue;
        const distance = Math.abs(tx + 0.5 - x) + Math.abs(ty + 0.5 - y);
        if (!nearest || distance < nearest.distance) nearest = { x: tx + 0.5, y: ty + 0.5, distance };
      }
      if (nearest) { x = nearest.x; y = nearest.y; }
    }
    if (!isBlocked(room.items, Math.floor(x), Math.floor(y))) room.occupants.push({ id: "nexo-roommate", kind: "npc", role: "guest", name: "Nexo", lookId: "rio", x, y, dir: normRot(Number(nexoIn.dir) || 0) });
  }
  const avatarIn = isRecord(raw.avatar) ? raw.avatar : {};
  const prefer = {
    x: clampInt(avatarIn.x, 0, cols - 1, 1),
    y: clampInt(avatarIn.y, 0, rows - 1, rows - 2),
  };
  const savedZ = typeof avatarIn.z === "number" && Number.isFinite(avatarIn.z) ? Math.max(0, Math.min(1000, avatarIn.z)) : 0;
  const savedSurfaceExists = walkSurfaceLevels(room, prefer.x, prefer.y).some((z) => Math.abs(z - savedZ) < 0.5);
  const stand = savedSurfaceExists ? prefer : findStand(room, prefer);
  const homeCandidate = isRecord(raw.homeState) ? raw.homeState : null;
  const repairedHome = homeCandidate && isRecord(homeCandidate.room) && isRecord(homeCandidate.avatar)
    ? repairSave({ ...raw, room: homeCandidate.room, avatar: homeCandidate.avatar, homeState: undefined })
    : null;
  const savedName = clip(raw.guestName, 16, "uknwplayer");
  const legacyProfile = Number(raw.version) < SAVE_VERSION && savedName !== "Visita";
  const internalMail = (Array.isArray(raw.internalMail) ? raw.internalMail : []).filter(isRecord).slice(-100).flatMap((mail) => {
    if (typeof mail.id !== "string" || typeof mail.sender !== "string" || typeof mail.recipient !== "string" || typeof mail.subject !== "string" || typeof mail.body !== "string") return [];
    return [{ id: mail.id.slice(0, 80), sender: clip(mail.sender, 16, "Equipe"), recipient: clip(mail.recipient, 16, "uknwplayer"), subject: clip(mail.subject, 80, "Sem assunto"), body: clip(mail.body, 2000, ""), sentAt: Math.max(0, Number(mail.sentAt) || 0), read: mail.read === true }];
  });
  return {
    version: SAVE_VERSION,
    entered: false,
    guestName: savedName === "Visita" ? "uknwplayer" : savedName,
    authenticated: raw.authenticated === true || legacyProfile,
    rememberDevice: raw.rememberDevice === true || legacyProfile,
    role: raw.role === "admin" || raw.role === "moderator" || raw.role === "player" ? raw.role : Number(raw.version) < SAVE_VERSION ? "admin" : "player",
    lookId: getLook(String(raw.lookId ?? "")).id,
    figure: resolveFigure((isRecord(raw.figure) ? raw.figure : figureFromLookId(String(raw.lookId ?? "barro"))) as Partial<AvatarFigure>),
    bubbleStyle: getBubbleStyle(typeof raw.bubbleStyle === "string" ? raw.bubbleStyle : "noir").id,
    bubbleSize: getBubbleSize(raw.bubbleSize),
    bubbleSpeed: getBubbleSpeed(raw.bubbleSpeed).id,
    coins: Math.max(0, Math.min(999999, Math.round(Number(raw.coins) || 0))),
    inventory: inv,
    room,
    avatar: { x: stand.x, y: stand.y, dir: normRot(Number(avatarIn.dir) || 0), z: savedSurfaceExists ? savedZ : 0 },
    ...(repairedHome ? { homeState: { room: repairedHome.room, avatar: repairedHome.avatar } } : {}),
    internalMail,
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clip(v: unknown, max: number, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const t = v.trim().slice(0, max);
  return t || fallback;
}
