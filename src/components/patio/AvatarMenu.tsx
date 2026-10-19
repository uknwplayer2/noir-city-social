import { useEffect, useRef, type ReactNode } from "react";
import { requestNearestSeat, setDance, sim, standUp, stopDance } from "@/game/sim";
import { useGame } from "@/game/store";

type Props = { open: boolean; onClose: () => void; screenX: number; screenY: number };

export function AvatarMenu({ open, onClose, screenX, screenY }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const name = useGame((state) => state.guestName);

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
  const top = Math.max(8, Math.min(screenY - 8, window.innerHeight - 248));

  return (
    <div ref={ref} className="pointer-events-auto absolute z-50 min-w-[176px] overflow-hidden rounded-xl border border-primary/35 bg-[#161310]/96 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md" style={{ left, top }}>
      <div className="border-b border-primary/25 bg-primary/10 px-3 py-2.5 text-center text-sm font-semibold tracking-wide text-primary">{name}</div>
      <MenuGroup label="Ação">
        <MenuButton label={sim.state === "sit" || sim.state === "lay" ? "Levantar" : "Sentar / Deitar"} onClick={() => { if (sim.state === "sit" || sim.state === "lay") standUp(); else requestNearestSeat(); onClose(); }} />
        <MenuButton label={sim.handsPocket ? "Postura normal" : "Mãos nos bolsos"} onClick={() => { sim.handsPocket = !sim.handsPocket; onClose(); }} />
      </MenuGroup>
      <MenuGroup label="Dançar">
        {[1, 2, 3, 4].map((id) => <MenuButton key={id} label={`Dança ${id}`} onClick={() => { setDance(id); onClose(); }} />)}
        <MenuButton label="Parar" onClick={() => { stopDance(); onClose(); }} />
      </MenuGroup>
    </div>
  );
}

function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return <details className="group border-b border-primary/10 last:border-0" open={label === "Ação"}>
    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm text-fg hover:bg-primary/12 [&::-webkit-details-marker]:hidden">{label}<span className="text-muted transition group-open:rotate-90">›</span></summary>
    <div className="bg-black/25 pb-1">{children}</div>
  </details>;
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="block min-h-10 w-full px-4 py-2 text-left text-[13px] text-muted hover:bg-primary/15 hover:text-primary">{label}</button>;
}
