import { CalendarDays, DoorOpen, CircleHelp, Coins, Eye, EyeOff, Globe, LogOut, Settings, ShoppingCart, Users, X, Shield } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { startMenuMusic, unlockAudio } from "@/game/audio";
import { TeamWindow, type TeamMember } from "@/components/patio/TeamWindow";

type HomePanel = "login" | "profile" | "help" | "updates" | "team" | null;

const UPDATE_VERSION = "1.56";
const UPDATE_STORAGE_KEY = "noir-city-update-seen";

export function HomeScreen({
  name,
  coins,
  onEnter,
  onShop,
  onRooms,
  onQuests,
  onDecorate,
  onPhone,
  onSaveName,
  authenticated,
  onLogin,
  onLogout,
  teamMembers,
  onSendTeamMail,
}: {
  name: string;
  coins: number;
  onEnter: (name?: string) => void;
  onShop: () => void;
  onRooms: () => void;
  onQuests: () => void;
  onDecorate: () => void;
  onPhone: () => void;
  onSaveName: (name: string) => void;
  authenticated: boolean;
  onLogin: (name: string, rememberDevice: boolean) => void;
  onLogout: () => void;
  teamMembers: TeamMember[];
  onSendTeamMail: (recipient: string, subject: string, body: string) => boolean;
}) {
  const [dialog, setDialog] = useState<HomePanel>(authenticated ? null : "login");
  const [editName, setEditName] = useState(name);
  const [loginName, setLoginName] = useState(authenticated && name !== "Visita" ? name : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [feedback, setFeedback] = useState("");

  const autoUpdatesAttempted = useRef(false);

  useEffect(() => {
    if (!authenticated || dialog !== null || autoUpdatesAttempted.current) return;

    autoUpdatesAttempted.current = true;

    try {
      if (window.localStorage.getItem(UPDATE_STORAGE_KEY) === UPDATE_VERSION) {
        return;
      }

      window.localStorage.setItem(UPDATE_STORAGE_KEY, UPDATE_VERSION);
    } catch {
      // Evita nova tentativa automática nesta montagem se o armazenamento falhar.
    }

    setDialog("updates");
  }, [authenticated, dialog]);

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeName = loginName.trim().slice(0, 16) || "uknwplayer";
    onSaveName(safeName);
    setPassword("");
    setDialog(null);
    onLogin(safeName, rememberDevice);
  }

  return (
    <main className="noir-home relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#111016] text-white" onPointerDown={() => { unlockAudio(); startMenuMusic(); }}>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "linear-gradient(180deg,rgba(11,10,16,.32),rgba(11,10,16,.18) 45%,rgba(11,10,16,.78)),url('/noir-city-home.png')" }} aria-hidden />
      <header className="safe-top relative z-10 flex items-start justify-between gap-3 p-4 pt-7">
        <div className="pt-2">
          <div className="font-display text-2xl font-semibold tracking-[0.16em] text-primary">♛ NOIR CITY</div>
          <div className="pl-1 text-[9px] uppercase tracking-[0.29em] text-white/70">Social MMD e Hunter</div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-primary/50 bg-[#17151b]/90 p-3 text-left shadow-xl">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/20 font-display text-xl text-primary">{(name || "U").slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0"><span className="block max-w-28 truncate text-xs font-semibold">{name || "uknwplayer"}</span><span className="block text-[10px] text-white/65">Nível 1</span><span className="flex items-center gap-1 text-xs text-primary"><Coins className="size-3" />{coins.toLocaleString("pt-BR")}</span></span>
        </div>
      </header>

      <div className="relative z-10 mt-3 flex flex-col gap-2 px-4">
        {authenticated ? <HomeButton icon={<DoorOpen />} active onClick={() => onEnter(name)}>Entrar</HomeButton> : <HomeButton icon={<DoorOpen />} active onClick={() => setDialog("login")}>Entrar</HomeButton>}
        <HomeButton icon={<Settings />} onClick={() => { setEditName(name); setDialog("profile"); }}>Configurações</HomeButton>
        <HomeButton icon={<Shield />} onClick={() => setDialog("team")}>Equipe</HomeButton>
        <HomeButton icon={<Users />} onClick={onPhone}>Comunidade</HomeButton>
        <HomeButton icon={<ShoppingCart />} onClick={onShop}>Loja</HomeButton>
        <HomeButton icon={<CircleHelp />} onClick={() => setDialog("help")}>Ajuda</HomeButton>
        {authenticated && <HomeButton icon={<LogOut />} onClick={() => { onLogout(); setLoginName(name); setDialog("login"); }}>Sair</HomeButton>}
      </div>

      <section className="relative z-10 mt-auto px-4 pb-4 pt-10">
        <button type="button" onClick={onRooms} className="flex min-h-36 w-full items-center gap-3 overflow-hidden rounded-2xl border border-primary/50 bg-[#131117]/90 p-3 text-left shadow-2xl">
          <span className="h-32 w-24 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: "url('/noir-city-home.png')" }} aria-hidden />
          <span className="min-w-0 flex-1"><span className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-primary"><CalendarDays className="size-4" />Evento da semana</span><span className="block font-display text-xl">Rooftop Night</span><span className="mt-1 block text-xs text-white/65">Música, amigos e novas conexões.</span></span>
          <Globe className="mr-1 size-5 shrink-0 text-primary" />
        </button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <HomeTile icon={<Users />} title="Faça amigos" onClick={onPhone} />
          <HomeTile icon={<ShoppingCart />} title="Decore seu espaço" onClick={onDecorate} />
          <HomeTile icon={<CalendarDays />} title="Participe de eventos" onClick={onQuests} />
        </div>
      </section>

      {dialog && <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-black/75 p-4 sm:p-5" role="dialog" aria-modal="true" aria-label={dialog === "login" ? "Entrar no Noir City" : dialog === "updates" ? "Notas da atualização" : undefined}>
        {dialog === "team" ? <TeamWindow members={teamMembers} onClose={() => setDialog(null)} onSendMail={onSendTeamMail} /> : dialog === "login" ? <section className="relative my-auto w-full max-w-md rounded-2xl border border-primary/60 bg-[#17151b]/95 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
          <button type="button" onClick={() => setDialog(null)} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-white/15 bg-[#111016] text-white/75" aria-label="Fechar login"><X className="size-5" /></button>
          <div className="pr-10"><p className="font-display text-3xl font-bold tracking-[0.12em] text-primary">NOIR CITY</p><p className="mt-1 text-[9px] uppercase tracking-[0.32em] text-white/65">Social MMD e Hunter</p></div>
          <h2 className="mt-7 font-display text-3xl">Entrar</h2>
          <p className="mt-2 text-sm text-white/65">Acesse seu perfil e continue sua jornada.</p>
          <form className="mt-6 space-y-4" onSubmit={submitLogin}>
            <label className="block text-sm text-white/75">Usuário<input autoComplete="username" value={loginName} maxLength={16} onChange={(event) => setLoginName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-[#111016] px-3 text-white outline-none focus:ring-2 focus:ring-primary" /></label>
            <label className="block text-sm text-white/75">Senha<span className="relative mt-2 block"><input autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-[#111016] px-3 pr-12 text-white outline-none focus:ring-2 focus:ring-primary" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-3 text-white/60" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></span></label>
            <label className="flex items-center gap-2 text-sm text-white/65"><input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} className="size-4 accent-[#e2ae67]" />Manter conectado neste dispositivo</label>
            <button type="submit" className="h-12 w-full rounded-full bg-primary font-semibold text-[#21170e]">Entrar na cidade</button>
          </form>
          <button type="button" onClick={() => setFeedback("Cadastro online ainda não está conectado; este protótipo usa um perfil local.")} className="mt-3 h-11 w-full rounded-full border border-primary/35 text-primary">Criar conta</button>
          <p className="mt-4 text-center text-xs leading-5 text-white/55">Acesso local neste dispositivo · v1.56<br />A conta online ainda não está conectada; a senha não é enviada nem validada.</p>
          {feedback && <p className="mt-3 rounded-lg bg-black/30 p-3 text-xs leading-5 text-white/75" role="status">{feedback}</p>}
        </section> : <section className="w-full max-w-md rounded-2xl border border-primary/60 bg-[#1b1920] p-5 shadow-2xl">
          <header className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl">{dialog === "profile" ? "Perfil e configurações" : dialog === "updates" ? "Novidades do Noir City" : "Ajuda"}</h2><button type="button" onClick={() => setDialog(null)} aria-label="Fechar"><X /></button></header>
          {dialog === "profile" ? <><label className="block text-sm text-white/75">Nome no jogo<input value={editName} maxLength={16} onChange={(event) => setEditName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-primary/30 bg-[#111016] px-3 text-white outline-none focus:ring-2 focus:ring-primary" /></label><p className="mt-3 text-sm leading-6 text-white/75">No quarto, use <strong>Andar</strong> para caminhar, <strong>Mexer</strong> para organizar os móveis e o globo para visitar salões oficiais.</p><button type="button" onClick={() => { onSaveName(editName); setDialog(null); }} className="mt-5 h-11 w-full rounded-full bg-primary font-semibold text-[#21170e]">Salvar</button></> : dialog === "updates" ? <><div className="mb-4 inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary">VERSÃO {UPDATE_VERSION}</div><p className="text-sm leading-6 text-white/75">Confira as novidades desta atualização do Noir City:</p><ul className="mt-4 space-y-3 text-sm leading-6 text-white/80"><li><strong className="text-primary">• Movimento:</strong> ajuste no posicionamento do controle de movimento diagonal.</li><li><strong className="text-primary">• Cama de Luxo Noir:</strong> ajuste de escala para melhorar o encaixe visual no quarto.</li><li><strong className="text-primary">• Polimento:</strong> melhorias na apresentação dos móveis e nos controles do jogo.</li></ul><button type="button" onClick={() => setDialog(null)} className="mt-5 h-11 w-full rounded-full bg-primary font-semibold text-[#21170e]">Continuar</button></> : <><p className="text-sm leading-6 text-white/75">Toque no piso para caminhar. Use o Catálogo para comprar móveis, a Mochila para colocá-los e o globo para visitar o Rooftop Night.</p><button type="button" onClick={() => setDialog("updates")} className="mt-4 h-11 w-full rounded-full border border-primary/50 font-semibold text-primary">Notas da atualização</button><button type="button" onClick={() => setDialog(null)} className="mt-3 h-11 w-full rounded-full bg-primary font-semibold text-[#21170e]">Entendi</button></>}
        </section>}
      </div>}
    </main>
  );
}

function HomeButton({ icon, children, active = false, onClick }: { icon: ReactNode; children: ReactNode; active?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={"flex h-12 w-full max-w-[290px] items-center gap-3 rounded-full border border-primary/40 px-4 text-left shadow-lg " + (active ? "bg-primary text-[#21170e]" : "bg-[#17151b]/95 text-white")}>
    <span className="grid size-7 place-items-center">{icon}</span><span className="font-mono text-sm tracking-wide">{children}</span>
  </button>;
}

function HomeTile({ icon, title, onClick }: { icon: ReactNode; title: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-16 flex-col items-start justify-center gap-1 rounded-xl border border-primary/40 bg-[#15131a]/95 p-2 text-left text-[9px] font-semibold uppercase tracking-wide text-white">
    <span className="text-primary">{icon}</span>{title}
  </button>;
}
