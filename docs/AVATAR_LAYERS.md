# Avatar por layers — pacote de instalação

## Arquivos

```
src/game/avatar/
  layers.ts       ← tipos, ordem de desenho, DEFAULT_FIGURE, migração de lookId
  catalog.ts      ← catálogo de layers + como criar novos
  drawLayers.ts   ← desenho procedural / sprite por layer

src/components/patio/
  VisuaisPanel.tsx ← menu com abas (Corpo, Olhos, Boca, Cabelo…)
```

## 1. Copiar pastas/arquivos

Copie `src/game/avatar/` e `VisuaisPanel.tsx` para o projeto.

## 2. `types.ts` / save

Adicione ao `SaveData` (e estado inicial):

```ts
import type { AvatarFigure } from "@/game/avatar/layers";

// em SaveData:
figure?: AvatarFigure;
```

Mantenha `lookId` por compatibilidade.

## 3. `store.ts`

```ts
import { getLook } from "@/game/catalog";
import { getLayer } from "@/game/avatar/catalog";
import { DEFAULT_FIGURE, figureFromLookId, type AvatarFigure, type LayerSlot } from "@/game/avatar/layers";

// no tipo GameState:
figure: AvatarFigure;
setFigurePart: (slot: LayerSlot, layerId: string) => void;
setLookId: (lookId: string) => void; // opcional: sincroniza figure a partir do look antigo

// em createInitial():
figure: { ...DEFAULT_FIGURE },

// actions:
setFigurePart: (slot, layerId) => {
  const layer = getLayer(layerId);
  if (!layer || layer.slot !== slot) return;
  set((s) => ({
    figure: { ...(s.figure ?? DEFAULT_FIGURE), [slot]: layerId },
  }));
},

setLookId: (lookId) => {
  const id = getLook(lookId).id;
  set({
    lookId: id,
    figure: figureFromLookId(id),
  });
},
```

Na hidratação / `repairSave`, se não houver `figure`:

```ts
figure: raw.figure ?? figureFromLookId(String(raw.lookId ?? "barro")),
```

## 4. `draw.ts`

Importe e use no lugar do `drawAvatar` antigo (ou dentro dele):

```ts
import { drawLayeredAvatar } from "@/game/avatar/drawLayers";
import { DEFAULT_FIGURE } from "@/game/avatar/layers";

// ao montar o actor no drawScene, passe figure do store:
// figure: useGame.getState().figure ?? DEFAULT_FIGURE

drawLayeredAvatar(ctx, actor.x, actor.y, figure, cam, {
  pose: actor.state === "sit" ? "sit" : actor.state === "lay" ? "lay" : actor.state === "dance" ? "dance" : actor.walking ? "walk" : "idle",
  phase: actor.phase,
  facing: actor.facing,
  name: actor.name,
});
```

No `RoomView`, ao chamar `drawScene`, inclua `figure` no objeto do actor se necessário — ou leia do store dentro do `drawScene`.

Exemplo mínimo no loop do RoomView (se drawScene ainda usa lookId):

```ts
// passar figure no ActorDraw — adicione figure?: AvatarFigure em ActorDraw
figure: s.figure ?? DEFAULT_FIGURE,
```

## 5. `AvatarMenu` + `RoomView`

Já deve existir `onOpenVisuais`. No RoomView:

```tsx
const [visuaisOpen, setVisuaisOpen] = useState(false);

<AvatarMenu
  ...
  onOpenVisuais={() => setVisuaisOpen(true)}
/>
<VisuaisPanel open={visuaisOpen} onClose={() => setVisuaisOpen(false)} />
```

## 6. Criar um layer novo

1. (Opcional) PNG 128×160 transparente em `src/game/assets/avatar/layers/<slot>/`
2. Import no topo de `catalog.ts`
3. Entrada em `LAYER_CATALOG`:

```ts
{
  id: "hair-punk",
  slot: "hair",
  name: "Cabelo punk",
  sprite: hairPunk,      // opcional
  color: "#1a1a1a",      // fallback
  selectable: true,
}
```

4. Aparece sozinho na aba do slot.

## 7. Ordem de desenho

`body → shoes → pants → shirt → hair → eyes → mouth → hat → accessory`

## Notas

- Sem arte ainda: o manequim procedural colorido já funciona.
- Olhos e boca são layers independentes.
- `stackHeight` de móveis continua separado deste sistema.
- Não é obrigatório subir `SAVE_VERSION` se `figure` for opcional e tiver fallback na leitura do save.
