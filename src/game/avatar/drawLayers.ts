import { project, type Cam } from "@/game/iso";
import { getLayer } from "@/game/avatar/catalog";
import { LAYER_ORDER, type AvatarFigure, type LayerSlot } from "@/game/avatar/layers";

export type LayerPose = "idle" | "walk" | "sit" | "lay" | "dance";

const imageCache = new Map<string, HTMLImageElement>();
const FACING_COLUMN = [4, 3, 2, 1, 0, 7, 6, 5] as const;

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
    z?: number;
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

  const baseZ = opts.z ?? 0;
  const [sx, sy] = project(x, y, baseZ + bob - sitDrop, cam);
  const u = cam.scale;
  const h = 57 * u * (pose === "sit" ? 0.78 : pose === "lay" ? 0.46 : 1);
  const smoothBody = getLayer(figure.body)?.procedural === "smooth-body";

  // sombra
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  const ground = project(x, y, baseZ, cam);
  ctx.beginPath();
  ctx.ellipse(ground[0], ground[1], 10 * u, 4 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy - h * 0.15);
  if (pose === "lay") ctx.rotate(-Math.PI / 2);

  for (const slot of LAYER_ORDER) {
    // This full-body mannequin intentionally has no clothes. Keep face and
    // hair layers available, while preventing selected outfit layers from
    // being drawn over it.
    if (smoothBody && (slot === "shirt" || slot === "pants" || slot === "shoes")) continue;
    const id = figure[slot as keyof AvatarFigure];
    const def = getLayer(id);
    if (!def) continue;
    if (def.color === "transparent" && !def.sprite) continue;

    if (def.sprite) {
      const img = layerImage(def.sprite);
      if (img) {
        const columns = Math.max(1, def.frameColumns ?? 1);
        const facing = opts.facing ?? 4;
        const column = def.frameColumns ? FACING_COLUMN[facing] : 0;
        const frame = def.frame ?? {
          x: column * (img.naturalWidth / columns),
          y: 0,
          w: img.naturalWidth / columns,
          h: img.naturalHeight,
        };
        const aspect = frame.w / frame.h;
        const drawH = h;
        const drawW = drawH * aspect;
        ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, -drawW / 2, -h * 0.85, drawW, drawH);
        continue;
      }
      // A sprite-backed body is authoritative. Do not flash the old procedural
      // mannequin over it while the image is still loading.
      if (slot === "body") continue;
    }

    if (def.color) {
      if (slot === "body" && def.procedural === "smooth-body") {
        drawSmoothBody(ctx, def.color, h, opts.facing ?? 4);
      } else {
        drawProceduralPart(ctx, slot, def.color, h, def.id);
      }
    }
  }

  if (opts.handsPocket && pose !== "walk") {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(-h * 0.12, -h * 0.37, h * 0.24, h * 0.055);
  }

  ctx.restore();

  // nome
  if (opts.name) {
    const [nx, ny] = project(x, y, baseZ + 52, cam);
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

/** Resolution-independent, featureless body silhouette with soft Noir shading. */
function drawSmoothBody(ctx: CanvasRenderingContext2D, color: string, h: number, facing: number): void {
  // Side-facing views are narrower, while the remaining directions retain the
  // full silhouette. The same anchor and height are used in every direction.
  const profileScale = facing === 2 || facing === 6 ? 0.72 : [1, 3, 5, 7].includes(facing) ? 0.9 : 1;
  ctx.save();
  ctx.scale(h * profileScale, h);

  const skin = ctx.createLinearGradient(-0.17, 0, 0.18, 0);
  skin.addColorStop(0, shadeSkin(color, -13));
  skin.addColorStop(0.28, shadeSkin(color, 3));
  skin.addColorStop(0.68, color);
  skin.addColorStop(1, shadeSkin(color, -10));

  ctx.beginPath();
  ctx.moveTo(-0.085, -0.86);
  // Smooth, blank head and neck.
  ctx.bezierCurveTo(-0.176, -0.86, -0.198, -0.784, -0.188, -0.698);
  ctx.bezierCurveTo(-0.183, -0.638, -0.153, -0.599, -0.112, -0.578);
  ctx.lineTo(-0.112, -0.542);
  // Left shoulder and arm, with a rounded hand.
  ctx.bezierCurveTo(-0.22, -0.535, -0.274, -0.494, -0.283, -0.424);
  ctx.lineTo(-0.286, -0.187);
  ctx.bezierCurveTo(-0.286, -0.151, -0.268, -0.132, -0.244, -0.132);
  ctx.bezierCurveTo(-0.222, -0.132, -0.211, -0.148, -0.211, -0.174);
  ctx.lineTo(-0.207, -0.402);
  ctx.bezierCurveTo(-0.205, -0.43, -0.185, -0.432, -0.181, -0.4);
  ctx.lineTo(-0.174, -0.205);
  // Waist and left leg; the groin remains a plain, closed silhouette.
  ctx.bezierCurveTo(-0.17, -0.16, -0.137, -0.139, -0.096, -0.137);
  ctx.lineTo(-0.102, 0.103);
  ctx.bezierCurveTo(-0.103, 0.135, -0.086, 0.15, -0.056, 0.15);
  ctx.lineTo(-0.014, 0.15);
  ctx.bezierCurveTo(-0.002, 0.15, 0.004, 0.14, 0.004, 0.126);
  ctx.lineTo(0.004, -0.105);
  ctx.bezierCurveTo(0.004, -0.128, 0.013, -0.139, 0.025, -0.139);
  ctx.bezierCurveTo(0.038, -0.139, 0.045, -0.127, 0.045, -0.105);
  ctx.lineTo(0.045, 0.126);
  ctx.bezierCurveTo(0.045, 0.14, 0.052, 0.15, 0.065, 0.15);
  ctx.lineTo(0.111, 0.15);
  ctx.bezierCurveTo(0.14, 0.15, 0.154, 0.134, 0.15, 0.105);
  ctx.lineTo(0.132, -0.137);
  // Right waist, arm and hand.
  ctx.bezierCurveTo(0.174, -0.143, 0.195, -0.164, 0.198, -0.201);
  ctx.lineTo(0.202, -0.4);
  ctx.bezierCurveTo(0.203, -0.432, 0.223, -0.43, 0.225, -0.402);
  ctx.lineTo(0.229, -0.174);
  ctx.bezierCurveTo(0.229, -0.148, 0.241, -0.132, 0.262, -0.132);
  ctx.bezierCurveTo(0.286, -0.132, 0.304, -0.151, 0.304, -0.187);
  ctx.lineTo(0.301, -0.424);
  ctx.bezierCurveTo(0.292, -0.494, 0.238, -0.535, 0.13, -0.542);
  ctx.lineTo(0.13, -0.578);
  ctx.bezierCurveTo(0.171, -0.599, 0.201, -0.638, 0.206, -0.698);
  ctx.bezierCurveTo(0.216, -0.784, 0.194, -0.86, 0.103, -0.86);
  ctx.closePath();

  ctx.fillStyle = skin;
  ctx.strokeStyle = "rgba(28, 20, 19, 0.48)";
  ctx.lineWidth = 0.008;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fill();
  ctx.stroke();

  // Quiet light on the shoulders and forearms; no internal anatomical marks.
  ctx.strokeStyle = "rgba(255, 235, 211, 0.22)";
  ctx.lineWidth = 0.009;
  ctx.beginPath();
  ctx.moveTo(-0.235, -0.465);
  ctx.quadraticCurveTo(-0.246, -0.39, -0.244, -0.27);
  ctx.moveTo(0.254, -0.465);
  ctx.quadraticCurveTo(0.263, -0.39, 0.261, -0.27);
  ctx.moveTo(-0.075, -0.51);
  ctx.quadraticCurveTo(0, -0.49, 0.075, -0.51);
  ctx.stroke();
  ctx.restore();
}

function shadeSkin(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
  const channels = [0, 2, 4].map((offset) => Math.max(0, Math.min(255, parseInt(value.slice(offset, offset + 2), 16) + amount)));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
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
