import { useState, type FormEvent } from "react";
import { Mail, Shield, X } from "lucide-react";
import { LookThumb } from "@/components/patio/Panels";
import type { UserRole } from "@/game/types";

export type TeamMember = { name: string; role: Exclude<UserRole, "player">; lookId: string };

export function TeamWindow({ members, onClose, onSendMail }: { members: TeamMember[]; onClose: () => void; onSendMail: (recipient: string, subject: string, body: string) => boolean }) {
  const [recipient, setRecipient] = useState<TeamMember | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipient) return;
    if (!onSendMail(recipient.name, subject, body)) { setStatus("Preencha o assunto e a mensagem."); return; }
    setStatus(`Mensagem enviada para ${recipient.name}.`);
    setSubject("");
    setBody("");
  }

  return <section className="my-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-primary/60 bg-[#17151b] p-5 shadow-2xl" aria-label="Equipe Noir City">
    <header className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-2xl">Equipe</h2><p className="mt-1 text-sm text-muted">Membros com cargo no perfil local</p></div><button type="button" onClick={onClose} aria-label="Fechar equipe" className="grid size-10 place-items-center rounded-full bg-bg"><X /></button></header>
    {members.length ? <div className="space-y-3">{members.map((member) => <article key={member.name.toLowerCase()} className="flex items-center gap-3 rounded-2xl bg-[#211f26] p-3">
      <LookThumb lookId={member.lookId} />
      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{member.name}</p><p className="mt-1 flex items-center gap-1 text-sm text-primary"><Shield className="size-4" />{member.role === "admin" ? "Administrador" : "Moderador"}</p></div>
      <button type="button" onClick={() => { setRecipient(member); setStatus(""); }} className="flex min-h-10 items-center gap-2 rounded-full bg-primary px-3 text-sm font-semibold text-[#21170e]"><Mail className="size-4" />E-mail</button>
    </article>)}</div> : <p className="rounded-xl bg-bg p-4 text-sm text-muted">Nenhum membro com cargo está registrado neste perfil local.</p>}
    {recipient && <form onSubmit={submit} className="mt-5 space-y-3 rounded-2xl border border-primary/25 bg-bg p-4"><h3 className="font-display text-xl">Enviar e-mail para {recipient.name}</h3><label className="block text-sm text-muted">Assunto<input value={subject} maxLength={80} onChange={(event) => setSubject(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-[#17151b] px-3 text-fg" required /></label><label className="block text-sm text-muted">Mensagem<textarea value={body} maxLength={2000} onChange={(event) => setBody(event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-white/10 bg-[#17151b] p-3 text-fg" required /></label><div className="flex gap-2"><button type="button" onClick={() => setRecipient(null)} className="h-11 flex-1 rounded-full bg-[#211f26]">Cancelar</button><button type="submit" className="h-11 flex-1 rounded-full bg-primary font-semibold text-[#21170e]">Enviar</button></div>{status && <p role="status" className="text-sm text-primary">{status}</p>}</form>}
    <p className="mt-4 text-xs leading-5 text-muted">Diretório e e-mails salvos neste dispositivo. A entrega entre contas ou aparelhos será ativada com o serviço online.</p>
  </section>;
}
