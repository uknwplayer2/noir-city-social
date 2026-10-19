import { forwardRef, useEffect, useImperativeHandle, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { blip, unlockAudio } from "@/game/audio";
import { getDef } from "@/game/catalog";
import { drawScene, type Ghost } from "@/game/draw";
import { frameCamera, pick, project, tileAt, type Cam, type Pick } from "@/game/iso";
import { canPlace, nearestFree, tilesOf } from "@/game/logic";
import { getNexoActor, resetNexo, tickNexo } from "@/game/nexo";
import { avatarTiles, requestWalk, resetSim, sim, tickSim } from "@/game/sim";
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

export type RoomViewHandle = { capture: () => string | null; zoom: (factor: number) => void };

function ghostOf(s: GameState): Ghost | null {
  const occupied = avatarTiles();
  if (s.armedUid) {
    const inv = s.inventory.find((i) => i.uid === s.armedUid);
    const def = inv ? getDef(inv.defId) : null;
    if (!inv || !def || !sim.hover) return null;
    return {
      defId: inv.defId,
      x: sim.hover.x,
      y: sim.hover.y,
      rot: s.armedRot,
      ok: canPlace(s.room, def, sim.hover.x, sim.hover.y, s.armedRot, undefined, occupied),
    };
  }
  if (s.movingUid) {
    const item = s.room.items.find((i) => i.uid === s.movingUid);
    const def = item ? getDef(item.defId) : null;
    if (!item || !def) return null;
    const x = sim.hover?.x ?? item.x;
    const y = sim.hover?.y ?? item.y;
    return {
      defId: item.defId,
      x,
      y,
      rot: s.movingRot,
      ok: canPlace(s.room, def, x, y, s.movingRot, item.uid, occupied),
    };
  }
  return null;
}

export const RoomView = forwardRef<RoomViewHandle, { swallowTap: () => boolean }>(function RoomView({ swallowTap }, forwardedRef) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef({ userScale: 1, panX: 0, panY: 0 });
  const size = useRef({ w: 1, h: 1 });
  const camRef = useRef<Cam>({ scale: 1, panX: 0, panY: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const drag = useRef<{ id: number; moved: boolean; long: boolean; hit: Pick; dist: number } | null>(null);
  const timer = useRef(0);
  const lastAvatarTap = useRef<{ at: number; x: number; y: number } | null>(null);

  useEffect(() => {
    let dead = false;
    const boot = () => {
      if (dead) return;
      resetSim(useGame.getState().avatar);
      resetNexo(useGame.getState().room);
      sim.booted = true;
    };
    const unsub = useGame.persist.onFinishHydration(() => boot());
    void Promise.resolve(useGame.persist.rehydrate()).then(() => boot());
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
      unsub();
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
            dir: sim.dir,
            facing: sim.facing,
            phase: sim.phase,
            walking: sim.path.length > 0,
            name: s.guestName,
            lookId: s.lookId,
            bubbles: sim.bubbles,
            handsPocket: sim.handsPocket,
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
    view.current.userScale = Math.min(2.4, Math.max(0.65, view.current.userScale * factor));
    const next = frameCamera(size.current.w, size.current.h, room.cols, room.rows, view.current.userScale, view.current.panX, view.current.panY);
    const projected = project(anchor.x, anchor.y, 0, next);
    view.current.panX += point.x - projected[0];
    view.current.panY += point.y - projected[1];
  }

  function avatarScreenPoint() {
    const [x, y] = project(sim.x, sim.y, 0, camRef.current);
    return { x, y };
  }

  useImperativeHandle(forwardedRef, () => ({
    capture: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      try { return canvas.toDataURL("image/png"); } catch { return null; }
    },
    zoom: (factor) => zoomAt(factor, avatarScreenPoint()),
  }));

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!sim.booted) return;
    unlockAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const hit = pick(p.x, p.y, useGame.getState().room, camRef.current);
    drag.current = { id: e.pointerId, moved: false, long: false, hit, dist: 0 };
    window.clearTimeout(timer.current);
    const s = useGame.getState();
    if (hit?.kind === "item" && !s.homeState && !s.armedUid && !s.movingUid) {
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
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const center = { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
      if (!pinch.current) pinch.current = { dist, scale: view.current.userScale };
      else {
        const nextScale = Math.min(2.4, Math.max(0.65, pinch.current.scale * (dist / pinch.current.dist)));
        zoomAt(nextScale / view.current.userScale, center);
      }
      return;
    }
    const room = useGame.getState().room;
    const t = tileAt(p.x, p.y, camRef.current);
    sim.hover = t.x >= 0 && t.y >= 0 && t.x < room.cols && t.y < room.rows ? t : null;
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dist += Math.hypot(e.movementX, e.movementY);
    if (d.dist > 10) {
      d.moved = true;
      window.clearTimeout(timer.current);
      view.current.panX += e.movementX;
      view.current.panY += e.movementY;
    }
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
    const [avatarX, avatarY] = project(sim.x, sim.y, 26, camRef.current);
    const isAvatarTap = Math.hypot(pos.x - avatarX, pos.y - avatarY) < 16 * camRef.current.scale;
    if (isAvatarTap) {
      const now = performance.now();
      const previous = lastAvatarTap.current;
      if (previous && now - previous.at < 420 && Math.hypot(pos.x - previous.x, pos.y - previous.y) < 24) {
        sim.handsPocket = !sim.handsPocket;
        lastAvatarTap.current = null;
        useGame.getState().setToast(sim.handsPocket ? "Mãos nos bolsos" : "Postura normal");
        return;
      }
      lastAvatarTap.current = { at: now, x: pos.x, y: pos.y };
      return;
    }
    act(d.hit, local(e));
  }

  function act(hit: Pick, p: { x: number; y: number }) {
    const s = useGame.getState();
    const room = s.room;
    const t = tileAt(p.x, p.y, camRef.current);
    const inside = t.x >= 0 && t.y >= 0 && t.x < room.cols && t.y < room.rows;
    if (s.armedUid || s.movingUid) {
      if (!inside) {
        s.setToast("Toque dentro do quarto");
        blip("no");
        return;
      }
      const ok = s.armedUid ? s.placeArmed(t.x, t.y, avatarTiles()) : s.moveSelected(t.x, t.y, avatarTiles());
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
      if (item && def && !def.blocks && inside) {
        if (!requestWalk(t)) blip("no");
        return;
      }
      if (item && def) {
        const spot = nearestFree(room, tilesOf(def, item.x, item.y, item.rot));
        if (!spot || !requestWalk(spot)) blip("no");
        return;
      }
    }
    if (inside && !requestWalk(t)) blip("no");
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
      <div className="pointer-events-none absolute top-3 right-3 flex flex-col gap-2">
        <button type="button" className="pointer-events-auto grid size-11 place-items-center rounded-full bg-surface text-fg" onClick={() => zoom(1.12)} aria-label="Aproximar">
          <Plus className="size-5" />
        </button>
        <button type="button" className="pointer-events-auto grid size-11 place-items-center rounded-full bg-surface text-fg" onClick={() => zoom(0.9)} aria-label="Afastar">
          <Minus className="size-5" />
        </button>
        <button
          type="button"
          className="pointer-events-auto grid size-11 place-items-center rounded-full bg-surface text-fg"
          onClick={() => {
            view.current = { userScale: 1, panX: 0, panY: 0 };
          }}
          aria-label="Centralizar quarto"
        >
          <Crosshair className="size-5" />
        </button>
      </div>
    </div>
  );
});
