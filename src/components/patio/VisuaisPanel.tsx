import { useState } from "react";
import { LOOKS } from "@/game/catalog";
import { layersForSlot } from "@/game/avatar/catalog";
import { figureFromLookId, LAYER_ORDER, VISUAL_TABS, type AvatarFigure, type LayerSlot } from "@/game/avatar/layers";
import { useGame } from "@/game/store";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function VisuaisPanel({ open, onClose }: Props) {
  const figure = useGame((s) => s.figure);
  const lookId = useGame((s) => s.lookId);
  const setFigurePart = useGame((s) => s.setFigurePart);
  const setLookId = useGame((s) => s.setLookId);
  const [tab, setTab] = useState<LayerSlot | "looks">("looks");

  if (!open || !figure) return null;

  const options = tab === "looks" ? [] : layersForSlot(tab);
  const selectedId = tab === "looks" ? undefined : figure[tab as keyof AvatarFigure];

  return (
    <div className="pointer-events-auto absolute inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar visuais"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-10 mx-3 mb-4 w-full max-w-md overflow-hidden rounded-2xl border border-primary/40 bg-[#161310]/98 shadow-[0_20px_60px_rgba(0,0,0,0.65)] sm:mb-0">
        <header className="flex items-center justify-between border-b border-primary/25 bg-primary/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Avatar</p>
            <h2 className="font-display text-lg font-semibold tracking-wide text-primary">Visuais</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-primary/30 text-primary transition hover:bg-primary/15"
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        {/* abas por slot */}
        <div className="flex gap-1 overflow-x-auto border-b border-primary/15 px-2 py-2 scrollbar-none">
          {[{ slot: "looks" as const, label: "Conjuntos" }, ...VISUAL_TABS].map((t) => {
            const active = t.slot === tab;
            return (
              <button key={t.slot} type="button" onClick={() => setTab(t.slot)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-[#21170e]" : "bg-black/30 text-muted hover:bg-primary/15 hover:text-primary"}`}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* opções do slot */}
        <div className="max-h-[45vh] overflow-y-auto px-3 py-3">
          {tab === "looks" ? (
            <div className="grid grid-cols-2 gap-2">
              {LOOKS.map((look) => {
                const preset = figureFromLookId(look.id);
                const selected = look.id === lookId && LAYER_ORDER.every((slot) => figure[slot] === preset[slot]);
                return (
                  <button key={look.id} type="button" onClick={() => setLookId(look.id)} className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 transition ${selected ? "border-primary bg-primary/15 shadow-[0_0_0_1px_rgba(240,160,75,0.35)]" : "border-primary/20 bg-black/25 hover:border-primary/40 hover:bg-primary/10"}`}>
                    <div className="flex size-14 flex-col justify-end overflow-hidden rounded-lg border border-primary/20 bg-[#0e0c0a]">
                      <div className="mx-auto size-4 rounded-full" style={{ background: look.hair }} />
                      <div className="mx-auto h-4 w-8" style={{ background: look.shirt }} />
                      <div className="mx-auto h-3 w-7" style={{ background: look.pants }} />
                    </div>
                    <span className={`text-center text-sm font-medium ${selected ? "text-primary" : "text-fg"}`}>{look.name}</span>
                    {selected && <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Em uso</span>}
                  </button>
                );
              })}
            </div>
          ) : options.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted">Nenhuma opção neste slot ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {options.map((layer) => {
                const selected = layer.id === selectedId;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setFigurePart(tab, layer.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 transition ${
                      selected
                        ? "border-primary bg-primary/15 shadow-[0_0_0_1px_rgba(240,160,75,0.35)]"
                        : "border-primary/20 bg-black/25 hover:border-primary/40 hover:bg-primary/10"
                    }`}
                  >
                    <div
                      className="relative flex size-14 items-center justify-center overflow-hidden rounded-lg border border-primary/20"
                      style={{
                        background:
                          layer.color && layer.color !== "transparent"
                            ? layer.color
                            : "repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 50% / 12px 12px",
                      }}
                    >
                      {layer.sprite && (
                        <div className="h-full w-[22px] overflow-hidden">
                          <img
                            src={layer.sprite}
                            alt=""
                            className="h-full max-w-none"
                            style={{ width: `${(layer.frameColumns ?? 1) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span className={`text-center text-sm font-medium ${selected ? "text-primary" : "text-fg"}`}>
                      {layer.name}
                    </span>
                    {selected && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Em uso</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="border-t border-primary/20 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-full bg-primary font-semibold text-[#21170e] transition active:scale-[0.98]"
          >
            Confirmar
          </button>
        </footer>
      </div>
    </div>
  );
}
