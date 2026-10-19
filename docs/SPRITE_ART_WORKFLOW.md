# Fluxo de arte para sprites originais

Este guia registra o processo usado para criar o `body-default` de Noir City e como repeti-lo em layers de avatar, roupas e móveis. A arte deve ter identidade própria de Noir City; imagens de referência servem para proporção, pose, direção, perspectiva ou encaixe, não para copiar personagens ou sprites de outro jogo.

## 1. Defina a folha antes de gerar

Anote o que precisa permanecer fixo: tamanho da tela, número e ordem dos quadros, escala do personagem/objeto, ponto de apoio, perspectiva e transparência. Use a mesma grade em todas as imagens da mesma família.

- **Corpo e roupa:** use oito vistas direcionais, uma por coluna, com a mesma pose, escala e linha dos pés. Para roupa em layer separado, use o mesmo manequim, âncoras e dimensões do corpo; desenhe só a peça de roupa e deixe o restante transparente.
- **Móvel:** registre a largura e profundidade em tiles, a perspectiva isométrica e o ponto de apoio no piso. Se o móvel tiver quatro rotações, faça quatro quadros na ordem de `rot` (`0`, `1`, `2`, `3`) e mantenha o ponto de apoio consistente em todos.
- Não misture quadros com escalas, margens, ângulos ou linhas de base diferentes. Não inclua fundo, setas, sombra de apresentação, texto ou moldura na arte final.

## 2. Gere uma arte original

Use o gerador de imagens com fundo transparente e uma descrição específica. Anexe a imagem de referência quando ela for necessária para manter posições ou encaixe. Peça uma folha uniforme, não uma cena ou montagem de apresentação.

### Prompt base para um corpo direcional

```text
Crie um sprite original para o jogo Noir City, em pixel art HD com contorno
escuro leve e acabamento limpo. Entregue somente uma folha PNG RGBA com fundo
100% transparente, em uma grade horizontal de 8 colunas por 1 linha. Cada
coluna contém exatamente uma vista do mesmo personagem em pé, corpo inteiro,
na mesma escala e com os pés alinhados na mesma linha. Use, nesta ordem, as
oito direções do modelo de referência. Preserve apenas a pose e a orientação
geral como referência; crie uma silhueta, rosto, roupas, cores e detalhes
originais, sem reproduzir o design de outro jogo. Sem cenário, piso, sombra,
setas, texto, margem decorativa ou elementos fora dos oito quadros.
```

### Prompt base para roupa em layer

```text
Crie uma folha PNG RGBA transparente para o slot [camisa/calça/sapatos/etc.]
de Noir City. Use o corpo-modelo anexado como guia de escala e âncoras. Mostre
somente a peça de roupa, sem redesenhar pele, rosto, cabelo ou outras roupas.
Organize em 8 colunas na mesma ordem direcional da folha do corpo. Mantenha em
cada coluna exatamente o mesmo enquadramento, pose, escala e alinhamento do
modelo; áreas sem roupa ficam totalmente transparentes. Arte original em pixel
art HD, com contorno leve e paleta Noir City. Sem fundo, sombra, texto ou
elementos de apresentação.
```

### Prompt base para móvel

```text
Crie um sprite original de [móvel] para Noir City, em perspectiva isométrica,
compatível com uma área de [largura] × [profundidade] tiles. Entregue somente
PNG RGBA com fundo transparente e [4] quadros de rotação em uma folha. Use a
ordem [descrever rot 0, 1, 2, 3], mantendo a mesma escala, altura, ponto de
contato com o piso e centro visual em todos os quadros. A silhueta deve caber
na área indicada. Não desenhe piso, parede, cenário, sombra externa, setas,
texto ou moldura. Crie formas, materiais e detalhes originais para Noir City.
```

## 3. Edite por instruções localizadas

Para revisar uma imagem gerada, use-a como imagem de referência e descreva apenas as mudanças desejadas. Declare explicitamente o que deve ficar travado: grade, dimensões, ordem dos quadros, silhueta, pose, ângulos, escala, alinhamento e transparência. Exemplos: “remova os pixels coloridos de halo ao redor das bordas sem alterar o contorno escuro”; “corrija somente a mão do quadro 3”; “alinhe os quatro pontos de apoio do móvel sem mudar sua forma”.

Depois de cada edição, confira novamente todos os quadros. Se a edição deslocar ou redesenhar direções que estavam corretas, volte à imagem aprovada e peça uma alteração mais restrita. Mantenha o arquivo aprovado original até validar a nova versão.

## 4. Revise antes de integrar

Confira a imagem ampliada e sobre um fundo escuro e claro. Verifique:

1. O arquivo tem canal alfa real; um xadrez de transparência não foi exportado como pixels.
2. Não há fundo, moldura, seta, sombra de apresentação nem pixels soltos fora da arte.
3. Nenhuma direção está cortada; roupas e membros não mudam de escala ou posição entre quadros.
4. O alinhamento dos pés ou do ponto de apoio coincide com a âncora usada pelo renderer.
5. Não há halo vermelho, verde ou de outra cor, contorno duplo, borrão ou artefato de edição.
6. O visual tem design original e continua legível no tamanho em que aparece no quarto.

Se a transparência, a ordem ou os limites dos quadros estiverem incertos, não cadastre a folha como se fosse um atlas regular. Primeiro confirme os limites e ajuste os retângulos de origem. O `body-default` atual é uma folha horizontal de 2172 × 724 px, com oito colunas iguais; por isso o renderer divide sua largura em oito quadros.

A folha atual serve como referência aprovada de pose, roupa e grade, mas ainda tem franjas coloridas visíveis nas bordas. Evite reproduzi-las em novos assets e corrija-as numa revisão futura antes de tratar a folha como acabamento final.

## 5. Instale um layer de avatar

Guarde o PNG em `src/game/assets/avatar/layers/<slot>/` e importe-o no catálogo. Para atlas de oito direções, use `frameColumns: 8`; o renderer seleciona a coluna conforme o `Facing` do jogo e mantém a escala definida para o avatar.

```ts
import jacketSprite from "@/game/assets/avatar/layers/shirt/jacket.png";

{
  id: "shirt-jacket",
  slot: "shirt",
  name: "Jaqueta Noir",
  sprite: jacketSprite,
  frameColumns: 8,
  selectable: true,
}
```

O atlas deve seguir a ordem direcional usada por `FACING_COLUMN` em `src/game/avatar/drawLayers.ts`. Uma imagem de um único ângulo usa `sprite` sem `frameColumns`; um recorte fixo de uma folha pode usar `frame`. Layers procedurais existentes continuam disponíveis como fallback.

## 6. Instale um móvel

Guarde o PNG junto aos assets da categoria apropriada, importe-o em `src/game/catalog.ts` e informe dimensões em tiles, os quatro retângulos de origem em `spriteFrames` e um `spriteScale` revisado no quarto. `drawPlaced` usa `spriteFrames` na ordem de rotação e centra a imagem sobre o footprint isométrico. Ajuste os retângulos à folha real; não copie coordenadas de outro sprite.

```ts
sprite: chairSprite,
spriteFrames: [
  { x: 0,   y: 0, width: 256, height: 256 }, // rot 0
  { x: 256, y: 0, width: 256, height: 256 }, // rot 1
  { x: 512, y: 0, width: 256, height: 256 }, // rot 2
  { x: 768, y: 0, width: 256, height: 256 }, // rot 3
],
spriteScale: 1,
```

## 7. Verifique no projeto

Depois de adicionar o arquivo e a entrada de catálogo, rode:

```sh
npm run typecheck
npx eslint src/game/avatar src/game/catalog.ts src/game/draw.ts src/components/patio/VisuaisPanel.tsx
npm run android:web
npm run android:preflight
```

Abra o app e confira o layer em todas as direções e escalas usuais. Para móveis, confira também o encaixe no tile e a seleção por toque. O build web confirma que o PNG foi incorporado pelo Vite; o preflight protege a identidade, a assinatura e as regras de release. Este fluxo não exige mudar o engine, o `applicationId` ou os segredos do GitHub.
