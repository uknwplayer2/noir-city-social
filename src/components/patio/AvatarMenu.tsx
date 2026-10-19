import { useEffect, useRef, useState } from "react";
import { requestNearestSeat, setDance, sim, standUp, stopDance } from "@/game/sim";
import { useGame } from "@/game/store";

type Props = {
  open: boolean;
  onClose: () => void;
  screenX: number;
  screenY: number;
  onOpenVisuais?: () => void;
  onOpenBubbles?: () => void;
};

type Panel = "root" | "acao" | "dancar" | "sinais";

const DANCES = [
  { id: 1, label: "Dança 1" },
  { id: 2, label: "Dança 2" },
  { id: 3, label: "Dança 3" },
  { id: 4, label: "Dança 4" },
];

const SIGNALS = [
  { id: "1", label: "1" },
  { id: "2", label: "2" },
  { id: "3", label: "3" },
  { id: "4", label: "4" },
  { id: "5", label: "5" },
  { id: "6", label: "6" },
  { id: "7", label: "7" },
  { id: "8", label: "8" },
  { id: "9", label: "9" },
  { id: "10", label: "10" },
  { id: "0", label: "0" },
  { id: "smile", label: ":)" },
  { id: "dice", label: "🎲" },
  { id: "ball", label: "⚽" },
  { id: "thumb", label: "👍" },
  { id: "flag", label: "🚩" },
  { id: "drink", label: "🥤" },
  { id: "heart", label: "♥" },
];

export function AvatarMenu({ open, onClose, screenX, screenY, onOpenVisuais, onOpenBubbles }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const name = useGame((s) => s.guestName);
  const [panel, setPanel] = useState<Panel>("root");

  useEffect(() => {
    if (open) setPanel("root");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const timer = window.setTimeout(() => document.addEventListener("pointerdown", closeOutside), 50);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open, onClose]);

  if (!open) return null;

  const left = Math.max(8, Math.min(screenX - 80, window.innerWidth - 184));
  const top = Math.max(8, Math.min(screenY - 8, window.innerHeight - 320));

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute z-50 w-[176px] overflow-hidden rounded-xl border border-primary/35 bg-[#161310]/96 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
      style={{ left, top }}
    >
      <div className="border-b border-primary/25 bg-primary/10 px-3 py-2.5 text-center text-sm font-semibold tracking-wide text-primary">
        {name}
      </div>

      {panel === "root" && (
        <div>
          <NavRow
            label="Visuais"
            onClick={() => {
              onClose();
              onOpenVisuais?.();
            }}
          />
          <NavRow label="Ação" hasArrow onClick={() => setPanel("acao")} />
          <NavRow label="Dançar" hasArrow onClick={() => setPanel("dancar")} />
          <NavRow label="Sinais" hasArrow onClick={() => setPanel("sinais")} />
          <NavRow
            label="Bolhas de fala"
            last
            onClick={() => {
              onClose();
              onOpenBubbles?.();
            }}
          />
        </div>
      )}

      {panel === "acao" && (
        <div>
          <ActionRow
            label={sim.state === "sit" || sim.state === "lay" ? "Levantar" : "Sentar / Deitar"}
            onClick={() => {
              if (sim.state === "sit" || sim.state === "lay") standUp();
              else requestNearestSeat();
              onClose();
            }}
          />
          <ActionRow label="Acenar" onClick={() => onClose()} />
          <ActionRow label="Mandar um beijo" onClick={() => onClose()} />
          <ActionRow label="Rir" onClick={() => onClose()} />
          <ActionRow
            label={sim.handsPocket ? "Postura normal" : "Mãos nos bolsos"}
            onClick={() => {
              sim.handsPocket = !sim.handsPocket;
              onClose();
            }}
          />
          <BackRow onClick={() => setPanel("root")} />
        </div>
      )}

      {panel === "dancar" && (
        <div>
          {DANCES.map((d) => (
            <ActionRow
              key={d.id}
              label={d.label}
              onClick={() => {
                setDance(d.id);
                onClose();
              }}
            />
          ))}
          <ActionRow
            label="Parar"
            onClick={() => {
              stopDance();
              onClose();
            }}
          />
          <BackRow onClick={() => setPanel("root")} />
        </div>
      )}

      {panel === "sinais" && (
        <div>
          <div className="grid grid-cols-4 gap-0.5 px-2 py-2">
            {SIGNALS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onClose()}
                className="grid aspect-square place-items-center rounded-md text-sm text-muted transition hover:bg-primary/15 hover:text-primary"
              >
                {s.label}
              </button>
            ))}
          </div>
          <BackRow onClick={() => setPanel("root")} />
        </div>
      )}
    </div>
  );
}

function NavRow({
  label,
  hasArrow,
  onClick,
  last,
}: {
  label: string;
  hasArrow?: boolean;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 w-full items-center justify-between px-3 py-2.5 text-left text-sm text-fg transition hover:bg-primary/12 ${
        last ? "" : "border-b border-primary/10"
      }`}
    >
      <span>{label}</span>
      {hasArrow && <span className="text-muted">›</span>}
    </button>
  );
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block min-h-10 w-full border-b border-primary/10 px-3 py-2.5 text-left text-[13px] text-muted transition hover:bg-primary/15 hover:text-primary"
    >
      {label}
    </button>
  );
}

function BackRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-primary transition hover:bg-primary/12"
    >
      <span aria-hidden>‹</span>
      <span>Voltar</span>
    </button>
  );
}
