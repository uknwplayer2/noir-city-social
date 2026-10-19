import { getDef, getFloor, getLook, getWall } from "@/game/catalog";
import { itemDepth, project, TILE_H, TILE_W, WALL_H, type Cam } from "@/game/iso";
import { dims, doorTile, mapPoint, tilesOf } from "@/game/logic";
import type { Facing, FurniDef, Look, Occupant, Piece, Placed, Room, Rot } from "@/game/types";
import classicSprite from "@/game/assets/avatars/classic.png";
import executiveSprite from "@/game/assets/avatars/executive.png";
import burgundySprite from "@/game/assets/avatars/burgundy.png";
import linenSprite from "@/game/assets/avatars/linen.png";
import walkBarro from "@/game/assets/avatars/walk-barro.png";
import walkRio from "@/game/assets/avatars/walk-rio.png";
import walkNoite from "@/game/assets/avatars/walk-noite.png";
import walkFlor from "@/game/assets/avatars/walk-flor.png";

export type Ghost = {
  defId: string;
  x: number;
  y: number;
  rot: Rot;
  ok: boolean;
};

export type ActorDraw = {
  x: number;
  y: number;
  dir: Rot;
  facing?: Facing;
  phase: number;
  walking: boolean;
  name: string;
  lookId: string;
  bubbles: { text: string; author: string; x: number; y: number; age: number; duration: number }[];
  handsPocket: boolean;
};

const BAD = { top: "#e08989", left: "#c46464", right: "#a44e4e" };
const AVATAR_SPRITES: Record<string, string> = {
  barro: classicSprite,
  rio: executiveSprite,
  noite: burgundySprite,
  flor: linenSprite,
};
const WALK_SPRITES: Record<string, string> = { barro: walkBarro, rio: walkRio, noite: walkNoite, flor: walkFlor };
const avatarImages = new Map<string, HTMLImageElement>();
const furnitureImages = new Map<string, HTMLImageElement>();
function furnitureImage(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let image = furnitureImages.get(url);
  if (!image) { image = new Image(); image.src = url; furnitureImages.set(url, image); }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

function walkImage(lookId: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const url = WALK_SPRITES[lookId];
  if (!url) return null;
  const key = `walk:${lookId}`;
  let image = avatarImages.get(key);
  if (!image) {
    image = new Image();
    image.src = url;
    avatarImages.set(key, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

function avatarImage(lookId: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const url = AVATAR_SPRITES[lookId];
  if (!url) return null;
  let image = avatarImages.get(lookId);
  if (!image) {
    image = new Image();
    image.src = url;
    avatarImages.set(lookId, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  room: Room,
  actor: ActorDraw,
  cam: Cam,
  opts: {
    ghost: Ghost | null;
    hideUid: string | null;
    selectedUid: string | null;
    hover: { x: number; y: number } | null;
    showGrid: boolean;
    path: { x: number; y: number }[];
    time: number;
    nexo: ActorDraw | null;
  },
): void {
  ctx.clearRect(0, 0, w, h);
  const backdrop = ctx.createLinearGradient(0, 0, w, h);
  backdrop.addColorStop(0, "#12151e");
  backdrop.addColorStop(0.52, "#21191b");
  backdrop.addColorStop(1, "#100f14");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, w, h);

  for (let sum = 0; sum < room.cols + room.rows; sum++) {
    for (let x = 0; x < room.cols; x++) {
      const y = sum - x;
      if (y < 0 || y >= room.rows) continue;
      drawFloorTile(ctx, room, x, y, cam, opts.showGrid, opts.hover);
    }
  }
  for (const item of room.items) {
    if (item.defId === "luminaria") drawWarmPool(ctx, item.x + 0.5, item.y + 0.5, cam);
  }

  const wall = getWall(room.wallId);
  for (let y = 0; y < room.rows; y++) {
    const door = y === doorTile(room).y;
    drawWall(ctx, 0, y, 0, y + 1, wall.color, wall.alt, cam);
    if (door) drawDoor(ctx, y, cam);
  }
  for (let x = 0; x < room.cols; x++) {
    drawWall(ctx, x, 0, x + 1, 0, shift(wall.color, -18), shift(wall.alt, -18), cam);
  }
  if (room.cols >= 4) {
    if (room.name === "Rooftop Night") { for (let x = 0; x + 3 <= room.cols; x += 3) drawWindow(ctx, x, cam); }
    else drawWindow(ctx, Math.min(1, room.cols - 3), cam);
  }

  type Ent = { depth: number; layer: number; draw: () => void };
  const ents: Ent[] = [];

  for (const item of room.items) {
    if (item.uid === opts.hideUid) continue;
    const def = getDef(item.defId);
    if (!def) continue;
    ents.push({
      depth: def.layer === "floor" ? item.x + item.y - 0.5 : itemDepth(item),
      layer: def.layer === "floor" ? 0 : 2,
      draw: () => drawPlaced(ctx, def, item.x, item.y, item.rot, cam, 1, true, 0.72, item.mirror ?? false),
    });
  }

  if (opts.ghost) {
    const def = getDef(opts.ghost.defId);
    if (def) {
      const fake: Placed = { uid: "ghost", defId: def.id, x: opts.ghost.x, y: opts.ghost.y, rot: opts.ghost.rot };
      ents.push({
        depth: itemDepth(fake) + 0.1,
        layer: 2,
        draw: () => drawPlaced(ctx, def, opts.ghost!.x, opts.ghost!.y, opts.ghost!.rot, cam, 0.62, opts.ghost!.ok),
      });
    }
  }

  ents.push({
    depth: actor.x + actor.y,
    layer: 3,
    draw: () =>
      drawAvatar(ctx, actor.x, actor.y, actor.dir, actor.phase, actor.walking, getLook(actor.lookId), actor.name, actor.handsPocket, cam, actor.facing),
  });

  for (const o of room.occupants) {
    if (o.id === "nexo-roommate" && opts.nexo) continue;
    ents.push({
      depth: o.x + o.y + 0.5,
      layer: 3,
      draw: () => drawOccupant(ctx, o, cam),
    });
  }

  if (opts.nexo) {
    const nexo = opts.nexo;
    ents.push({
      depth: nexo.x + nexo.y,
      layer: 3,
      draw: () => drawAvatar(ctx, nexo.x, nexo.y, nexo.dir, nexo.phase, nexo.walking, getLook(nexo.lookId), nexo.name, false, cam, nexo.facing),
    });
  }

  ents.sort((a, b) => a.depth - b.depth || a.layer - b.layer);
  for (const e of ents) e.draw();
  for (const bubble of actor.bubbles as { text: string; author: string; x: number; y: number; age: number; duration: number }[]) {
    const [bx, by] = project(bubble.x, bubble.y, 67, cam);
    const drift = bubble.duration ? Math.min(bubble.age * 9, 90) : Math.min(bubble.age * 9, 180);
    drawBubble(ctx, bx, Math.max(24, by - drift), `${bubble.author}: ${bubble.text}`);
  }

  if (opts.selectedUid) {
    const item = room.items.find((i) => i.uid === opts.selectedUid);
    const def = item ? getDef(item.defId) : null;
    if (item && def) strokeTiles(ctx, tilesOf(def, item.x, item.y, item.rot), cam, opts.time, "#f0a04b");
  }
  if (opts.ghost) {
    const def = getDef(opts.ghost.defId);
    if (def) {
      strokeTiles(
        ctx,
        tilesOf(def, opts.ghost.x, opts.ghost.y, opts.ghost.rot),
        cam,
        opts.time,
        opts.ghost.ok ? "#7dcea0" : "#e07070",
      );
    }
  }

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.18, w * 0.5, h * 0.48, Math.max(w, h) * 0.76);
  vignette.addColorStop(0, "rgba(8, 9, 14, 0)");
  vignette.addColorStop(1, "rgba(7, 8, 13, 0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  room: Room,
  x: number,
  y: number,
  cam: Cam,
  grid: boolean,
  hover: { x: number; y: number } | null,
): void {
  const floor = getFloor(room.floorId);
  const alt = (x + y) % 2 === 0;
  const rooftop = room.name === "Rooftop Night";
  const zone = rooftopFloorZone(x, y);
  const floorColor = rooftop ? (zone === "pool" ? "#363a40" : zone === "bar" ? "#3a3436" : zone === "lounge" ? "#40383a" : "#302f35") : floor.color;
  const floorAlt = rooftop ? "#282a30" : floor.alt;
  const baseColor = room.pattern === "xadrez" ? (alt ? floorColor : floorAlt) : alt ? floorColor : mix(floorColor, floorAlt, rooftop ? 0.24 : 0.35);
  const windowGlow = rooftop ? 0 : Math.max(0, 1 - Math.abs(x + 0.5 - 3.5) / 4) * Math.max(0, 1 - y / 5) * 0.2;
  const color = mix(baseColor, rooftop ? "#816141" : "#916044", windowGlow);
  fillDiamond(ctx, x, y, cam, color);
  ctx.save();
  traceDiamond(ctx, x, y, cam);
  ctx.clip();
  const seed = (x * 127 + y * 311 + 41) >>> 0;
  for (let n = 0; n < 8; n++) {
    const hash = (seed * (n + 17) * 1664525 + 1013904223) >>> 0;
    const u = 0.12 + (hash % 760) / 1000;
    const v = 0.12 + ((hash >>> 9) % 760) / 1000;
    const [px, py] = project(x + u, y + v, 0, cam);
    ctx.fillStyle = n % 3 === 0 ? "rgba(235, 194, 128, 0.15)" : "rgba(8, 9, 13, 0.2)";
    ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, cam.scale * 1.4), Math.max(1, cam.scale * 0.8));
  }
  ctx.restore();
  if (x === 0 || y === 0) fillDiamond(ctx, x, y, cam, "rgba(0,0,0,0.12)");
  if (room.pattern === "tabua") {
    ctx.save();
    traceDiamond(ctx, x, y, cam);
    ctx.clip();
    ctx.strokeStyle = "rgba(210, 174, 112, 0.2)";
    ctx.lineWidth = Math.max(1, cam.scale * 0.8);
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const a = project(x + t * 0.15, y + (1 - t) * 0.85, 0, cam);
      const b = project(x + 0.85 + t * 0.1, y + t * 0.1, 0, cam);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (room.pattern === "lajota") {
    traceInset(ctx, x, y, 0.12, cam);
    ctx.strokeStyle = "rgba(12, 13, 18, 0.58)";
    ctx.lineWidth = Math.max(1, cam.scale * 1.15);
    ctx.stroke();
    traceInset(ctx, x, y, 0.16, cam);
    ctx.strokeStyle = "rgba(213, 172, 105, 0.19)";
    ctx.lineWidth = Math.max(1, cam.scale * 0.55);
    ctx.stroke();
  }
  if (rooftop) {
    traceDiamond(ctx, x, y, cam); ctx.strokeStyle = "rgba(203, 163, 96, 0.2)"; ctx.lineWidth = Math.max(1, cam.scale * 0.7); ctx.stroke();
    if (zone !== rooftopFloorZone(x - 1, y) || zone !== rooftopFloorZone(x, y - 1)) { traceInset(ctx, x, y, 0.08, cam); ctx.strokeStyle = "rgba(219, 176, 105, 0.42)"; ctx.lineWidth = Math.max(1, cam.scale * 1.05); ctx.stroke(); }
  }
  if (grid) {
    traceDiamond(ctx, x, y, cam);
    ctx.strokeStyle = "rgba(211, 167, 98, 0.42)";
    ctx.lineWidth = Math.max(1, cam.scale * 0.75);
    ctx.stroke();
  }
  if (hover && hover.x === x && hover.y === y) {
    traceDiamond(ctx, x, y, cam);
    ctx.strokeStyle = "rgba(240, 160, 75, 0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function rooftopFloorZone(x: number, y: number): "pool" | "bar" | "lounge" | "main" {
  if ((x >= 1 && x < 5 && y >= 5 && y < 9) || (x >= 5 && x < 9 && y >= 1 && y < 5)) return "pool";
  if ((x >= 2 && x < 6 && y >= 10 && y < 14) || (x >= 10 && x < 14 && y >= 2 && y < 6)) return "lounge";
  if ((x >= 6 && x < 10 && y >= 1 && y < 5) || (x >= 1 && x < 5 && y >= 6 && y < 10)) return "bar";
  return "main";
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  shade: string,
  cam: Cam,
): void {
  const wallPts = [project(x0, y0, 0, cam), project(x1, y1, 0, cam), project(x1, y1, WALL_H, cam), project(x0, y0, WALL_H, cam)];
  const wallGradient = ctx.createLinearGradient(wallPts[3][0], wallPts[3][1], wallPts[0][0], wallPts[0][1]);
  wallGradient.addColorStop(0, shift(color, 10));
  wallGradient.addColorStop(0.55, color);
  wallGradient.addColorStop(1, shift(color, -20));
  quad(ctx, wallPts, wallGradient);
  quad(ctx, [project(x0, y0, 0, cam), project(x1, y1, 0, cam), project(x1, y1, 14, cam), project(x0, y0, 14, cam)], shade);
  const topA = project(x0, y0, WALL_H, cam);
  const topB = project(x1, y1, WALL_H, cam);
  ctx.beginPath();
  ctx.moveTo(topA[0], topA[1]);
  ctx.lineTo(topB[0], topB[1]);
  ctx.strokeStyle = "rgba(221, 176, 105, 0.62)";
  ctx.lineWidth = Math.max(1, cam.scale * 1.1);
  ctx.stroke();
  const trimA = project(x0, y0, 18, cam);
  const trimB = project(x1, y1, 18, cam);
  ctx.beginPath();
  ctx.moveTo(trimA[0], trimA[1]);
  ctx.lineTo(trimB[0], trimB[1]);
  ctx.strokeStyle = "rgba(11, 12, 17, 0.52)";
  ctx.lineWidth = Math.max(2, cam.scale * 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(trimA[0], trimA[1] - cam.scale * 1.8);
  ctx.lineTo(trimB[0], trimB[1] - cam.scale * 1.8);
  ctx.strokeStyle = "rgba(205, 159, 92, 0.72)";
  ctx.lineWidth = Math.max(1, cam.scale * 1.3);
  ctx.stroke();
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const panelTop = project(midX, midY, 91, cam);
  const panelBottom = project(midX, midY, 29, cam);
  ctx.beginPath();
  ctx.moveTo(panelTop[0], panelTop[1]);
  ctx.lineTo(panelBottom[0], panelBottom[1]);
  ctx.strokeStyle = "rgba(225, 186, 121, 0.17)";
  ctx.lineWidth = Math.max(1, cam.scale);
  ctx.stroke();
}

function drawDoor(ctx: CanvasRenderingContext2D, y: number, cam: Cam): void {
  quad(
    ctx,
    [
      project(0, y + 0.16, 0, cam),
      project(0, y + 0.86, 0, cam),
      project(0, y + 0.86, WALL_H * 0.74, cam),
      project(0, y + 0.16, WALL_H * 0.74, cam),
    ],
    "#24171c",
  );
  quad(
    ctx,
    [
      project(0, y + 0.16, WALL_H * 0.74, cam),
      project(0, y + 0.86, WALL_H * 0.74, cam),
      project(0, y + 0.86, WALL_H * 0.8, cam),
      project(0, y + 0.16, WALL_H * 0.8, cam),
    ],
    "#9a713f",
  );
  const a = project(0, y + 0.2, WALL_H * 0.67, cam);
  const b = project(0, y + 0.2, WALL_H * 0.18, cam);
  ctx.strokeStyle = "rgba(221, 179, 109, 0.72)";
  ctx.lineWidth = Math.max(1, cam.scale * 1.1);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.fillStyle = "#e4bd76";
  ctx.beginPath();
  ctx.arc(a[0] + cam.scale * 2.2, (a[1] + b[1]) / 2, Math.max(1.5, cam.scale * 1.6), 0, Math.PI * 2);
  ctx.fill();
}

function drawWarmPool(ctx: CanvasRenderingContext2D, x: number, y: number, cam: Cam): void {
  const [px, py] = project(x, y, 0, cam);
  const rx = TILE_W * 1.55 * cam.scale;
  const ry = TILE_H * 1.4 * cam.scale;
  const light = ctx.createRadialGradient(px, py, 0, px, py, rx);
  light.addColorStop(0, "rgba(255, 190, 102, 0.3)");
  light.addColorStop(0.42, "rgba(218, 133, 69, 0.13)");
  light.addColorStop(1, "rgba(210, 121, 51, 0)");
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, cam: Cam): void {
  const l = x + 0.13;
  const r = x + 2.87;
  const windowPts = [project(l, 0, 36, cam), project(r, 0, 36, cam), project(r, 0, 99, cam), project(l, 0, 99, cam)];
  quad(ctx, [project(x, 0, 31, cam), project(x + 3, 0, 31, cam), project(x + 3, 0, 104, cam), project(x, 0, 104, cam)], "#17171d");
  quad(ctx, windowPts, "#28354b");
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(windowPts[0][0], windowPts[0][1]);
  windowPts.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
  ctx.closePath();
  ctx.clip();
  const sky = ctx.createLinearGradient(windowPts[3][0], windowPts[3][1], windowPts[0][0], windowPts[0][1]);
  sky.addColorStop(0, "#312c48");
  sky.addColorStop(0.52, "#a04e45");
  sky.addColorStop(1, "#e4a35e");
  ctx.fillStyle = sky;
  ctx.fillRect(Math.min(...windowPts.map((p) => p[0])), Math.min(...windowPts.map((p) => p[1])), Math.abs(windowPts[1][0] - windowPts[0][0]) + 8, Math.abs(windowPts[3][1] - windowPts[0][1]) + 8);
  for (let i = 0; i < 8; i++) {
    const bx = l + 0.08 + i * 0.34;
    const bw = 0.2 + (i % 3) * 0.07;
    const bh = 13 + ((i * 17 + 11) % 31);
    const pts = [project(bx, 0, 38, cam), project(bx + bw, 0, 38, cam), project(bx + bw, 0, 38 + bh, cam), project(bx, 0, 38 + bh, cam)];
    quad(ctx, pts, i % 2 ? "#252631" : "#1b202b");
    for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
      if ((i * 5 + row * 3 + col) % 4 === 0) continue;
      const a = project(bx + 0.035 + col * 0.085, 0, 42 + row * 6, cam);
      ctx.fillStyle = row % 2 ? "rgba(234, 169, 90, 0.74)" : "rgba(255, 207, 128, 0.58)";
      ctx.fillRect(Math.round(a[0]), Math.round(a[1]), Math.max(1.5, cam.scale * 2), Math.max(1.5, cam.scale * 2));
    }
  }
  for (let i = 0; i < 7; i++) {
    const p = project(l + 0.18 + i * 0.38, 0, 83 + (i % 3) * 4, cam);
    ctx.fillStyle = "rgba(255, 223, 171, 0.78)";
    ctx.fillRect(Math.round(p[0]), Math.round(p[1]), Math.max(1.5, cam.scale * 1.7), Math.max(1.5, cam.scale * 1.7));
  }
  ctx.restore();
  const frame = [project(l, 0, 36, cam), project(r, 0, 36, cam), project(r, 0, 99, cam), project(l, 0, 99, cam)];
  ctx.beginPath();
  ctx.moveTo(frame[0][0], frame[0][1]);
  frame.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
  ctx.closePath();
  ctx.strokeStyle = "#c99b5d";
  ctx.lineWidth = Math.max(2, cam.scale * 3.2);
  ctx.stroke();
  const mullion = project(x + 1.5, 0, 36, cam);
  const mullionTop = project(x + 1.5, 0, 99, cam);
  ctx.beginPath();
  ctx.moveTo(mullion[0], mullion[1]);
  ctx.lineTo(mullionTop[0], mullionTop[1]);
  ctx.strokeStyle = "#332a2a";
  ctx.lineWidth = Math.max(2, cam.scale * 2.2);
  ctx.stroke();
}

export function drawPlaced(
  ctx: CanvasRenderingContext2D,
  def: FurniDef,
  ax: number,
  ay: number,
  rot: Rot,
  cam: Cam,
  alpha: number,
  ok = true,
  renderScale = 0.72,
  mirror = false,
): void {
  const { w, d } = dims(def, rot);
  const [sx, sy] = project(ax + w / 2, ay + d / 2, 1, cam);
  ctx.save();
  ctx.fillStyle = "rgba(40, 24, 12, 0.2)";
  ctx.beginPath();
  ctx.ellipse(sx, sy, w * 16 * cam.scale, d * 9 * cam.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const center = project(ax + w / 2, ay + d / 2, 0, cam);
  if (def.sprite) {
    const image = furnitureImage(def.sprite);
    if (image) {
      const frameIndex = mirror ? [1, 0, 3, 2][rot] : rot;
      const frame = def.spriteFrames?.[frameIndex];
      const sourceX = frame?.x ?? 0;
      const sourceY = frame?.y ?? 0;
      const sourceW = frame?.width ?? image.naturalWidth;
      const sourceH = frame?.height ?? image.naturalHeight;
      const spriteW = (w + d) * (TILE_W / 2) * cam.scale * (def.spriteScale ?? 1);
      const spriteH = spriteW * sourceH / sourceW;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(center[0], center[1]);
      ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, -spriteW / 2, -spriteH, spriteW, spriteH); ctx.restore();
    }
    return;
  }
  const pieces = [...def.pieces].sort((a, b) => pieceDepth(a, rot, def.w, def.d, ax, ay) - pieceDepth(b, rot, def.w, def.d, ax, ay));
  ctx.save();
  ctx.translate(center[0], center[1]);
  ctx.scale(renderScale, renderScale);
  ctx.translate(-center[0], -center[1]);
  for (const piece of pieces) drawPiece(ctx, piece, rot, def.w, def.d, ax, ay, cam, alpha, ok);
  ctx.restore();
}

function pieceDepth(p: Piece, rot: Rot, w: number, d: number, ax: number, ay: number): number {
  if (p.kind === "box") {
    const corners: [number, number][] = [
      [p.x, p.y],
      [p.x + p.w, p.y],
      [p.x + p.w, p.y + p.d],
      [p.x, p.y + p.d],
    ];
    let m = 0;
    for (const [lx, ly] of corners) {
      const [mx, my] = mapPoint(lx, ly, rot, w, d);
      m = Math.max(m, ax + mx + ay + my);
    }
    return m + p.z * 0.001;
  }
  const [mx, my] = mapPoint(p.cx, p.cy, rot, w, d);
  return ax + mx + ay + my + (p.kind === "blob" ? p.z : p.z) * 0.001;
}

function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  rot: Rot,
  w: number,
  d: number,
  ax: number,
  ay: number,
  cam: Cam,
  alpha: number,
  ok: boolean,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (piece.kind === "box") {
    const pts: [number, number][] = [
      [piece.x, piece.y],
      [piece.x + piece.w, piece.y],
      [piece.x + piece.w, piece.y + piece.d],
      [piece.x, piece.y + piece.d],
    ].map(([lx, ly]) => {
      const [mx, my] = mapPoint(lx, ly, rot, w, d);
      return [ax + mx, ay + my];
    });
    const top = pts.map((p) => project(p[0], p[1], piece.z + piece.h, cam));
    const bot = pts.map((p) => project(p[0], p[1], piece.z, cam));
    const cx = (top[0][0] + top[1][0] + top[2][0] + top[3][0]) / 4;
    const faces = [0, 1, 2, 3]
      .map((i) => {
        const j = (i + 1) % 4;
        return { i, j, depth: pts[i][0] + pts[j][0] + pts[i][1] + pts[j][1] };
      })
      .sort((a, b) => a.depth - b.depth);
    const left = ok ? piece.left : BAD.left;
    const right = ok ? piece.right : BAD.right;
    const topc = ok ? piece.top : BAD.top;
    for (const f of faces) {
      const mx = (top[f.i][0] + top[f.j][0]) / 2;
      quad(ctx, [bot[f.i], bot[f.j], top[f.j], top[f.i]], mx < cx ? left : right);
    }
    quad(ctx, top, topc);
    drawSurfaceDetail(ctx, top, cam, piece.x + piece.y + piece.z);
  } else if (piece.kind === "pot") {
    const [mx, my] = mapPoint(piece.cx, piece.cy, rot, w, d);
    const b = project(ax + mx, ay + my, piece.z, cam);
    const t = project(ax + mx, ay + my, piece.z + piece.h, cam);
    const rx = piece.r * (TILE_W / 2) * cam.scale;
    const ry = piece.r * (TILE_H / 2) * cam.scale;
    const topRx = rx * 0.92;
    const topRy = ry * 0.92;
    ctx.fillStyle = ok ? piece.side : BAD.right;
    ctx.beginPath();
    ctx.moveTo(b[0] - rx, b[1]);
    ctx.lineTo(t[0] - topRx, t[1]);
    ctx.ellipse(t[0], t[1], topRx, topRy, 0, Math.PI, 0, true);
    ctx.lineTo(b[0] + rx, b[1]);
    ctx.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = ok ? piece.top : BAD.top;
    ctx.beginPath();
    ctx.ellipse(t[0], t[1], topRx, topRy, 0, 0, Math.PI * 2);
    ctx.fill();
    if (piece.lip) {
      ctx.strokeStyle = ok ? piece.lip : BAD.left;
      ctx.lineWidth = Math.max(1, 2 * cam.scale);
      ctx.stroke();
    }
  } else {
    const [mx, my] = mapPoint(piece.cx, piece.cy, rot, w, d);
    const p = project(ax + mx, ay + my, piece.z, cam);
    ctx.fillStyle = ok ? piece.color : "rgba(224, 112, 112, 0.85)";
    ctx.beginPath();
    ctx.ellipse(p[0], p[1], piece.rx * (TILE_W / 2) * cam.scale, piece.ry * (TILE_H / 2) * cam.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSurfaceDetail(ctx: CanvasRenderingContext2D, pts: [number, number][], cam: Cam, seed: number): void {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
  ctx.closePath();
  ctx.clip();
  const span = Math.max(1, bottom - top);
  ctx.strokeStyle = "rgba(255, 226, 177, 0.2)";
  ctx.lineWidth = Math.max(1, cam.scale * 0.55);
  for (let i = 1; i <= 3; i++) {
    const yy = top + span * (i / 4);
    ctx.beginPath();
    ctx.moveTo(left - 2, yy);
    ctx.lineTo(right + 2, yy + cam.scale * 1.2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(18, 10, 11, 0.22)";
  ctx.beginPath();
  ctx.moveTo(left + (right - left) * 0.32, top - 2);
  ctx.lineTo(left + (right - left) * 0.32, bottom + 2);
  ctx.moveTo(left + (right - left) * 0.68, top - 2);
  ctx.lineTo(left + (right - left) * 0.68, bottom + 2);
  ctx.stroke();
  const px = left + (right - left) * (0.2 + ((seed * 19) % 51) / 100);
  const py = top + (bottom - top) * 0.35;
  ctx.fillStyle = "rgba(255, 235, 197, 0.5)";
  ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, cam.scale), Math.max(1, cam.scale * 0.55));
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
  ctx.closePath();
  ctx.strokeStyle = "rgba(6, 7, 10, 0.58)";
  ctx.lineWidth = Math.max(1, cam.scale * 0.7);
  ctx.stroke();
  ctx.restore();
}

function drawOccupant(ctx: CanvasRenderingContext2D, o: Occupant, cam: Cam): void {
  drawAvatar(ctx, o.x + 0.5, o.y + 0.5, o.dir, 0.4, false, getLook(o.lookId), o.name, false, cam);
}

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: Rot,
  phase: number,
  walking: boolean,
  look: Look,
  name: string,
  handsPocket: boolean,
  cam: Cam,
  facingOverride?: Facing,
): void {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const bob = reduce ? 0 : Math.sin(phase) * (walking ? 1.6 : 0.6);
  const feet = project(x, y, bob, cam);
  const ground = project(x, y, 0, cam);
  const u = cam.scale;
  const step = walking && !reduce ? Math.sin(phase * 2) * 3 * u : 0;
  const face = dir === 0 || dir === 3 ? 1 : -1;
  const sx = feet[0];
  const sy = feet[1];

  const sprite = avatarImage(look.id);
  const walkSheet = walkImage(look.id);
  if (sprite) {
    const spriteH = 57 * u;
    const spriteW = spriteH * (sprite.naturalWidth / sprite.naturalHeight);
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.beginPath();
    ctx.ellipse(ground[0], ground[1], spriteW * 0.47, 5 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    const facing = facingOverride ?? ([2, 4, 6, 0][dir] ?? 4);
    const facingColumn = [4, 3, 2, 1, 0, 7, 6, 5][facing];
    const animate = Boolean(walkSheet && (walking || facing !== 4));
    const frame = walking && !reduce ? Math.floor(((phase % (Math.PI * 2)) / (Math.PI * 2)) * 3) % 3 : 0;
    const motionBob = walking && !reduce ? Math.abs(Math.sin(phase * 2)) * 0.6 * u : bob;
    ctx.translate(sx, sy - spriteH / 2 + motionBob);
    ctx.imageSmoothingEnabled = true;
    if (animate && walkSheet) {
      const cellW = walkSheet.naturalWidth / 8;
      const cellH = walkSheet.naturalHeight / 3;
      const frameW = spriteH * cellW / cellH;
      ctx.drawImage(walkSheet, facingColumn * cellW, frame * cellH, cellW, cellH, -frameW / 2, -spriteH / 2, frameW, spriteH);
    } else {
      ctx.drawImage(sprite, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
    }
    ctx.restore();
    if (!animate && dir === 3) {
      ctx.save();
      ctx.fillStyle = look.hair;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 40 * u + bob, 7.1 * u, 7.4 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shift(look.hair, -25);
      ctx.fillRect(sx - 5 * u, sy - 40 * u + bob, 10 * u, 5 * u);
      ctx.fillStyle = shift(look.shirt, -18);
      round(ctx, sx - 5 * u, sy - 34 * u + bob, 10 * u, 12 * u, 3 * u);
      ctx.fill();
      ctx.strokeStyle = "rgba(15, 12, 13, 0.42)";
      ctx.lineWidth = Math.max(1, 0.8 * u);
      ctx.beginPath();
      ctx.moveTo(sx, sy - 32 * u + bob);
      ctx.lineTo(sx, sy - 23 * u + bob);
      ctx.stroke();
      ctx.restore();
    }
    if (handsPocket && !walking) {
      ctx.fillStyle = shift(look.shirt, -32);
      round(ctx, sx - 5 * u, sy - 28 * u + bob, 10 * u, 7 * u, 2.5 * u);
      ctx.fill();
      ctx.fillStyle = look.skin;
      ctx.beginPath();
      ctx.arc(sx - 1.8 * u, sy - 25.5 * u + bob, 1.4 * u, 0, Math.PI * 2);
      ctx.arc(sx + 1.8 * u, sy - 25.5 * u + bob, 1.4 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    if (name) {
      const top = sy - spriteH - 22 * u;
      ctx.save();
      ctx.font = "600 12px Outfit, sans-serif";
      const tw = ctx.measureText(name).width;
      round(ctx, sx - tw / 2 - 7, top, tw + 14, 18, 9);
      ctx.fillStyle = "rgba(18, 16, 19, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(215, 170, 102, 0.58)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#f2eadb";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, sx, top + 9);
      ctx.restore();
    }
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(ground[0], ground[1], 12 * u, 6 * u, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = look.pants;
  round(ctx, sx - 6 * u, sy - 12 * u, 4.5 * u, 12 * u, 2 * u);
  ctx.fill();
  round(ctx, sx + 1.5 * u, sy - 12 * u + step * 0.15, 4.5 * u, 12 * u, 2 * u);
  ctx.fill();
  ctx.fillStyle = "#171719";
  round(ctx, sx - 7 * u, sy - 2.5 * u + step, 7 * u, 3 * u, 1 * u);
  ctx.fill();
  round(ctx, sx + 0.5 * u, sy - 2.5 * u - step * 0.15, 7 * u, 3 * u, 1 * u);
  ctx.fill();
  ctx.fillStyle = "rgba(227, 191, 129, 0.52)";
  ctx.fillRect(sx - 5 * u, sy - 10 * u, 1 * u, 7 * u);
  ctx.fillRect(sx + 3 * u, sy - 10 * u, 1 * u, 7 * u);

  ctx.fillStyle = look.shirt;
  round(ctx, sx - 9 * u, sy - 30 * u, 18 * u, 20 * u, 6 * u);
  ctx.fill();
  quad(ctx, [[sx - 5 * u, sy - 29 * u], [sx - 1 * u, sy - 25 * u], [sx - 4 * u, sy - 17 * u], [sx - 8 * u, sy - 27 * u]], shift(look.shirt, -32));
  quad(ctx, [[sx + 5 * u, sy - 29 * u], [sx + 1 * u, sy - 25 * u], [sx + 4 * u, sy - 17 * u], [sx + 8 * u, sy - 27 * u]], shift(look.shirt, -20));
  quad(ctx, [[sx - 1.4 * u, sy - 24 * u], [sx + 1.4 * u, sy - 24 * u], [sx + 1.8 * u, sy - 14 * u], [sx, sy - 11 * u], [sx - 1.8 * u, sy - 14 * u]], "#9a713f");
  ctx.fillStyle = "#f0cd87";
  ctx.fillRect(sx - 0.8 * u, sy - 22 * u, 1.6 * u, 1.6 * u);
  ctx.fillRect(sx - 0.8 * u, sy - 17 * u, 1.6 * u, 1.6 * u);
  ctx.strokeStyle = "rgba(244, 210, 151, 0.55)";
  ctx.lineWidth = Math.max(1, u * 0.7);
  ctx.beginPath();
  ctx.moveTo(sx - 7 * u, sy - 11 * u);
  ctx.lineTo(sx + 7 * u, sy - 11 * u);
  ctx.stroke();

  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(sx - 10 * u, sy - 20 * u + step, 2.4 * u, 0, Math.PI * 2);
  ctx.arc(sx + 10 * u, sy - 20 * u - step, 2.4 * u, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.arc(sx, sy - 38 * u, 10 * u, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = look.shirt;
  ctx.beginPath();
  ctx.arc(sx, sy - 36 * u, 11 * u, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();

  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(sx + face * 1.5 * u, sy - 36 * u, 8 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.arc(sx + face * 0.5 * u, sy - 40 * u, 8 * u, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();

  ctx.fillStyle = "#171719";
  round(ctx, sx - 6.5 * u, sy - 38 * u, 5.8 * u, 4.2 * u, 1.2 * u);
  ctx.fill();
  round(ctx, sx + 0.7 * u, sy - 38 * u, 5.8 * u, 4.2 * u, 1.2 * u);
  ctx.fill();
  ctx.fillRect(sx - 1 * u, sy - 36.8 * u, 2.1 * u, 1.2 * u);
  ctx.fillStyle = "#c89a58";
  ctx.fillRect(sx - 5.1 * u, sy - 37.3 * u, 1.2 * u, 0.8 * u);
  ctx.fillRect(sx + 2.1 * u, sy - 37.3 * u, 1.2 * u, 0.8 * u);

  ctx.fillStyle = "#1c140f";
  ctx.beginPath();
  ctx.arc(sx + face * 3.2 * u, sy - 36.5 * u, 1.15 * u, 0, Math.PI * 2);
  ctx.arc(sx + face * 6.4 * u, sy - 36.2 * u, 1.15 * u, 0, Math.PI * 2);
  ctx.fill();

  if (name) {
    ctx.font = "600 12px Outfit, sans-serif";
    const tw = ctx.measureText(name).width;
    const pad = 7;
    const top = sy - 58 * u;
    ctx.fillStyle = "rgba(20, 17, 14, 0.82)";
    round(ctx, sx - tw / 2 - pad, top, tw + pad * 2, 18, 9);
    ctx.fill();
    ctx.fillStyle = "#f6f0e6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, sx, top + 9);
  }
  ctx.restore();
}

function drawBubble(ctx: CanvasRenderingContext2D, sx: number, bottom: number, text: string): number {
  ctx.font = "500 12px Outfit, sans-serif";
  const lines = wrap(ctx, text, 148).slice(0, 3);
  const widths = lines.map((ln) => ctx.measureText(ln).width);
  const tw = Math.max(24, ...widths);
  const padX = 8;
  const lineH = 15;
  const h = lines.length * lineH + 10;
  const w = tw + padX * 2;
  const x = sx - w / 2;
  const y = bottom - h - 8;
  ctx.fillStyle = "#f6f0e6";
  round(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx - 5, y + h);
  ctx.lineTo(sx + 5, y + h);
  ctx.lineTo(sx, y + h + 6);
  ctx.fill();
  ctx.fillStyle = "#1c1208";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((ln, i) => ctx.fillText(ln, sx, y + 8 + i * lineH + lineH / 2));
  return h + 14;
}

function strokeTiles(ctx: CanvasRenderingContext2D, tiles: { x: number; y: number }[], cam: Cam, time: number, color: string): void {
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (const t of tiles) {
    traceDiamond(ctx, t.x, t.y, cam);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawThumb(ctx: CanvasRenderingContext2D, w: number, h: number, defId: string, rot: Rot): void {
  const def = getDef(defId);
  ctx.clearRect(0, 0, w, h);
  if (!def) return;
  const { w: fw, d: fd } = dims(def, rot);
  const z = def.height + 8;
  const pts = [projectRaw(0, 0, 0), projectRaw(fw, 0, 0), projectRaw(0, fd, 0), projectRaw(fw, fd, z)];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min((w - 12) / Math.max(1, maxX - minX), (h - 12) / Math.max(1, maxY - minY));
  const cam: Cam = {
    scale,
    panX: w / 2 - ((minX + maxX) / 2) * scale,
    panY: h / 2 - ((minY + maxY) / 2) * scale + 4,
  };
  drawPlaced(ctx, def, 0, 0, rot, cam, 1, true, 1);
}

export function drawLookThumb(ctx: CanvasRenderingContext2D, w: number, h: number, lookId: string): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#1c1713";
  ctx.fillRect(0, 0, w, h);
  const cam: Cam = { scale: 1.55, panX: w / 2, panY: h - 16 };
  drawAvatar(ctx, 0, 0, 0, 0.8, false, getLook(lookId), "", false, cam);
}

function projectRaw(x: number, y: number, z: number): [number, number] {
  return [(x - y) * (TILE_W / 2), (x + y) * (TILE_H / 2) - z];
}

function traceDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, cam: Cam): void {
  const t = project(x, y, 0, cam);
  const r = project(x + 1, y, 0, cam);
  const b = project(x + 1, y + 1, 0, cam);
  const l = project(x, y + 1, 0, cam);
  ctx.beginPath();
  ctx.moveTo(t[0], t[1]);
  ctx.lineTo(r[0], r[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(l[0], l[1]);
  ctx.closePath();
}

function traceInset(ctx: CanvasRenderingContext2D, x: number, y: number, m: number, cam: Cam): void {
  const t = project(x + m, y + m, 0, cam);
  const r = project(x + 1 - m, y + m, 0, cam);
  const b = project(x + 1 - m, y + 1 - m, 0, cam);
  const l = project(x + m, y + 1 - m, 0, cam);
  ctx.beginPath();
  ctx.moveTo(t[0], t[1]);
  ctx.lineTo(r[0], r[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(l[0], l[1]);
  ctx.closePath();
}

function fillDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, cam: Cam, color: string): void {
  traceDiamond(ctx, x, y, cam);
  ctx.fillStyle = color;
  ctx.fill();
}

function quad(ctx: CanvasRenderingContext2D, pts: [number, number][], color: string | CanvasGradient | CanvasPattern): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function shift(hexColor: string, amount: number): string {
  const [r, g, b] = hex(hexColor).map((v) => Math.max(0, Math.min(255, v + amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

function hex(value: string): [number, number, number] {
  if (value.startsWith("rgb")) {
    const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (channels?.length === 3) return [channels[0]!, channels[1]!, channels[2]!];
  }
  const h = value.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
