import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Camera, Gamepad2, Mail, Phone, Users, X, ZoomIn, ZoomOut } from "lucide-react";
import { saveGamePhoto } from "@/game/photoSaver";
import { useGame } from "@/game/store";

type PhoneTab = "friends" | "camera" | "email" | "games";

export function PhoneModal({ onClose, onCapture, onZoom, onPreviewStream, onPan }: { onClose: () => void; onCapture: () => string | null; onZoom: (factor: number) => void; onPreviewStream: () => MediaStream | null; onPan: (x: number, y: number) => void }) {
  const [tab, setTab] = useState<PhoneTab>("friends");
  const [playing, setPlaying] = useState(false);
  const [snake, setSnake] = useState([53, 52, 51]);
  const [food, setFood] = useState(82);
  const [direction, setDirection] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [photoStatus, setPhotoStatus] = useState("");
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewDrag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const rewardedScore = useRef(0);
  const score = Math.max(0, snake.length - 3);
  const savedMail = useGame((state) => state.internalMail);
  const guestName = useGame((state) => state.guestName);
  const mailbox = useMemo(() => savedMail.filter((message) => message.recipient.toLowerCase() === guestName.toLowerCase()).slice().reverse(), [savedMail, guestName]);
  const [openMailId, setOpenMailId] = useState<string | null>(null);
  const openMail = mailbox.find((message) => message.id === openMailId);

  function beginPreviewDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (photo) return;
    previewDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePreviewDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const start = previewDrag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    previewDrag.current = { ...start, x: event.clientX, y: event.clientY };
    onPan(dx, dy);
  }

  function endPreviewDrag() { previewDrag.current = null; }

  useEffect(() => {
    if (tab !== "camera" || photo) return;
    const video = previewRef.current;
    const stream = onPreviewStream();
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    return () => { video.srcObject = null; };
  }, [tab, photo, onPreviewStream]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setSnake((body) => {
        const head = body[0] ?? 53;
        const next = head + direction;
        if (next < 0 || next >= 144 || (direction === 1 && head % 12 === 11) || (direction === -1 && head % 12 === 0) || body.includes(next)) {
          setPlaying(false);
          return [53, 52, 51];
        }
        const nextBody = [next, ...body];
        if (next !== food) nextBody.pop();
        return nextBody;
      });
    }, 360);
    return () => window.clearInterval(timer);
  }, [playing, direction, food]);

  useEffect(() => {
    if (snake[0] !== food) return;
    setFood((value) => (value + 37) % 144);
    if (score > 0 && score % 2 === 0 && rewardedScore.current < score) {
      rewardedScore.current = score;
      useGame.getState().awardMiniGameCoins(2);
    }
  }, [snake, food, score]);

  function select(next: PhoneTab) {
    setTab(next);
    if (next === "games") setPlaying(false);
  }

  async function savePhoto() {
    if (!photo) return;
    const filename = `noir-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    try {
      const result = await saveGamePhoto(photo, filename);
      if (result === "download") {
        const link = document.createElement("a");
        link.href = photo;
        link.download = filename;
        link.click();
        setPhotoStatus("Imagem baixada para o dispositivo.");
      } else setPhotoStatus("Foto salva na galeria do aparelho.");
      setPhotoSaved(true);
    } catch {
      setPhotoStatus("Não foi possível salvar. Tente capturar novamente.");
      setPhotoSaved(false);
    }
  }

  function resetCamera() {
    setPhoto(null);
    setPhotoSaved(false);
    setPhotoStatus("");
  }

  return <div className="absolute inset-0 z-40 grid place-items-center bg-black/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Celular">
    <section className="flex h-[min(90dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] border-[5px] border-[#b99860] bg-[#121118] p-2 shadow-2xl">
      <div className="mx-auto my-2 h-1.5 w-20 rounded-full bg-white/40" />
      <header className="flex items-center gap-3 rounded-t-[2rem] bg-[#211f26] px-4 py-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-[#21170e]"><Phone /></span>
        <div className="flex-1"><h2 className="font-display text-2xl">Celular</h2><p className="text-xs text-muted">Noir City</p></div>
        <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-bg" aria-label="Fechar celular"><X /></button>
      </header>
      <nav className="grid grid-cols-4 bg-[#211f26] px-2 pb-2">
        <PhoneTabButton active={tab === "friends"} onClick={() => select("friends")} icon={<Users />}>Amigos</PhoneTabButton>
        <PhoneTabButton active={tab === "camera"} onClick={() => select("camera")} icon={<Camera />}>Câmera</PhoneTabButton>
        <PhoneTabButton active={tab === "email"} onClick={() => select("email")} icon={<Mail />}>E-mail</PhoneTabButton>
        <PhoneTabButton active={tab === "games"} onClick={() => select("games")} icon={<Gamepad2 />}>Jogos</PhoneTabButton>
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "friends" && <div><h3 className="font-display text-2xl">Lista de amigos</h3><p className="mt-2 text-sm text-muted">Amigos disponíveis neste protótipo local.</p><div className="mt-5 flex flex-col gap-3"><Friend name="uknwplayer" detail="Você · online" online /><Friend name="LynaNoir" detail="Offline" /><Friend name="CafeComPixel" detail="Offline" /></div></div>}
        {tab === "camera" && <div><h3 className="font-display text-2xl">Câmera</h3><p className="mt-2 text-sm text-muted">Arraste a imagem para ajustar o enquadramento.</p><div className="relative mt-5 aspect-[4/3] touch-none overflow-hidden rounded-2xl border border-primary/25 bg-black" onPointerDown={beginPreviewDrag} onPointerMove={movePreviewDrag} onPointerUp={endPreviewDrag} onPointerCancel={endPreviewDrag}>{photo ? <img src={photo} alt="Captura do quarto" className="h-full w-full object-cover" /> : <video ref={previewRef} autoPlay muted playsInline className="h-full w-full object-cover" aria-label="Prévia ao vivo do quarto" />}</div><div className="mt-4 grid grid-cols-3 gap-2"><button type="button" onClick={() => onZoom(0.88)} className="h-12 rounded-full bg-[#211f26]" aria-label="Afastar câmera"><ZoomOut className="mx-auto" /></button><button type="button" onClick={() => { const image = onCapture(); setPhoto(image); setPhotoSaved(false); setPhotoStatus(image ? "Captura pronta para salvar." : "Não foi possível capturar o quarto."); }} className="h-12 rounded-full bg-primary text-primary-fg" aria-label="Capturar tela"><Camera className="mx-auto" /></button><button type="button" onClick={() => onZoom(1.14)} className="h-12 rounded-full bg-[#211f26]" aria-label="Aproximar câmera"><ZoomIn className="mx-auto" /></button></div><button type="button" disabled={!photo} onClick={() => void savePhoto()} className="mt-3 h-12 w-full rounded-full bg-primary font-semibold text-primary-fg disabled:opacity-40">Salvar no aparelho</button>{photoSaved && <button type="button" onClick={resetCamera} className="mt-2 h-12 w-full rounded-full border border-primary/50 bg-[#211f26] font-semibold text-primary">Nova foto / reiniciar câmera</button>}<p className="mt-2 min-h-5 text-center text-xs text-muted" role="status">{photoStatus}</p><button type="button" disabled className="mt-2 h-11 w-full rounded-full border border-white/10 text-sm text-muted opacity-60" title="Publicação será ativada quando a comunidade estiver pronta">Publicar na comunidade · em breve</button></div>}
        {tab === "email" && <div><h3 className="font-display text-2xl">E-mail</h3><p className="mt-2 text-sm text-muted">Mensagens internas para {guestName}.</p>{openMail ? <article className="mt-5 rounded-2xl bg-[#211f26] p-4"><button type="button" onClick={() => setOpenMailId(null)} className="mb-4 text-sm text-primary">← Caixa de entrada</button><p className="text-xs text-muted">De {openMail.sender} · {new Date(openMail.sentAt).toLocaleString("pt-BR")}</p><h4 className="mt-2 font-display text-xl">{openMail.subject}</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{openMail.body}</p></article> : mailbox.length ? <div className="mt-5 space-y-3">{mailbox.map((message) => <button key={message.id} type="button" onClick={() => { setOpenMailId(message.id); useGame.getState().markInternalMailRead(message.id); }} className="w-full rounded-2xl bg-[#211f26] p-4 text-left"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{message.subject}</p>{!message.read && <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-[#21170e]">NOVA</span>}</div><p className="mt-1 text-sm text-muted">De {message.sender} · {new Date(message.sentAt).toLocaleDateString("pt-BR")}</p><p className="mt-2 line-clamp-2 text-sm text-muted">{message.body}</p></button>)}</div> : <p className="mt-5 rounded-2xl bg-[#211f26] p-4 text-sm text-muted">Sua caixa de entrada está vazia.</p>}<p className="mt-4 text-xs text-muted">Mensagens deste protótipo são armazenadas neste dispositivo.</p></div>}
        {tab === "games" && <div><div className="flex items-center justify-between gap-2"><div><h3 className="font-display text-2xl">Jogos</h3><p className="text-sm text-muted">Cobrinha · pontos {score}</p></div><button type="button" onClick={() => { rewardedScore.current = 0; setSnake([53, 52, 51]); setFood(82); setDirection(1); setPlaying(true); }} className="h-11 rounded-full bg-primary px-5 font-semibold text-[#21170e]">{playing ? "Reiniciar" : "Jogar"}</button></div><div className="mx-auto mt-5 grid aspect-square w-full max-w-[380px] grid-cols-12 overflow-hidden rounded-2xl border border-white/15 bg-[#191b23] touch-none" onTouchStart={(event) => { const touch = event.touches[0]; if (touch) swipeStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={(event) => { const start = swipeStart.current; const touch = event.changedTouches[0]; swipeStart.current = null; if (!start || !touch) return; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return; if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1); else setDirection(dy > 0 ? 12 : -12); }}>
          {Array.from({ length: 144 }, (_, cell) => <span key={cell} className={"grid place-items-center border border-white/[0.06] " + (snake.includes(cell) ? "rounded-md bg-lime-500" : "")}>{cell === food && <CrownFood />}</span>)}
        </div><p className="mt-4 text-center text-xs text-muted">Deslize para cima, baixo, esquerda ou direita.</p><div className="mx-auto mt-3 w-fit rounded-full border border-primary/30 bg-[#211f26] px-5 py-2 text-sm text-primary" aria-live="polite">Pontos: {score} · moedas nesta partida: {Math.floor(score / 2) * 2}</div></div>}
      </div>
      <div className="mx-auto my-2 h-1.5 w-24 rounded-full bg-white/40" />
    </section>
  </div>;
}

function PhoneTabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={"flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] " + (active ? "bg-[#3a3028] text-primary" : "text-muted")}>{icon}{children}</button>;
}

function Friend({ name, detail, online = false }: { name: string; detail: string; online?: boolean }) {
  return <article className="flex items-center gap-3 rounded-2xl bg-[#211f26] p-3"><span className="grid size-12 place-items-center rounded-full bg-[#3a3028] font-display text-2xl text-primary">{name.slice(0, 1)}</span><span className="flex-1"><strong className="block">{name}</strong><span className="text-sm text-muted">{detail}</span></span><span className={"size-3 rounded-full " + (online ? "bg-emerald-400" : "bg-stone-500")} /></article>;
}

function CrownFood() {
  return <svg viewBox="0 0 18 16" className="h-[85%] w-[85%] drop-shadow-[0_1px_0_#6a3e11]" shapeRendering="crispEdges" aria-label="Coroa dourada">
    <path d="M1 4h2v2h2v1h1V4h2V2h2v2h2v3h1V6h2V4h2v7H1z" fill="#f5bd42" stroke="#ffe38a" strokeWidth="1" />
    <path d="M2 12h14v2H2z" fill="#d88925" />
  </svg>;
}
