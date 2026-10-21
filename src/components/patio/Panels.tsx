import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { blip } from "@/game/audio";
import { CATEGORIES, CATALOG, FLOORS, LAYOUTS, PATTERNS, WALLS, getDef, sellPrice, type CategoryId } from "@/game/catalog";
import { drawLookThumb, drawThumb } from "@/game/draw";
import { resetSim } from "@/game/sim";
import { useGame } from "@/game/store";
import type { Pattern, Rot } from "@/game/types";
import type { Quest } from "@/game/types";

export function FurniThumb({ defId, rot = 0 }: { defId: string; rot?: Rot }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawThumb(ctx, canvas.width, canvas.height, defId, rot);
  }, [defId, rot]);
  return <canvas ref={ref} width={180} height={128} className="h-16 w-24" aria-hidden />;
}

export function LookThumb({ lookId }: { lookId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawLookThumb(ctx, canvas.width, canvas.height, lookId);
  }, [lookId]);
  return <canvas ref={ref} width={88} height={104} className="h-16 w-14 rounded-lg" aria-hidden />;
}

export function Panel({
  which,
  onClose,
  onArm,
  onVisitRooftop,
  onReturnHome,
  inOfficial,
}: {
  which: "bag" | "shop" | "adminShop" | "room" | "quests" | "public";
  onClose: () => void;
  onArm: (uid: string) => void;
  onVisitRooftop: () => void;
  onReturnHome: () => void;
  inOfficial: boolean;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-surface text-fg">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="font-display text-xl">{which === "bag" ? "Mochila" : which === "shop" ? "Loja" : which === "adminShop" ? "Catálogo ADM" : which === "room" ? "Sala" : which === "public" ? "Salões oficiais" : "Desafios de hoje"}</h2>
        <button type="button" className="grid size-11 place-items-center rounded-full bg-bg text-fg" onClick={onClose} aria-label="Fechar">
          <X className="size-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {which === "shop" && <Shop />}
        {which === "adminShop" && <Shop adminOnly />}
        {which === "bag" && <Bag onArm={onArm} />}
        {which === "room" && <RoomSettings inOfficial={inOfficial} />}
        {which === "quests" && <QuestList />}
        {which === "public" && <OfficialRooms onVisitRooftop={onVisitRooftop} onReturnHome={onReturnHome} inOfficial={inOfficial} />}
      </div>
    </section>
  );
}

const QUEST_INFO: Record<string, { title: string; goal: number; reward: number; hint: string }> = {
  "place-3": { title: "Um toque a mais", goal: 3, reward: 25, hint: "Tenha 3 peças extras no quarto" },
  "buy-1": { title: "Dê um nome", goal: 1, reward: 20, hint: "Escolha um nome para seu quarto" },
  "plants-2": { title: "Cantinho verde", goal: 2, reward: 30, hint: "Decore com 2 plantas" },
};

function OfficialRooms({ onVisitRooftop, onReturnHome, inOfficial }: { onVisitRooftop: () => void; onReturnHome: () => void; inOfficial: boolean }) {
  return <div className="flex flex-col gap-4"><p className="text-sm text-muted">Quartos e salões oficiais do Social Hotel.</p><article className="overflow-hidden rounded-xl border border-primary/30 bg-bg"><div className="h-28 bg-gradient-to-br from-[#312c48] via-[#a04e45] to-[#171820] p-4"><span className="rounded-full bg-black/35 px-3 py-1 text-xs uppercase tracking-[0.16em] text-primary">Salão oficial</span><h3 className="mt-7 font-display text-2xl text-white">Rooftop Night</h3></div><div className="p-4"><p className="text-sm text-muted">Piscina, Sky Bar e lounges num salão 16×16, organizado em grade espelhada.</p>{inOfficial ? <button type="button" className="mt-4 h-12 w-full rounded-full bg-primary font-semibold text-primary-fg" onClick={onReturnHome}>Voltar ao meu quarto</button> : <button type="button" className="mt-4 h-12 w-full rounded-full bg-primary font-semibold text-primary-fg" onClick={onVisitRooftop}>Visitar Rooftop Night</button>}</div></article><p className="text-xs text-muted">O salão é somente para visita nesta etapa. O catálogo especial não aparece na loja comum.</p></div>;
}

function QuestList() {
  const quests = useGame((s) => s.quests ?? []);
  const roomItems = useGame((s) => s.room.items);
  const freshCount = roomItems.filter((i) => !i.uid.startsWith("st-")).length;
  const plants = roomItems.filter((i) => ["vaso", "palmeira", "planta"].includes(i.defId)).length;
  const roomName = useGame((s) => s.room.name);
  const values: Record<string, number> = { "place-3": freshCount, "buy-1": Number(roomName !== "Meu canto"), "plants-2": plants };
  return <div className="flex flex-col gap-3"><p className="text-sm text-muted">Pequenas ideias para transformar seu canto. Renova todo dia.</p>{quests.map((q: Quest) => {
    const info = QUEST_INFO[q.id];
    if (!info) return null;
    const progress = Math.min(info.goal, values[q.id] ?? 0);
    const ready = progress >= info.goal && !q.claimed;
    return <article key={q.id} className="rounded-lg bg-bg p-4"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{info.title}</h3><p className="mt-1 text-sm text-muted">{info.hint}</p></div><span className="shrink-0 text-sm font-semibold text-primary">+{info.reward} ◈</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress / info.goal * 100}%` }} /></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted">{q.claimed ? "Concluído" : `${progress} / ${info.goal}`}</span><button type="button" disabled={!ready} onClick={() => { const ok = useGame.getState().claimQuest(q.id); blip(ok ? "coin" : "no"); }} className="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-fg disabled:bg-surface disabled:text-muted">{q.claimed ? "Resgatado" : "Resgatar"}</button></div></article>;
  })}</div>;
}

function Shop({ adminOnly = false }: { adminOnly?: boolean }) {
  const [cat, setCat] = useState<CategoryId>("tudo");
  const coins = useGame((s) => s.coins);
  const role = useGame((s) => s.role);
  if (adminOnly && role !== "admin") return <p className="text-muted">Acesso exclusivo para administradores.</p>;
  const items = CATALOG.filter((d) => Boolean(d.adminOnly) === adminOnly && (cat === "tudo" || d.category === cat));
  return (
    <div className="flex flex-col gap-3">
      {adminOnly && <p className="rounded-xl border border-primary/20 bg-bg p-3 text-sm text-muted">Móveis especiais Rooftop Night · visíveis apenas ao cargo de administrador.</p>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            className={
              "h-10 shrink-0 rounded-full px-4 text-sm font-medium " +
              (cat === c.id ? "bg-primary text-primary-fg" : "bg-bg text-muted")
            }
            onClick={() => setCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {items.map((def) => (
          <li key={def.id} className="flex flex-col gap-2 rounded-lg bg-bg p-3">
            <FurniThumb defId={def.id} />
            <div className="min-w-0">
              <p className="truncate font-medium">{def.name}</p>
              <p className="text-sm text-muted">{def.blurb}</p>
              <p className="text-sm font-semibold text-primary">{def.price} moedas</p>
            </div>
            <button
              type="button"
              disabled={coins < def.price}
              className="h-11 rounded-full bg-primary text-sm font-semibold text-primary-fg disabled:opacity-40"
              onClick={() => {
                const ok = useGame.getState().buy(def.id);
                blip(ok ? "coin" : "no");
              }}
            >
              Comprar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bag({ onArm }: { onArm: (uid: string) => void }) {
  const inventory = useGame((s) => s.inventory);
  if (!inventory.length) {
    return <p className="text-muted">A mochila está vazia. Compre na loja ou pegue uma peça do quarto.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {inventory.map((item) => {
        const def = getDef(item.defId);
        if (!def) return null;
        return (
          <li key={item.uid} className="flex items-center gap-3 rounded-lg bg-bg p-2">
            <FurniThumb defId={item.defId} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{def.name}</p>
              <p className="text-sm text-muted">Vende por {sellPrice(def.price)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg"
                onClick={() => onArm(item.uid)}
              >
                Colocar
              </button>
              <button
                type="button"
                className="h-10 rounded-full px-3 text-sm text-muted"
                onClick={() => {
                  const ok = useGame.getState().sell(item.uid);
                  blip(ok ? "coin" : "no");
                }}
              >
                Vender
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RoomSettings({ inOfficial }: { inOfficial: boolean }) {
  const room = useGame((s) => s.room);
  const [name, setName] = useState(room.name);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setName(room.name), [room.name]);
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm text-muted">
        Nome do quarto
        <input
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => useGame.getState().setRoomName(name)}
          className="h-12 rounded-lg bg-bg px-3 text-base text-fg outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <section className="flex items-center gap-4 rounded-xl border border-white/10 bg-bg p-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-fg">Movimentação diagonal</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            {inOfficial ? "Somente o dono pode alterar esta opção." : "Vale apenas para este quarto. Somente o dono pode alterar."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="Movimentação diagonal neste quarto"
          aria-checked={room.diagonalMovement === true}
          disabled={inOfficial}
          onClick={() => useGame.getState().setDiagonalMovement(room.diagonalMovement !== true)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${room.diagonalMovement ? "bg-primary" : "bg-white/20"}`}
        >
          <span className={`absolute left-1 top-1 size-6 rounded-full bg-white shadow transition-transform ${room.diagonalMovement ? "translate-x-6" : "translate-x-0"}`} />
        </button>
      </section>
      <Field label="Tamanho">
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map((layout) => {
            const on = room.cols === layout.cols && room.rows === layout.rows;
            return (
              <button
                key={layout.label}
                type="button"
                aria-pressed={on}
                className={"h-11 rounded-full text-sm font-medium " + (on ? "bg-primary text-primary-fg" : "bg-bg text-fg")}
                onClick={() => {
                  useGame.getState().setLayout(layout.cols, layout.rows);
                  resetSim(useGame.getState().avatar);
                }}
              >
                {layout.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Chão">
        <Swatches
          items={FLOORS}
          active={room.floorId}
          onPick={(id) => useGame.getState().setFloor(id)}
        />
      </Field>
      <Field label="Parede">
        <Swatches items={WALLS} active={room.wallId} onPick={(id) => useGame.getState().setWall(id)} />
      </Field>
      <Field label="Piso">
        <div className="grid grid-cols-4 gap-2">
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={room.pattern === p.id}
              className={
                "h-11 rounded-full text-sm font-medium " +
                (room.pattern === p.id ? "bg-primary text-primary-fg" : "bg-bg text-fg")
              }
              onClick={() => useGame.getState().setPattern(p.id as Pattern)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Field>
      <p className="text-sm text-muted">
        Contas, outras pessoas no quarto e a equipe — garçom, recepção — entram numa atualização seguinte. Este save fica neste aparelho.
      </p>
      <button
        type="button"
        className="h-12 rounded-full bg-bg font-medium text-fg"
        onClick={() => {
          if (!confirm) {
            setConfirm(true);
            return;
          }
          useGame.getState().resetAll();
          resetSim(useGame.getState().avatar);
          setConfirm(false);
          blip("ok");
        }}
      >
        {confirm ? "Confirmar recomeço" : "Recomeçar o quarto"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{label}</p>
      {children}
    </div>
  );
}

function Swatches({
  items,
  active,
  onPick,
}: {
  items: { id: string; name: string; color: string }[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.name}
          aria-pressed={active === item.id}
          className={"size-11 rounded-full ring-2 " + (active === item.id ? "ring-primary" : "ring-transparent")}
          style={{ backgroundColor: item.color }}
          onClick={() => onPick(item.id)}
        />
      ))}
    </div>
  );
}
