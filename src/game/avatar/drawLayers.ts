import { project, type Cam } from "@/game/iso";
import { getLayer } from "@/game/avatar/catalog";
import { LAYER_ORDER, type AvatarFigure, type LayerSlot } from "@/game/avatar/layers";

export type LayerPose = "idle" | "walk" | "sit" | "lay" | "dance";

const imageCache = new Map<string, HTMLImageElement>();

function layerImage(url: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imageCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/**
 * Desenha o avatar montado por layers.
 * Sem sprites: usa formas procedurais coloridas (manequim).
 * Com sprites: desenha a imagem do layer.
 */
export function drawLayeredAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  figure: AvatarFigure,
  cam: Cam,
  opts: {
    pose?: LayerPose;
    phase?: number;
    facing?: number;
    name?: string;
    handsPocket?: boolean;
  } = {},
): void {
  const pose = opts.pose ?? "idle";
  const phase = opts.phase ?? 0;
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const sitDrop = pose === "sit" ? 10 : pose === "lay" ? 16 : 0;
  const danceBounce = pose === "dance" && !reduce ? Math.abs(Math.sin(phase * 8)) * 2.5 : 0;
  const walkBob = pose === "walk" && !reduce ? Math.sin(phase) * 1.6 : 0;
  const bob = danceBounce + walkBob;

  const [sx, sy] = project(x, y, bob - sitDrop, cam);
  const u = cam.scale;
  const h = 57 * u * (pose === "sit" ? 0.78 : pose === "lay" ? 0.46 : 1);

  // sombra
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  const ground = project(x, y, 0, cam);
  ctx.beginPath();
  ctx.ellipse(ground[0], ground[1], 10 * u, 4 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy - h * 0.15);
  if (pose === "lay") ctx.rotate(-Math.PI / 2);

  for (const slot of LAYER_ORDER) {
    const id = figure[slot as keyof AvatarFigure];
    const def = getLayer(id);
    if (!def) continue;
    if (def.color === "transparent" && !def.sprite) continue;

    if (def.sprite) {
      const img = layerImage(def.sprite);
      if (img) {
        const aspect = img.naturalWidth / img.naturalHeight;
        const drawH = h;
        const drawW = drawH * aspect;
        ctx.drawImage(img, -drawW / 2, -h * 0.85, drawW, drawH);
        continue;
      }
    }

    if (def.color) {
      drawProceduralPart(ctx, slot, def.color, h, def.id);
    }
  }

  if (opts.handsPocket && pose !== "walk") {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(-h * 0.12, -h * 0.37, h * 0.24, h * 0.055);
  }

  ctx.restore();

  // nome
  if (opts.name) {
    const [nx, ny] = project(x, y, 52, cam);
    ctx.save();
    ctx.font = `600 ${Math.max(10, 11 * u)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(opts.name, nx + 1, ny + 1);
    ctx.fillStyle = "#f0d9a8";
    ctx.fillText(opts.name, nx, ny);
    ctx.restore();
  }
}

function drawProceduralPart(
  ctx: CanvasRenderingContext2D,
  slot: LayerSlot | string,
  color: string,
  h: number,
  layerId: string,
): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, h * 0.015);

  switch (slot) {
    case "body": {
      // cabeça
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.72, h * 0.13, h * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      // pescoço
      ctx.fillRect(-h * 0.04, -h * 0.62, h * 0.08, h * 0.08);
      // tronco
      ctx.beginPath();
      ctx.moveTo(-h * 0.16, -h * 0.54);
      ctx.lineTo(h * 0.16, -h * 0.54);
      ctx.lineTo(h * 0.14, -h * 0.18);
      ctx.lineTo(-h * 0.14, -h * 0.18);
      ctx.closePath();
      ctx.fill();
      // braços
      ctx.fillRect(-h * 0.22, -h * 0.52, h * 0.07, h * 0.28);
      ctx.fillRect(h * 0.15, -h * 0.52, h * 0.07, h * 0.28);
      break;
    }
    case "eyes": {
      if (layerId === "eyes-cool") {
        ctx.fillStyle = "#111";
        ctx.fillRect(-h * 0.1, -h * 0.76, h * 0.2, h * 0.05);
        ctx.fillRect(-h * 0.11, -h * 0.75, h * 0.04, h * 0.03);
        ctx.fillRect(h * 0.07, -h * 0.75, h * 0.04, h * 0.03);
      } else if (layerId === "eyes-sleepy") {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(-h * 0.08, -h * 0.74);
        ctx.lineTo(-h * 0.02, -h * 0.74);
        ctx.moveTo(h * 0.02, -h * 0.74);
        ctx.lineTo(h * 0.08, -h * 0.74);
        ctx.stroke();
      } else if (layerId === "eyes-happy") {
        ctx.beginPath();
        ctx.arc(-h * 0.05, -h * 0.74, h * 0.025, Math.PI, 0);
        ctx.arc(h * 0.05, -h * 0.74, h * 0.025, Math.PI, 0);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(-h * 0.05, -h * 0.74, h * 0.022, h * 0.028, 0, 0, Math.PI * 2);
        ctx.ellipse(h * 0.05, -h * 0.74, h * 0.022, h * 0.028, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f5f0e8";
        ctx.beginPath();
        ctx.ellipse(-h * 0.045, -h * 0.75, h * 0.008, h * 0.01, 0, 0, Math.PI * 2);
        ctx.ellipse(h * 0.055, -h * 0.75, h * 0.008, h * 0.01, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "mouth": {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      if (layerId === "mouth-smile" || layerId === "mouth-smirk") {
        ctx.beginPath();
        ctx.arc(layerId === "mouth-smirk" ? h * 0.02 : 0, -h * 0.66, h * 0.04, 0.15, Math.PI - 0.15);
        ctx.stroke();
      } else if (layerId === "mouth-open") {
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.65, h * 0.03, h * 0.025, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-h * 0.035, -h * 0.66, h * 0.07, h * 0.012);
      }
      break;
    }
    case "hair": {
      if (layerId === "hair-none") break;
      ctx.beginPath();
      if (layerId === "hair-long") {
        ctx.ellipse(0, -h * 0.78, h * 0.15, h * 0.1, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-h * 0.15, -h * 0.78, h * 0.06, h * 0.2);
        ctx.fillRect(h * 0.09, -h * 0.78, h * 0.06, h * 0.2);
      } else {
        ctx.ellipse(0, -h * 0.8, h * 0.14, h * 0.1, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-h * 0.14, -h * 0.8, h * 0.28, h * 0.08);
      }
      break;
    }
    case "shirt": {
      ctx.beginPath();
      ctx.moveTo(-h * 0.17, -h * 0.54);
      ctx.lineTo(h * 0.17, -h * 0.54);
      ctx.lineTo(h * 0.15, -h * 0.2);
      ctx.lineTo(-h * 0.15, -h * 0.2);
      ctx.closePath();
      ctx.fill();
      // mangas
      ctx.fillRect(-h * 0.23, -h * 0.52, h * 0.08, h * 0.2);
      ctx.fillRect(h * 0.15, -h * 0.52, h * 0.08, h * 0.2);
      break;
    }
    case "pants": {
      ctx.fillRect(-h * 0.14, -h * 0.2, h * 0.13, h * 0.32);
      ctx.fillRect(h * 0.01, -h * 0.2, h * 0.13, h * 0.32);
      break;
    }
    case "shoes": {
      ctx.fillRect(-h * 0.15, h * 0.1, h * 0.14, h * 0.06);
      ctx.fillRect(h * 0.01, h * 0.1, h * 0.14, h * 0.06);
      break;
    }
    case "hat": {
      if (layerId === "hat-none") break;
      ctx.fillRect(-h * 0.16, -h * 0.88, h * 0.32, h * 0.06);
      ctx.fillRect(-h * 0.1, -h * 0.96, h * 0.2, h * 0.1);
      break;
    }
    case "accessory": {
      // placeholder
      break;
    }
  }
}
