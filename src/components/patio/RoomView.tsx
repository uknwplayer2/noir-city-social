import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronsUp, Crosshair, Minus, Plus } from "lucide-react";
import { AvatarMenu } from "@/components/patio/AvatarMenu";
import { ChatBubblePanel } from "@/components/patio/ChatBubblePanel";
import { VisuaisPanel } from "@/components/patio/VisuaisPanel";
import { blip, unlockAudio } from "@/game/audio";
import { getDef } from "@/game/catalog";
import { drawScene, type Ghost } from "@/game/draw";
import { frameCamera, pick, project, tileAt, type Cam, type Pick } from "@/game/iso";
import { canPlace, nearestFree, stackSurfaceHeight, tilesOf, walkSurfaceAt } from "@/game/logic";
import { getNexoActor, resetNexo, tickNexo } from "@/game/nexo";
import { avatarTiles, requestSeat, requestWalk, resetSim, sim, tickSim } from "@/game/sim";
import { useGame, type GameState } from "@/game/store";

declare global {
  interface Window {
    __patio?: {
      coins: () => number;
      items: () => number;
      inv: () => number;
      tile: () => { x: number; y: number };
      entered: () => boolean;
      room: () => string;
    };
  }
}

export type RoomViewHandle = { capture: () => string | null; previewStream: () => MediaStream | null; zoom: (factor: number) => void; pan: (x: number, y: number) => void; centerAvatar: () => void; frameAvatar: () => void };

const MIN_USER_SCALE = 0.45;
/** Zoom alto o suficiente para o avatar preencher boa parte da tela. */
const MAX_USER_SCALE = 7.5;
/** Escala usada pelo botão Avatar para enquadrar o personagem. */
const AVATAR_FRAME_SCALE = 5.2;

function ghostOf(s: GameState): Ghost | null {
  const occupied = avatarTiles();
  if (s.armedUid) {
    const inv = s.inventory.find((i) => i.uid === s.armedUid);
    const def = inv ? getDef(inv.defId) : null;
    if (!inv || !def || !sim.hover) return null;
    const support = sim.hoverStackUid ? s.room.items.find((item) => item.uid === sim.hoverStackUid) : undefined;
    return {
      defId: inv.defId,
      x: sim.hover.x,
      y: sim.hover.y,
      rot: s.armedRot,
      z: support ? stackSurfaceHeight(support) : 0,
      ok: canPlace(s.room, def, sim.hover.x, sim.hover.y, s.armedRot, undefined, occupied, support?.uid),
    };
  }
  if (s.movingUid) {
    const item = s.room.items.find((i) => i.uid === s.movingUid);
    const def = item ? getDef(item.defId) : null;
    if (!item || !def) return null;
    const x = sim.hover?.x ?? item.x;
    const y = sim.hover?.y ?? item.y;
    const support = sim.hoverStackUid ? s.room.items.find((candidate) => candidate.uid === sim.hoverStackUid) : undefined;
    return {
      defId: item.defId,
      x,
      y,
      rot: s.movingRot,
      z: support ? stackSurfaceHeight(support) : item.z ?? 0,
      ok: canPlace(s.room, def, x, y, s.movingRot, item.uid, occupied, support?.uid, support ? undefined : item.z),
    };
  }
  return null;
}

export const RoomView = forwardRef<RoomViewHandle, { swallowTap: () => boolean }>(function RoomView({ swallowTap }, forwardedRef) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const view = useRef({ userScale: 1, panX: 0, panY: 0 });
  const size = useRef({ w: 1, h: 1 });
  const camRef = useRef<Cam>({ scale: 1, panX: 0, panY: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const drag = useRef<{ id: number; moved: boolean; long: boolean; hit: Pick; dist: number } | null>(null);
  const bubbleBoostRef = useRef(false);
  const timer = useRef(0);
  const lastAvatarTap = useRef<{ at: number; x: number; y: number } | null>(null);
  const [avatarMenu, setAvatarMenu] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
  const [visuaisOpen, setVisuaisOpen] = useState(false);
  const [bubblesOpen, setBubblesOpen] = useState(false);
  const [bubbleBoostActive, setBubbleBoostActive] = useState(false);

  function changeBubbleBoost(active: boolean) {
    bubbleBoostRef.current = active;
    setBubbleBoostActive(active);
  }

  useEffect(() => {
    let dead = false;
    const boot = () => {
      if (dead) return;
      resetSim(useGame.getState().avatar);
      resetNexo(useGame.getState().room);
      sim.booted = true;
    };
    const unsub = useGame.persist.onFinishHydration(() => boot());
    if (useGame.persist.hasHydrated()) boot();
    window.__patio = {
      coins: () => useGame.getState().coins,
      items: () => useGame.getState().room.items.length,
      inv: () => useGame.getState().inventory.length,
      tile: () => ({ x: Math.floor(sim.x), y: Math.floor(sim.y) }),
      entered: () => useGame.getState().entered,
      room: () => useGame.getState().room.name,
    };
    return () => {
      dead = true;
      window.clearTimeout(timer.current);
      unsub();
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const fit = () => {
      const rect = parent.getBoundingClientRect();
      size.current = { w: Math.max(1, rect.width), h: Math.max(1, rect.height) };
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(size.current.w * dpr);
      canvas.height = Math.floor(size.current.h * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = canvas.getBoundingClientRect();
      zoomAt(factor, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let reportedRenderError = false;
    const loop = (now: number) => {
      try {
        const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      while (acc >= 1 / 60) {
        tickSim(1 / 60);
        const current = useGame.getState();
        tickNexo(1 / 60, current.room, { x: sim.x, y: sim.y });
        acc -= 1 / 60;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const s = useGame.getState();
        const cam = frameCamera(
          size.current.w,
          size.current.h,
          s.room.cols,
          s.room.rows,
          view.current.userScale,
          view.current.panX,
          view.current.panY,
        );
        camRef.current = cam;
        drawScene(
          ctx,
          size.current.w,
          size.current.h,
          s.room,
          {
            x: sim.x,
            y: sim.y,
            z: sim.z,
            dir: sim.dir,
            facing: sim.facing,
            phase: sim.phase,
            walking: sim.path.length > 0,
            name: s.guestName,
            lookId: s.lookId,
            figure: s.figure,
            bubbleStyle: s.bubbleStyle,
            bubbleSize: s.bubbleSize,
            bubbleSpeed: s.bubbleSpeed,
            bubbleSpeedBoost: bubbleBoostRef.current,
            bubbles: sim.bubbles,
            handsPocket: sim.handsPocket,
            state: sim.state,
            danceId: sim.danceId,
          },
          cam,
          {
            ghost: ghostOf(s),
            hideUid: s.movingUid,
            selectedUid: s.selectedUid,
            hover: sim.hover,
            showGrid: s.tool === "edit" || Boolean(s.armedUid) || Boolean(s.movingUid),
            path: sim.path,
            time: sim.time,
            nexo: s.room.occupants.some((occupant) => occupant.id === "nexo-roommate") ? getNexoActor() : null,
          },
        );
      }
      } catch (error) {
        if (!reportedRenderError) {
          console.error("Erro ao desenhar o quarto; a simulação continuará ativa.", error);
          reportedRenderError = true;
        }
      } finally {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function local(e: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function zoomAt(factor: number, point: { x: number; y: number }) {
    const room = useGame.getState().room;
    const current = frameCamera(size.current.w, size.current.h, room.cols, room.rows, view.current.userScale, view.current.panX, view.current.panY);
    const dx = (point.x - current.panX) / current.scale;
    const dy = (point.y - current.panY) / current.scale;
    const anchor = { x: (dx / 32 + dy / 16) / 2, y: (dy / 16 - dx / 32) / 2 };
    view.current.userScale = Math.min(MAX_USER_SCALE, Math.max(MIN_USER_SCALE, view.current.userScale * factor));
    const next = frameCamera(size.current.w, size.current.h, room.cols, room.rows, view.current.userScale, view.current.panX, view.current.panY);
    const projected = project(anchor.x, anchor.y, 0, next);
    view.current.panX += point.x - projected[0];
    view.current.panY += point.y - projected[1];
  }

  function avatarScreenPoint() {
    const [x, y] = project(sim.x, sim.y, sim.z, camRef.current);
    return { x, y };
  }

  function centerAvatar() {
    const point = avatarScreenPoint();
    view.current.panX += size.current.w / 2 - point.x;
    view.current.panY += size.current.h / 2 - point.y;
  }

  function frameAvatar() {
    const room = useGame.getState().room;
    view.current.userScale = Math.min(MAX_USER_SCALE, Math.max(MIN_USER_SCALE, AVATAR_FRAME_SCALE));
    const camera = frameCamera(
      size.current.w,
      size.current.h,
      room.cols,
      room.rows,
      view.current.userScale,
      view.current.panX,
      view.current.panY,
    );
    const [avatarX, avatarY] = project(sim.x, sim.y, sim.z + 26, camera);
    view.current.panX += size.current.w / 2 - avatarX;
    view.current.panY += size.current.h * 0.58 - avatarY;
  }

  useImperativeHandle(forwardedRef, () => ({
    capture: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      try { return canvas.toDataURL("image/png"); } catch { return null; }
    },
    previewStream: () => {
      const canvas = canvasRef.current;
      if (!canvas || typeof canvas.captureStream !== "function") return null;
      if (!previewStreamRef.current) previewStreamRef.current = canvas.captureStream(12);
      return previewStreamRef.current;
    },
    zoom: (factor) => zoomAt(factor, avatarScreenPoint()),
    pan: (x, y) => { view.current.panX += x; view.current.panY += y; },
    centerAvatar,
    frameAvatar,
  }));

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!sim.booted) return;
    unlockAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const room = useGame.getState().room;
    const hit = pick(p.x, p.y, room, camRef.current);
    updatePlacementHover(p, room, hit);
    drag.current = { id: e.pointerId, moved: false, long: false, hit, dist: 0 };
    window.clearTimeout(timer.current);
    const s = useGame.getState();
    const [avatarX, avatarY] = project(sim.x, sim.y, sim.z + 26, camRef.current);
    const onAvatar = Math.hypot(p.x - avatarX, p.y - avatarY) < 18 * camRef.current.scale;
    if (!onAvatar && hit?.kind === "item" && !s.homeState && !s.armedUid && !s.movingUid) {
      const uid = hit.uid;
      timer.current = window.setTimeout(() => {
        if (drag.current && !drag.current.moved) {
          drag.current.long = true;
          useGame.getState().setTool("edit");
          useGame.getState().select(uid);
          blip("ok");
        }
      }, 460);
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      if (drag.current) drag.current.moved = true;
      window.clearTimeout(timer.current);
      lastAvatarTap.current = null;
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const center = { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
      if (!pinch.current) pinch.current = { dist, scale: view.current.userScale };
      else {
        const nextScale = Math.min(MAX_USER_SCALE, Math.max(MIN_USER_SCALE, pinch.current.scale * (dist / pinch.current.dist)));
        zoomAt(nextScale / view.current.userScale, center);
      }
      return;
    }
    const room = useGame.getState().room;
    const hit = pick(p.x, p.y, room, camRef.current);
    updatePlacementHover(p, room, hit);
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dist += Math.hypot(e.movementX, e.movementY);
    if (d.dist > 10) {
      d.moved = true;
      window.clearTimeout(timer.current);
      lastAvatarTap.current = null;
      view.current.panX += e.movementX;
      view.current.panY += e.movementY;
    }
  }

  function updatePlacementHover(p: { x: number; y: number }, room: GameState["room"], hit: Pick) {
    const target = hit?.kind === "item" ? room.items.find((item) => item.uid === hit.uid) : undefined;
    const targetDef = target ? getDef(target.defId) : null;
        const support = target && (targetDef?.canStack || targetDef?.isWalkable) && target.uid !== useGame.getState().movingUid ? target : undefined;
    const z = support ? stackSurfaceHeight(support) : 0;
    const tile = tileAt(p.x, p.y + z * camRef.current.scale, camRef.current);
    sim.hover = tile.x >= 0 && tile.y >= 0 && tile.x < room.cols && tile.y < room.rows ? tile : null;
    sim.hoverStackUid = support?.uid ?? null;
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    window.clearTimeout(timer.current);
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || d.moved || d.long || !sim.booted) return;
    if (swallowTap()) return;
    const pos = local(e);
    const [avatarX, avatarY] = project(sim.x, sim.y, sim.z + 26, camRef.current);
    const isAvatarTap = Math.hypot(pos.x - avatarX, pos.y - avatarY) < 16 * camRef.current.scale;
    if (isAvatarTap) {
      const state = useGame.getState();
      if (state.homeState || state.armedUid || state.movingUid) {
        lastAvatarTap.current = null;
        return;
      }
      const now = performance.now();
      const previous = lastAvatarTap.current;
      if (previous && now - previous.at < 450 && Math.hypot(pos.x - previous.x, pos.y - previous.y) < 24) {
        lastAvatarTap.current = null;
        setAvatarMenu({ open: true, x: pos.x, y: pos.y });
        blip("ok");
        return;
      }
      lastAvatarTap.current = { at: now, x: pos.x, y: pos.y };
      return;
    }
    lastAvatarTap.current = null;
    act(d.hit, local(e));
  }

  function act(hit: Pick, p: { x: number; y: number }) {
    const s = useGame.getState();
    const room = s.room;
    const target = hit?.kind === "item" ? room.items.find((item) => item.uid === hit.uid) : undefined;
    const targetDef = target ? getDef(target.defId) : null;
    const support = target && (targetDef?.canStack || targetDef?.isWalkable) && target.uid !== s.movingUid ? target : undefined;
    const supportUid = support?.uid;
    const stackZ = support
      ? stackSurfaceHeight(support)
      : target && targetDef?.layer === "floor"
        ? (target.z ?? 0) + targetDef.height
        : 0;
    const t = tileAt(p.x, p.y + stackZ * camRef.current.scale, camRef.current);
    const inside = t.x >= 0 && t.y >= 0 && t.x < room.cols && t.y < room.rows;
    if (s.armedUid || s.movingUid) {
      if (!inside) {
        s.setToast("Toque dentro do quarto");
        blip("no");
        return;
      }
      const ok = s.armedUid ? s.placeArmed(t.x, t.y, avatarTiles(), supportUid) : s.moveSelected(t.x, t.y, avatarTiles(), supportUid);
      blip(ok ? "ok" : "no");
      return;
    }
    if (s.tool === "edit") {
      if (hit?.kind === "item") s.select(hit.uid === s.selectedUid ? null : hit.uid);
      else s.select(null);
      return;
    }
    if (hit?.kind === "item") {
      const item = room.items.find((i) => i.uid === hit.uid);
      const def = item ? getDef(item.defId) : null;
      if (item && def && (def.canSit || def.canLay)) {
        const ok = requestSeat(item.uid);
        blip(ok ? "ok" : "no");
        return;
      }
      if (item && def && (def.canStack || def.isWalkable) && inside) {
        if (!requestWalk(t, walkSurfaceAt(room, t.x, t.y))) blip("no");
        return;
      }
      if (item && def && !def.blocks && inside) {
        if (!requestWalk(t, walkSurfaceAt(room, t.x, t.y))) blip("no");
        return;
      }
      if (item && def) {
        const spot = nearestFree(room, tilesOf(def, item.x, item.y, item.rot));
        if (!spot || !requestWalk(spot, walkSurfaceAt(room, spot.x, spot.y))) blip("no");
        return;
      }
    }
    if (inside && !requestWalk(t, walkSurfaceAt(room, t.x, t.y))) blip("no");
  }

  function zoom(by: number) { zoomAt(by, avatarScreenPoint()); }

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        aria-label="Quarto isométrico. Toque no chão para andar."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      />
      <AvatarMenu
        open={avatarMenu.open}
        onClose={() => setAvatarMenu((menu) => ({ ...menu, open: false }))}
        screenX={avatarMenu.x}
        screenY={avatarMenu.y}
        onOpenVisuais={() => setVisuaisOpen(true)}
        onOpenBubbles={() => setBubblesOpen(true)}
      />
      <VisuaisPanel open={visuaisOpen} onClose={() => setVisuaisOpen(false)} />
      <ChatBubblePanel open={bubblesOpen} onClose={() => setBubblesOpen(false)} />
      <div className="pointer-events-none absolute bottom-3 left-3 z-20">
        <button
          type="button"
          aria-label="Acelerar subida das bolhas em 2x enquanto pressionado"
          aria-pressed={bubbleBoostActive}
          className={`pointer-events-auto flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold shadow-lg transition active:scale-95 touch-none select-none ${
            bubbleBoostActive
              ? "border-[#f0d58d] bg-[#f0d58d] text-[#21170e]"
              : "border-[#e8c478]/80 bg-[#c4a05a] text-[#21170e]"
          }`}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            changeBubbleBoost(true);
          }}
          onPointerUp={() => changeBubbleBoost(false)}
          onPointerCancel={() => changeBubbleBoost(false)}
          onLostPointerCapture={() => changeBubbleBoost(false)}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              changeBubbleBoost(true);
            }
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") changeBubbleBoost(false);
          }}
          onBlur={() => changeBubbleBoost(false)}
        >
          <ChevronsUp className="size-4" aria-hidden />
          2× bolhas
        </button>
      </div>
      <div className="pointer-events-none absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={frameAvatar}
          className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full border border-[#e8c478]/80 bg-[#c4a05a] px-3.5 text-sm font-semibold text-[#21170e] shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition active:scale-95"
          aria-label="Enquadrar avatar"
        >
          <Crosshair className="size-4" />
          Avatar
        </button>
        <button type="button" className="pointer-events-auto grid size-11 place-items-center rounded-full bg-surface text-fg" onClick={centerAvatar} aria-label="Centralizar avatar">
          <Crosshair className="size-5" />
        </button>
        <button type="button" className="pointer-events-auto grid size-11 place-items-center rounded-full bg-surface text-fg" onClick={() => zoom(1.12)} aria-label="Aproximar">
          <Plus className="size-5" />
        </button>
        <button type="button" className="pointer-events-auto grid size-11 place-items-center rounded-full bg-surface text-fg" onClick={() => zoom(0.9)} aria-label="Afastar">
          <Minus className="size-5" />
        </button>
      </div>
    </div>
  );
});
