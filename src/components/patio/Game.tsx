import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { Backpack, Coins, Footprints, Globe, Hand, Home, LayoutGrid, Move, Paintbrush, RotateCw, Smartphone, Store, Target } from "lucide-react";
import { blip, stopMenuMusic, unlockAudio } from "@/game/audio";
import { getDef } from "@/game/catalog";
import { say, sayAs, resetSim } from "@/game/sim";
import { getNexoActor, nexoReply, resetNexo } from "@/game/nexo";
import { useGame } from "@/game/store";
import { Panel } from "@/components/patio/Panels";
import { HomeScreen } from "@/components/patio/HomeScreen";
import { PhoneModal } from "@/components/patio/PhoneModal";
import { RoomView, type RoomViewHandle } from "@/components/patio/RoomView";
import { AdminConsole } from "@/components/patio/AdminConsole";
import { AdminAlertWindow } from "@/components/patio/AdminAlertWindow";

type PanelId = "bag" | "shop" | "adminShop" | "room" | "quests" | "public";

export function Game() {
  const entered = useGame((s) => s.entered);
  const guestName = useGame((s) => s.guestName);
  const authenticated = useGame((s) => s.authenticated);
  const role = useGame((s) => s.role);
  const lookId = useGame((s) => s.lookId);
  const coins = useGame((s) => s.coins);
  const roomName = useGame((s) => s.room.name);
  const inOfficial = useGame((s) => Boolean(s.homeState));
  const tool = useGame((s) => s.tool);
  const inventory = useGame((s) => s.inventory);
  const armedUid = useGame((s) => s.armedUid);
  const movingUid = useGame((s) => s.movingUid);
  const selectedUid = useGame((s) => s.selectedUid);
  const toast = useGame((s) => s.toast);
  const quests = useGame((s) => s.quests ?? []);
  const readyQuestCount = quests.filter((q) => !q.claimed && q.progress >= ({ "place-3": 3, "buy-1": 1, "plants-2": 2 }[q.id] ?? 99)).length;
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [chat, setChat] = useState("");
  const [showSplash, setShowSplash] = useState(() => !Capacitor.isNativePlatform());
  const [gameReady, setGameReady] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminAlert, setAdminAlert] = useState("");
  const [panelHeight, setPanelHeight] = useState(54);
  const [draggingPanel, setDraggingPanel] = useState(false);
  const panelDrag = useRef<{ y: number; height: number } | null>(null);
  const roomViewRef = useRef<RoomViewHandle>(null);
  const greeted = useRef(false);

  useEffect(() => {
    if (!showSplash) return;
    const id = window.setTimeout(() => setShowSplash(false), 3000);
    return () => window.clearTimeout(id);
  }, [showSplash]);

  useEffect(() => {
    void Promise.resolve(useGame.persist.rehydrate()).finally(() => setGameReady(true));
  }, []);

  useEffect(() => {
    if (entered) stopMenuMusic();
  }, [entered]);

  useEffect(() => {
    if (!entered || roomName === "Rooftop Night" || greeted.current) return;
    greeted.current = true;
    const id = window.setTimeout(() => sayAs("Nexo", "Oi! Eu sou o Nexo. Que bom começar este quarto com você.", getNexoActor()), 900);
    return () => window.clearTimeout(id);
  }, [entered, roomName]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => useGame.getState().clearToast(), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const armed = inventory.find((i) => i.uid === armedUid);
  const armedDef = armed ? getDef(armed.defId) : null;
  const activeUid = movingUid ?? selectedUid;
  const placed = useGame((s) => s.room.items.find((i) => i.uid === activeUid));
  const placedDef = placed ? getDef(placed.defId) : null;

  let hint = "Toque no chão para andar";
  if (tool === "edit" && !armedDef && !movingUid) hint = placedDef ? placedDef.name : "Toque um móvel para escolher";
  if (armedDef) hint = `Toque para colocar · ${armedDef.name}`;
  if (movingUid && placedDef) hint = `Toque o piso novo · ${placedDef.name}`;

  function toggle(id: PanelId) {
    if (inOfficial && id === "room") return;
    unlockAudio();
    setPanel((cur) => (cur === id ? null : id));
  }

  function visitRooftop() {
    useGame.getState().enterRooftop();
    resetSim(useGame.getState().avatar);
    resetNexo(useGame.getState().room);
    setPanel(null);
  }

  function returnHome() {
    useGame.getState().returnHome();
    resetSim(useGame.getState().avatar);
    resetNexo(useGame.getState().room);
    setPanel(null);
  }

  function enterGame(name = guestName || "uknwplayer") {
    unlockAudio();
    setPanel(null);
    useGame.getState().enter(name, lookId);
  }

  const panRoom = useCallback((x: number, y: number) => roomViewRef.current?.pan(x, y), []);

  function goToHome() {
    if (inOfficial) {
      useGame.getState().returnHome();
      resetSim(useGame.getState().avatar);
      resetNexo(useGame.getState().room);
    }
    useGame.getState().leave();
    setPanel(null);
    setShowPhone(false);
  }

  function openDecorate() {
    enterGame();
    useGame.getState().setTool("edit");
    setPanel("shop");
  }

  function beginPanelDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (window.innerWidth >= 768) return;
    panelDrag.current = { y: event.clientY, height: panelHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingPanel(true);
  }

  function movePanelDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const start = panelDrag.current;
    if (!start) return;
    const next = Math.max(12, Math.min(92, start.height - ((event.clientY - start.y) / window.innerHeight) * 100));
    setPanelHeight(next);
  }

  function endPanelDrag() {
    if (!panelDrag.current) return;
    panelDrag.current = null;
    setDraggingPanel(false);
    if (panelHeight < 23) { setPanel(null); setPanelHeight(54); return; }
    const stops = [32, 56, 90];
    setPanelHeight(stops.reduce((best, stop) => Math.abs(stop - panelHeight) < Math.abs(best - panelHeight) ? stop : best, stops[0]!));
  }

  return (
    <div className="relative flex h-dvh flex-col bg-bg text-fg">
      {gameReady && !entered && <HomeScreen
        name={guestName || "uknwplayer"}
        coins={coins}
        onEnter={enterGame}
        onShop={() => setPanel("shop")}
        onRooms={() => setPanel("public")}
        onQuests={() => setPanel("quests")}
        onDecorate={openDecorate}
        onPhone={() => setShowPhone(true)}
        onSaveName={(nextName) => useGame.getState().setGuestName(nextName)}
        authenticated={authenticated}
        onLogin={(name, remember) => useGame.getState().authenticate(name, remember)}
        onLogout={() => useGame.getState().logout()}
        teamMembers={role === "player" ? [] : [{ name: guestName, role, lookId }]}
        onSendTeamMail={(recipient, subject, body) => useGame.getState().sendInternalMail(recipient, subject, body)}
      />}
      {gameReady && entered && <>
      <header className="safe-top flex items-center gap-2 px-2 py-3 sm:gap-3 sm:px-4">
        <span className="size-3 rotate-45 bg-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold leading-none tracking-[0.14em] text-primary">NOIR <span className="text-xs tracking-normal text-muted">v1.53</span></p>
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Social Hotel · {roomName}</p>
        </div>
        <button type="button" onClick={goToHome} className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-surface text-primary sm:size-11" aria-label="Voltar ao menu inicial"><Home className="size-5" /></button>
        {role === "admin" && <button type="button" onClick={() => toggle("adminShop")} className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-primary/40 bg-surface px-3 text-sm text-primary sm:h-11" aria-label="Abrir catálogo de administrador">
          <Store className="size-4" aria-hidden />
          <span className="hidden sm:inline">Catálogo ADM</span>
        </button>}
        <button type="button" onClick={() => toggle("public")} className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/40 bg-surface text-primary sm:size-11" aria-label="Quartos e salões oficiais">
          <Globe className="size-5" />
        </button>
        <button type="button" onClick={() => toggle("quests")} className="relative grid size-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-surface text-primary sm:size-11" aria-label="Desafios">
          <Target className="size-5" />
          {readyQuestCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-[#21170e]">{readyQuestCount}</span>}
        </button>
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-primary sm:text-xs"><Coins className="size-4" aria-hidden />{coins}</span>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 min-w-0 flex-1">
          <RoomView
            ref={roomViewRef}
            swallowTap={() => {
              if (panel && window.innerWidth < 768) {
                setPanel(null);
                return true;
              }
              return false;
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm text-muted">{hint}</p>
        {(armedDef || movingUid) && (
          <>
            <IconButton label="Girar" onClick={() => blip(useGame.getState().rotatePreview() ? "ok" : "no")}>
              <RotateCw className="size-5" />
            </IconButton>
            <IconButton
              label="Cancelar"
              onClick={() => {
                useGame.getState().cancelArm();
                useGame.getState().cancelMove();
              }}
            >
              <span className="text-xs font-semibold">Sair</span>
            </IconButton>
          </>
        )}
        {tool === "edit" && placedDef && !armedDef && !movingUid && (
          <>
            <IconButton label="Girar" onClick={() => blip(useGame.getState().rotatePreview() ? "ok" : "no")}>
              <RotateCw className="size-5" />
            </IconButton>
            <IconButton label="Mover" onClick={() => activeUid && useGame.getState().beginMove(activeUid)}>
              <Move className="size-5" />
            </IconButton>
            <IconButton
              label="Pegar"
              onClick={() => {
                if (!activeUid) return;
                const ok = useGame.getState().pickup(activeUid);
                blip(ok ? "ok" : "no");
              }}
            >
              <Hand className="size-5" />
            </IconButton>
          </>
        )}
      </div>

      {entered && (
        <form
          className="flex gap-2 px-3"
          onSubmit={(e) => {
            e.preventDefault();
            const message = chat.trim();
            if (message.toLowerCase() === ":console") {
              if (role === "admin") setShowAdmin(true);
              else useGame.getState().setToast("Comando restrito à administração");
              setChat("");
              return;
            }
            say(message);
            if (message && useGame.getState().room.occupants.some((occupant) => occupant.id === "nexo-roommate")) {
              const response = nexoReply(message, useGame.getState().guestName);
              window.setTimeout(() => sayAs("Nexo", response, getNexoActor()), 700);
            }
            setChat("");
            unlockAudio();
            e.currentTarget.querySelector("input")?.blur();
          }}
        >
          <button type="button" onClick={() => setShowPhone(true)} className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-primary" aria-label="Abrir celular"><Smartphone className="size-5" /></button>
          <label className="sr-only" htmlFor="fala">
            Falar no quarto
          </label>
          <input
            id="fala"
            value={chat}
            maxLength={80}
            placeholder={inOfficial ? "Converse com o salão…" : "Diga algo ao Nexo…"}
            onChange={(e) => setChat(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-full bg-surface px-4 text-fg outline-none placeholder:text-muted focus:ring-2 focus:ring-primary"
          />
          <button type="submit" className="h-11 rounded-full bg-surface px-4 font-medium">
            Falar
          </button>
        </form>
      )}

      <nav className="safe-bot grid grid-cols-5 gap-1 px-2 pt-2 pb-3">
        <ToolButton label="Andar" pressed={tool === "walk" && !panel} onClick={() => { useGame.getState().setTool("walk"); setPanel(null); }}>
          <Footprints className="size-5" />
        </ToolButton>
        <ToolButton label="Mexer" pressed={!inOfficial && tool === "edit" && !panel} disabled={inOfficial} onClick={() => { useGame.getState().setTool("edit"); setPanel(null); }}>
          <LayoutGrid className="size-5" />
        </ToolButton>
        <ToolButton label="Mochila" pressed={panel === "bag"} badge={inventory.length} onClick={() => toggle("bag")}>
          <Backpack className="size-5" />
        </ToolButton>
        <ToolButton label="Loja" pressed={panel === "shop"} onClick={() => toggle("shop")}>
          <Store className="size-5" />
        </ToolButton>
        <ToolButton label={inOfficial ? "Salões" : "Sala"} pressed={inOfficial ? panel === "public" : panel === "room"} onClick={() => inOfficial ? toggle("public") : toggle("room")}>{inOfficial ? <Globe className="size-5" /> : <Paintbrush className="size-5" />}
        </ToolButton>
      </nav>

      </>}

      {panel && <aside style={entered && typeof window !== "undefined" && window.innerWidth < 768 ? { height: `${panelHeight}dvh` } : undefined} className={entered ? `absolute inset-x-0 bottom-0 z-30 flex min-h-0 flex-col border-t border-muted/20 md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-96 md:border-l md:border-t-0 ${draggingPanel ? "" : "transition-[height] duration-300 ease-out"}` : "absolute inset-0 z-30 flex min-h-0 flex-col bg-black/55 p-3 pt-10"}>
        {entered && <div className="flex h-7 shrink-0 items-center justify-center md:hidden touch-none" onPointerDown={beginPanelDrag} onPointerMove={movePanelDrag} onPointerUp={endPanelDrag} onPointerCancel={endPanelDrag} aria-label="Arraste para expandir ou recolher o painel"><span className="h-1.5 w-14 rounded-full bg-muted/70" /></div>}
        <Panel
          which={panel}
          onClose={() => setPanel(null)}
          onArm={(uid) => { useGame.getState().arm(uid); setPanel(null); enterGame(); }}
          onVisitRooftop={visitRooftop}
          onReturnHome={returnHome}
          inOfficial={inOfficial}
        />
      </aside>}

      {showPhone && <PhoneModal onClose={() => setShowPhone(false)} onCapture={() => roomViewRef.current?.capture() ?? null} onZoom={(factor) => roomViewRef.current?.zoom(factor)} onPreviewStream={() => roomViewRef.current?.previewStream() ?? null} onPan={panRoom} />}
      {showAdmin && role === "admin" && <AdminConsole onClose={() => setShowAdmin(false)} onSendAlert={setAdminAlert} />}
      {adminAlert && <AdminAlertWindow message={adminAlert} onClose={() => setAdminAlert("")} />}

      {toast && (
        <p className="absolute top-16 left-1/2 z-30 -translate-x-1/2 rounded-full bg-surface px-4 py-2 text-sm shadow-lg" role="status">
          {toast}
        </p>
      )}

      {showSplash && (
        <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-[#0d0d12]" style={{ animation: "noir-splash 3s ease-in-out both" }} aria-label="UKNWLAB">
          <img src="/uknwlab-splash.png" alt="UKNWLAB" className="h-full w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function ToolButton({
  label,
  pressed,
  onClick,
  children,
  badge,
  disabled = false,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={"relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium disabled:opacity-45 " + (pressed ? "bg-primary text-primary-fg" : "text-muted")}
    >
      {children}
      {label}
      {badge ? (
        <span className="absolute top-1 right-2 grid min-w-5 place-items-center rounded-full bg-fg px-1 text-xs text-bg">{badge}</span>
      ) : null}
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid h-11 min-w-11 place-items-center rounded-full bg-surface px-3 text-fg">
      {children}
    </button>
  );
}
