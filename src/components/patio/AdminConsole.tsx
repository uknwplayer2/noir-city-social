import { useState } from "react";
import { AlertTriangle, Coins, Grid3X3, X } from "lucide-react";
import { sayAs } from "@/game/sim";
import { useGame } from "@/game/store";

export function AdminConsole({ onClose }: { onClose: () => void }) {
  const role = useGame((s) => s.role);
  const guestName = useGame((s) => s.guestName);
  const [target, setTarget] = useState(guestName);
  const [amount, setAmount] = useState("500");
  const [creditMessage, setCreditMessage] = useState("Créditos de teste liberados.");
  const [alert, setAlert] = useState("");
  if (role !== "admin") return null;

  return <div className="absolute inset-0 z-50 grid place-items-center bg-black/75 p-3" role="dialog" aria-modal="true" aria-label="Console de administração">
    <section className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-primary/60 bg-surface shadow-2xl">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Grid3X3 className="size-6 text-primary" />
        <div className="min-w-0 flex-1"><h2 className="font-display text-xl text-primary">Console Godmode</h2><p className="truncate text-xs text-muted">Administrador · {guestName}</p></div>
        <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-bg" aria-label="Fechar console"><X /></button>
      </header>
      <div className="min-h-0 overflow-y-auto p-4">
        <p className="mb-4 rounded-2xl border border-primary/20 bg-bg p-3 text-sm text-muted">Cargo atual: <strong className="text-primary">Administrador</strong>. Ferramentas operam somente no perfil local neste protótipo.</p>
        <label className="flex flex-col gap-2 text-sm text-muted">Nome do usuário
          <input value={target} onChange={(e) => setTarget(e.target.value)} maxLength={16} className="h-14 rounded-xl border border-white/10 bg-bg px-4 text-fg outline-none focus:border-primary" />
        </label>
        <section className="mt-5 rounded-2xl border border-white/10 bg-bg p-4">
          <h3 className="flex items-center gap-2 font-semibold"><Coins className="size-5 text-primary" /> Dar créditos</h3>
          <label className="mt-4 flex flex-col gap-2 text-sm text-muted">Quantidade de créditos
            <input inputMode="numeric" type="number" min="1" max="999999" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-14 rounded-xl border border-white/10 bg-[#111118] px-4 text-fg outline-none focus:border-primary" />
          </label>
          <label className="mt-4 flex flex-col gap-2 text-sm text-muted">Mensagem personalizada
            <textarea value={creditMessage} onChange={(e) => setCreditMessage(e.target.value)} maxLength={120} className="min-h-20 rounded-xl border border-white/10 bg-[#111118] p-4 text-fg outline-none focus:border-primary" />
          </label>
          <button type="button" onClick={() => { const ok = useGame.getState().grantCoins(target, Number(amount)); if (ok && creditMessage.trim()) sayAs("Console Godmode", creditMessage.trim(), 15000); }} className="mt-4 h-12 w-full rounded-full bg-primary font-semibold text-primary-fg">Conceder créditos</button>
        </section>
        <section className="mt-5 border-t border-white/10 pt-5">
          <h3 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-5 text-primary" /> Alerta ao vivo</h3>
          <p className="mt-2 text-sm text-muted">No protótipo local, o aviso aparece neste quarto.</p>
          <label className="mt-4 flex flex-col gap-2 text-sm text-muted">Mensagem do alerta
            <textarea value={alert} onChange={(e) => setAlert(e.target.value)} maxLength={160} placeholder="Digite o aviso…" className="min-h-20 rounded-xl border border-white/10 bg-bg p-4 text-fg outline-none focus:border-primary" />
          </label>
          <button type="button" disabled={!alert.trim()} onClick={() => { sayAs("Alerta da Administração", alert.trim(), 15000); setAlert(""); }} className="mt-4 h-12 w-full rounded-full bg-primary font-semibold text-primary-fg disabled:opacity-40">Enviar alerta no quarto</button>
        </section>
      </div>
    </section>
  </div>;
}
