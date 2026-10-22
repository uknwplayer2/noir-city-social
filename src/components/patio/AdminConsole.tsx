import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, Coins, Grip, Minus, Plus, Wrench, X } from "lucide-react";
import { sayAs } from "@/game/sim";
import { useGame } from "@/game/store";

type AdminTab = "main" | "credits";
type WindowFrame = { x: number; y: number; width: number; height: number };

function initialFrame(): WindowFrame {
  const viewportWidth = typeof window === "undefined" ? 900 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 760 : window.innerHeight;
  const width = Math.min(520, viewportWidth - 24);
  const height = Math.min(640, viewportHeight - 48);
  return {
    x: Math.max(12, (viewportWidth - width) / 2),
    y: Math.max(12, (viewportHeight - height) / 2),
    width,
    height,
  };
}

export function AdminConsole({ onClose, onSendAlert }: { onClose: () => void; onSendAlert: (message: string) => void }) {
  const role = useGame((s) => s.role);
  const guestName = useGame((s) => s.guestName);
  const [tab, setTab] = useState<AdminTab>("main");
  const [minimized, setMinimized] = useState(false);
  const [frame, setFrame] = useState<WindowFrame>(initialFrame);
  const [target, setTarget] = useState(guestName);
  const [amount, setAmount] = useState("500");
  const [creditMessage, setCreditMessage] = useState("Créditos de teste liberados.");
  const [alert, setAlert] = useState("");
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const resize = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  if (role !== "admin") return null;

  function beginDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, left: frame.x, top: frame.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const headerHeight = 56;
    const maxX = Math.max(0, viewportWidth - Math.min(frame.width, viewportWidth - 24));
    const maxY = Math.max(0, viewportHeight - headerHeight);
    setFrame((current) => ({
      ...current,
      x: Math.max(0, Math.min(maxX, drag.current!.left + event.clientX - drag.current!.x)),
      y: Math.max(0, Math.min(maxY, drag.current!.top + event.clientY - drag.current!.y)),
    }));
  }

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    resize.current = { x: event.clientX, y: event.clientY, width: frame.width, height: frame.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!resize.current) return;
    const maxWidth = Math.max(260, window.innerWidth - frame.x - 12);
    const maxHeight = Math.max(220, window.innerHeight - frame.y - 12);
    setFrame((current) => ({
      ...current,
      width: Math.max(260, Math.min(maxWidth, resize.current!.width + event.clientX - resize.current!.x)),
      height: Math.max(220, Math.min(maxHeight, resize.current!.height + event.clientY - resize.current!.y)),
    }));
  }

  return <>
    {!minimized && <div className="fixed inset-0 z-[70] bg-black/65" aria-hidden />}
    <section
      className="fixed z-[71] flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-primary/60 bg-surface text-fg shadow-2xl"
      style={{ left: frame.x, top: frame.y, width: frame.width, height: minimized ? "auto" : frame.height, maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100dvh - 24px)" }}
      role="dialog"
      aria-modal={!minimized}
      aria-label="Console de administração"
      onClick={(event) => event.stopPropagation()}
    >
      <header
        className="flex min-h-14 shrink-0 touch-none cursor-move items-center gap-3 border-b border-white/10 bg-[#211e26] px-3 py-2"
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <GridMark />
        <div className="min-w-0 flex-1"><h2 className="font-display text-lg leading-tight text-primary">Console Godmode</h2><p className="truncate text-xs text-muted">Administrador · {guestName}</p></div>
        <button type="button" onClick={() => setMinimized((value) => !value)} className="grid size-10 shrink-0 place-items-center rounded-full bg-bg" aria-label={minimized ? "Restaurar janela Godmode" : "Minimizar janela Godmode"}>
          {minimized ? <Plus className="size-4" /> : <Minus className="size-4" />}
        </button>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-bg" aria-label="Fechar console"><X className="size-5" /></button>
      </header>

      {!minimized && <>
        <nav className="flex shrink-0 gap-2 border-b border-white/10 px-4 py-3" role="tablist" aria-label="Painéis Godmode">
          <button type="button" role="tab" aria-selected={tab === "main"} onClick={() => setTab("main")} className={`h-10 rounded-full px-4 text-sm font-medium ${tab === "main" ? "bg-primary text-primary-fg" : "bg-bg text-muted"}`}>Principal</button>
          <button type="button" role="tab" aria-selected={tab === "credits"} onClick={() => setTab("credits")} className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium ${tab === "credits" ? "bg-primary text-primary-fg" : "bg-bg text-muted"}`}><Coins className="size-4" /> Enviar moedas</button>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "main" ? <>
            <p className="mb-4 rounded-2xl border border-primary/20 bg-bg p-3 text-sm text-muted">Cargo atual: <strong className="text-primary">Administrador</strong>. Ferramentas operam somente no perfil local neste protótipo.</p>
            <section className="mb-4 overflow-hidden rounded-2xl border border-[#b99a62]/40 bg-gradient-to-br from-[#30271f] via-[#211e26] to-[#151419] p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#d8bd87]/35 bg-[#d8bd87]/10 text-[#d8bd87]">
                  <Wrench className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d8bd87]">Ateliê de criação</p>
                  <h3 className="mt-1 font-display text-lg text-[#f2e8d5]">NOIR CITY LAB</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#c5b9a7]">Ferramentas de sprites, remoção de fundo e criação de móveis personalizados.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { window.location.href = "/noir-city-lab/index.html"; }}
                className="mt-4 h-11 w-full rounded-full border border-[#d8bd87]/50 bg-[#d8bd87] font-semibold text-[#211a13] transition hover:bg-[#ead7ad]"
              >Abrir laboratório <span aria-hidden="true">↗</span></button>
            </section>
            <section className="rounded-2xl border border-white/10 bg-bg p-4">
              <h3 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-5 text-primary" /> Alerta ao vivo</h3>
              <p className="mt-2 text-sm text-muted">No protótipo local, o aviso aparece neste quarto.</p>
              <label className="mt-4 flex flex-col gap-2 text-sm text-muted">Mensagem do alerta
                <textarea value={alert} onChange={(event) => setAlert(event.target.value)} maxLength={160} placeholder="Digite o aviso…" className="min-h-20 rounded-xl border border-white/10 bg-[#111118] p-4 text-fg outline-none focus:border-primary" />
              </label>
              <button type="button" disabled={!alert.trim()} onClick={() => { onSendAlert(alert.trim()); setAlert(""); }} className="mt-4 h-12 w-full rounded-full bg-primary font-semibold text-primary-fg disabled:opacity-40">Enviar alerta no quarto</button>
            </section>
          </> : <section className="rounded-2xl border border-primary/25 bg-bg p-4">
            <h3 className="flex items-center gap-2 font-semibold"><Coins className="size-5 text-primary" /> Enviar moedas</h3>
            <p className="mt-2 text-sm text-muted">Concede créditos ao perfil local informado. A operação não envia moedas pela rede.</p>
            <label className="mt-4 flex flex-col gap-2 text-sm text-muted">Nome do usuário
              <input value={target} onChange={(event) => setTarget(event.target.value)} maxLength={16} className="h-12 rounded-xl border border-white/10 bg-[#111118] px-4 text-fg outline-none focus:border-primary" />
            </label>
            <label className="mt-4 flex flex-col gap-2 text-sm text-muted">Quantidade de créditos
              <input inputMode="numeric" type="number" min="1" max="999999" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-[#111118] px-4 text-fg outline-none focus:border-primary" />
            </label>
            <label className="mt-4 flex flex-col gap-2 text-sm text-muted">Mensagem personalizada
              <textarea value={creditMessage} onChange={(event) => setCreditMessage(event.target.value)} maxLength={120} className="min-h-20 rounded-xl border border-white/10 bg-[#111118] p-4 text-fg outline-none focus:border-primary" />
            </label>
            <button type="button" onClick={() => { const ok = useGame.getState().grantCoins(target, Number(amount)); if (ok && creditMessage.trim()) sayAs("Console Godmode", creditMessage.trim()); }} className="mt-4 h-12 w-full rounded-full bg-primary font-semibold text-primary-fg">Conceder créditos</button>
          </section>}
        </div>
        <button
          type="button"
          aria-label="Redimensionar janela Godmode"
          title="Arraste para redimensionar"
          className="absolute bottom-0 right-0 grid size-8 touch-none cursor-nwse-resize place-items-center text-muted hover:text-primary"
          onPointerDown={beginResize}
          onPointerMove={moveResize}
          onPointerUp={() => { resize.current = null; }}
          onPointerCancel={() => { resize.current = null; }}
        ><Grip className="size-4" /></button>
      </>}
    </section>
  </>;
}

function GridMark() {
  return <div className="grid size-9 shrink-0 grid-cols-2 gap-1 rounded-lg border border-primary/40 p-1.5" aria-hidden><span className="rounded-sm bg-primary" /><span className="rounded-sm bg-primary/50" /><span className="rounded-sm bg-primary/50" /><span className="rounded-sm bg-primary" /></div>;
}
