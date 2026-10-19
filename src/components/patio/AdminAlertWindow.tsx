import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, X } from "lucide-react";

export function AdminAlertWindow({ message, onClose }: { message: string; onClose: () => void }) {
  const [position, setPosition] = useState({ x: 16, y: 72 });
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  function beginDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    const maxX = Math.max(0, window.innerWidth - 220);
    const maxY = Math.max(0, window.innerHeight - 100);
    setPosition({
      x: Math.max(0, Math.min(maxX, drag.current.left + event.clientX - drag.current.x)),
      y: Math.max(0, Math.min(maxY, drag.current.top + event.clientY - drag.current.y)),
    });
  }

  return <section className="fixed z-[60] flex max-h-[70dvh] min-h-32 min-w-[230px] max-w-[min(90vw,520px)] flex-col resize overflow-auto rounded-xl border border-primary/70 bg-[#17151b] shadow-2xl" style={{ left: position.x, top: position.y, width: "min(360px, calc(100vw - 32px))" }} role="alertdialog" aria-label="Alerta da administração">
    <header className="flex shrink-0 touch-none cursor-move items-center gap-2 border-b border-primary/25 bg-[#26222a] px-3 py-2" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <AlertTriangle className="size-4 text-primary" />
      <strong className="flex-1 text-sm">Aviso da administração</strong>
      <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-black/25" aria-label="Fechar alerta"><X className="size-4" /></button>
    </header>
    <p className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm leading-6">{message}</p>
  </section>;
}
