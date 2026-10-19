import { useGame } from "@/game/store";
import { BUBBLE_SIZES, BUBBLE_SPEEDS, BUBBLE_STYLES, getBubbleStyle } from "@/game/bubbles";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ChatBubblePanel({ open, onClose }: Props) {
  const name = useGame((s) => s.guestName);
  const styleId = useGame((s) => s.bubbleStyle ?? "noir");
  const sizeId = useGame((s) => s.bubbleSize ?? "md");
  const speedId = useGame((s) => s.bubbleSpeed ?? "normal");
  const setBubbleStyle = useGame((s) => s.setBubbleStyle);
  const setBubbleSize = useGame((s) => s.setBubbleSize);
  const setBubbleSpeed = useGame((s) => s.setBubbleSpeed);

  if (!open) return null;

  const style = getBubbleStyle(styleId);

  return (
    <div className="pointer-events-auto absolute inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative z-10 mx-3 mb-4 w-full max-w-sm overflow-hidden rounded-2xl border border-primary/40 bg-[#161310]/98 shadow-[0_20px_60px_rgba(0,0,0,0.65)] sm:mb-0">
        <header className="flex items-center justify-between border-b border-primary/25 bg-primary/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">Chat</p>
            <h2 className="font-display text-lg font-semibold tracking-wide text-primary">
              Bolhas de fala
            </h2>
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

        {/* Estilo */}
        <section className="border-b border-primary/15 px-4 py-4">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Estilo de bolha
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {BUBBLE_STYLES.map((s) => {
              const selected = s.id === styleId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setBubbleStyle(s.id)}
                  title={s.label}
                  aria-label={s.label}
                  aria-pressed={selected}
                  className={`rounded-lg border-2 p-1.5 transition ${
                    selected ? "border-primary bg-primary/15" : "border-transparent bg-black/30 hover:border-primary/40"
                  }`}
                >
                  <span
                    className="block h-8 w-14 rounded-md border-2"
                    style={{ background: s.fill, borderColor: s.border }}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* Prévia + tamanho */}
        <section className="px-4 py-4">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Tamanho de bolha
          </p>

          <div className="flex flex-col gap-2">
            {BUBBLE_SIZES.map((size) => {
              const selected = size.id === sizeId;
              const font =
                size.id === "lg" ? "text-sm" : size.id === "md" ? "text-xs" : "text-[10px]";
              const pad =
                size.id === "lg" ? "px-3 py-1.5" : size.id === "md" ? "px-2.5 py-1" : "px-2 py-0.5";
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setBubbleSize(size.id)}
                  aria-pressed={selected}
                  className={`flex items-center justify-center rounded-xl border px-3 py-2.5 transition ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-primary/15 bg-black/25 hover:border-primary/35"
                  }`}
                >
                  <span
                    className={`inline-flex max-w-full items-center gap-1.5 rounded-full border-2 ${font} ${pad} font-medium`}
                    style={{
                      background: style.fill,
                      borderColor: style.border,
                      color: style.text,
                    }}
                  >
                    <span className="size-4 shrink-0 rounded-full bg-primary/80" aria-hidden />
                    <span className="truncate">
                      {name}: {size.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-t border-primary/15 px-4 py-4">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Velocidade de subida
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BUBBLE_SPEEDS.map((speed) => {
              const selected = speed.id === speedId;
              return (
                <button
                  key={speed.id}
                  type="button"
                  onClick={() => setBubbleSpeed(speed.id)}
                  aria-pressed={selected}
                  className={`h-10 rounded-full border text-xs font-medium transition ${
                    selected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-primary/15 bg-black/25 text-fg hover:border-primary/35"
                  }`}
                >
                  {speed.label}
                </button>
              );
            })}
          </div>
        </section>

        <footer className="border-t border-primary/20 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-full bg-primary font-semibold text-[#21170e] transition active:scale-[0.98]"
          >
            Ok
          </button>
        </footer>
      </div>
    </div>
  );
}
