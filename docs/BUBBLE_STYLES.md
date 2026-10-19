# Bolhas de fala — instalação

## Arquivos

- `ChatBubblePanel.tsx` → `src/components/patio/ChatBubblePanel.tsx`
- `AvatarMenu-with-bubbles.tsx` → substituir `AvatarMenu.tsx` (ou mesclar a opção **Bolhas de fala**)

## Store (`src/game/store.ts`)

```ts
bubbleStyle?: string;   // "noir" | "ivory" | "wine" | "moss" | "amber" | "slate"
bubbleSize?: "sm" | "md" | "lg";
setBubbleStyle: (id: string) => void;
setBubbleSize: (id: "sm" | "md" | "lg") => void;
```

Implementação:

```ts
bubbleStyle: "noir",
bubbleSize: "md",
setBubbleStyle: (id) => set({ bubbleStyle: id }),
setBubbleSize: (id) => set({ bubbleSize: id }),
```

Inclua `bubbleStyle` e `bubbleSize` no save persistido (SaveData), com fallback na leitura.

## RoomView

```tsx
const [bubblesOpen, setBubblesOpen] = useState(false);

<AvatarMenu
  ...
  onOpenBubbles={() => setBubblesOpen(true)}
/>
<ChatBubblePanel open={bubblesOpen} onClose={() => setBubblesOpen(false)} />
```

## draw.ts — usar estilo/tamanho ao desenhar bolhas

```ts
import { getBubbleStyle } from "@/components/patio/ChatBubblePanel";
// ou mova BUBBLE_STYLES para src/game/bubbles.ts se preferir

function drawBubble(ctx, x, y, text: string, styleId?: string, sizeId?: string) {
  const style = getBubbleStyle(styleId);
  const fontSize = sizeId === "lg" ? 13 : sizeId === "sm" ? 10 : 11;
  // use style.fill, style.border, style.text
}
```

No `drawScene`, leia do store:

```ts
const bubbleStyle = useGame.getState().bubbleStyle;
const bubbleSize = useGame.getState().bubbleSize;
```

## Menu do avatar

Raiz passa a ter:

- Visuais
- Ação ›
- Dançar ›
- Sinais ›
- **Bolhas de fala**  ← novo (abre a janela)
