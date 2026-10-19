# Lições técnicas do kit Habbo para o Noir Hotel

**Data da análise:** 18 de outubro de 2026  
**Base do projeto:** Noir City 1.42
**Objetivo:** aproveitar conceitos de grade, salas, móveis, aparência de avatar e arquitetura de servidor para orientar a evolução do Noir Hotel.

## Resumo

O kit separa dados de jogo, conteúdo visual e execução do servidor. Essa separação é útil para o Noir: o piso define uma grade de coordenadas; móveis e avatares guardam posições nessa grade; a projeção isométrica transforma essas posições em pixels; e as sprites são desenhadas com âncoras, camadas e ordem de profundidade.

A parte mais valiosa para o Rooftop Night é tratar o ambiente como um mapa lógico simétrico e ajustável antes de posicionar sprites. Assim, proporção, escadas, colisões e alinhamento ficam controlados pelo mesmo modelo, em vez de depender de ajustes manuais de pixels.

## O que foi examinado

A pasta enviada ao Drive contém CMS/PHP, arquivos de dados do cliente Flash, código-fonte C# do emulador, um dump de banco e outros arquivos compactados.

Foram lidos estaticamente:

- arquivos de dados do cliente: `figuredata.xml`, `figuremap.xml`, `furnidata.xml` e `external_variables.txt`;
- partes legíveis do emulador, incluindo `Game.cs`, `PacketManager.cs`, `Manuvictor.cs` e configurações estáticas;
- o documento de análise anterior do dump SQL;
- o código atual do Noir em `src/game/iso.ts`, `types.ts`, `logic.ts` e `sim.ts`.

**Limite da análise:** não foi feita a extração nem a leitura integral do ZIP de 1,17 GB ou do RAR do servidor Unky. Algumas pastas do código de salas, pathfinding e roupas aparecem no Drive sem arquivos listáveis. Portanto, os detalhes internos exatos desses algoritmos não puderam ser verificados. Não foram executados binários nem scripts do kit.

## 1. Piso, grade e simetria

Os registros do banco separam a posição lógica do objeto da imagem que o representa. Um móvel colocado guarda coordenadas de piso, altura e rotação. As definições do móvel guardam dimensões, altura de empilhamento e propriedades de uso.

Para o Noir, a regra recomendada é:

1. Desenhar primeiro o contorno e a malha do piso em coordenadas inteiras `(x, y)`.
2. Definir dimensões, centro, entrada, paredes, degraus e zonas caminháveis nesse mapa.
3. Colocar cada móvel em uma célula âncora, com largura, profundidade, altura e rotação.
4. Calcular o espelhamento pela grade e só então renderizar as sprites.
5. Validar colisões, alturas e alcance visual antes de aprovar a composição.

Com tiles de 64 × 32 pixels, a projeção isométrica base é:

```text
screenX = originX + (x - y) × 32
screenY = originY + (x + y) × 16 - z × heightPixelsPerUnit
```

`x`, `y` e `z` são coordenadas do mundo; `heightPixelsPerUnit` converte altura lógica em pixels. O fator precisa ser único para piso, móveis, avatares e escadas. Para espelhar uma sala retangular na horizontal, por exemplo, a coordenada refletida é `x' = largura - 1 - x`; a rotação do objeto também precisa ser transformada.

Isso reforça a orientação já dada para o Rooftop Night: **o piso é a régua de escala e alinhamento**. Evitar organizar objetos um a um no espaço da tela. Usar grupos espelhados e âncoras de grade para sofás, mesas, vasos e luminárias. A simetria visual pode ser deliberadamente quebrada em poucos pontos focais, mantendo o eixo e as distâncias principais consistentes.

O código atual já tem uma boa base:

- `iso.ts` usa tiles 64 × 32, projeta a grade e converte clique em célula;
- `logic.ts` calcula a pegada ocupada por um móvel e troca largura/profundidade ao girá-lo;
- `canPlace` impede sobreposição na camada e verifica os limites da sala;
- `itemDepth` e `pick` já consideram a profundidade e a pegada do objeto.

Próximo cuidado visual: manter a ordem de desenho coerente também para móveis altos, escadas e avatares, usando posição, altura e extensão da sprite. Ordenar apenas pela célula âncora pode falhar em objetos grandes.

## 2. Móveis como dados, não como posições soltas

O `furnidata.xml` possui cerca de 11 mil definições de móveis. Entre os campos observados estão:

- dimensões `xdim` e `ydim`;
- rotação padrão;
- altura de empilhamento;
- indicação se permite ficar em pé, sentar ou deitar;
- parâmetros de animação/interação e identificadores de catálogo.

O dump SQL analisado anteriormente contém tabelas separadas para definições, instâncias colocadas, modelos de sala e catálogo. A contagem observada foi de 350 definições na tabela de móveis, 962 instâncias colocadas, 50 modelos de sala e 676 ofertas de catálogo. O XML do cliente e o banco têm escopos diferentes; seus totais não são equivalentes.

Modelo sugerido para o Noir:

- **Definição:** sprite própria, nome, categoria, pegada, altura, âncora, rotações suportadas, bloqueio, superfície de apoio e interações.
- **Instância:** id, definição, `x/y/z`, direção, estado atual e parâmetros da interação.
- **Mapa da sala:** tamanho da grade, células caminháveis, elevações, porta e zonas especiais.
- **Catálogo:** ofertas e permissões referenciam uma definição; não duplicam o objeto.

Esse formato permite que a mesma cadeira apareça em vários quartos, com diferentes rotações e alturas, sem duplicar a sprite ou sua ficha técnica. Itens especiais de ADM também podem ser marcados na definição com uma permissão de catálogo, validada no servidor.

## 3. Movimento do avatar

O kit tem módulos de sala, pathfinding, avatar, roupa e ações separados. O servidor C# principal cria um ciclo de jogo que atualiza salas e clientes; o intervalo configurado no arquivo examinado é 25 ms. O gerenciador de pacotes registra eventos de entrada por categoria, incluindo salas, motor de movimento, avatar, móveis, chat e bots.

As pastas que deveriam conter a implementação de pathfinding e de roupas não forneceram arquivos legíveis suficientes para confirmar o algoritmo exato ou o formato completo das mensagens. O que segue é recomendação para o Noir, não uma descrição literal desse código legado:

- manter a posição do avatar em células de piso;
- procurar caminho apenas por células dentro da sala, transitáveis e sem bloqueio;
- considerar altura e móveis que permitem subir, sentar ou deitar;
- armazenar caminho como sequência de células e orientar o avatar conforme o próximo passo;
- interpolar a animação entre células para o movimento parecer contínuo;
- recalcular ou cancelar o caminho se um móvel bloquear a rota;
- fazer Nexo usar as mesmas regras de navegação dos jogadores.

O Noir já tem uma busca A* em `logic.ts` e anima o deslocamento em `sim.ts`. Essa versão é local e cobre vizinhos cardinais, então serve bem como protótipo de um jogador. Quando entrarmos em multiplayer ou NPCs compartilhados, a posição final e a rota aceita devem vir de uma autoridade comum no servidor; cada cliente pode interpolar entre as atualizações recebidas. Assim, um NPC não atravessa móveis nem diverge do mapa que os jogadores veem.

## 4. Roupas e composição do avatar

O `figuredata.xml` descreve partes de aparência, paletas de cores, conjuntos e regras de seleção. Na cópia examinada havia 13 categorias de partes, 3 paletas, 543 registros de cor, 1.372 conjuntos e 3.393 referências a partes. O `figuremap.xml` associa identificadores de partes a bibliotecas visuais versionadas: foram encontrados cerca de 1.065 registros de biblioteca.

A lição útil é separar **a aparência escolhida** da **sprite final**:

- aparência: valores estáveis para cabelo, cabeça, corpo, roupa, calçado, acessórios e cores;
- validação: combinações permitidas, categoria, gênero/estilo quando aplicável e disponibilidade;
- renderização: sprites em camadas, com ordem, direção, pose e quadro de animação;
- catálogo: itens de roupa apontam para uma peça/aparência e suas opções; não guardam uma imagem copiada por avatar.

No código atual, `Look` é simples e guarda camisa, calça, cabelo e tom de pele; `Occupant` prevê um `lookId`. É um começo limpo. Recomenda-se evoluir para slots tipados e cores por peça, mantendo o id da aparência independente das imagens. Isso prepara troca de roupa e NPCs com visuais consistentes sem importar os arquivos SWF do kit.

## 5. Protocolo e arquitetura de jogo

O emulador organiza serviços por responsabilidade e associa cada pacote recebido a um manipulador. Para o Noir, a ideia reutilizável é separar comandos de jogo:

- `MoveAvatar`: intenção de caminhar até uma célula;
- `AvatarMoved`: caminho/posição validada para atualizar os demais clientes;
- `SetAvatarLook`: alteração de aparência validada;
- `PlaceFurniture` / `MoveFurniture`: posicionamento validado por permissões, pegada e colisão;
- `ChatMessage`: mensagem separada do estado de movimento.

O cliente pode pedir uma ação, mas as regras de sala, ocupação, acesso ADM e posição final devem ser verificadas no servidor quando houver vários jogadores. A inteligência de Nexo deve escolher objetivos e conversas; navegação, movimento e permissões continuam passando pelas mesmas regras do jogo.

## 6. Decisões para aplicar ao Rooftop Night

1. Fechar primeiro o tamanho e o formato do piso em uma grade maior, com um eixo de simetria definido.
2. Definir zonas no mapa: piscina, bar, lounge, circulação e entrada/escadas.
3. Registrar a pegada e a altura de cada sprite; encaixar os móveis pela grade.
4. Criar pares espelhados para elementos repetidos e revisar perspectiva na escala final do celular.
5. Separar catálogo comum e catálogo de ADM por permissão no servidor.
6. Ampliar `Look` para slots e paletas; depois conectar cada slot a sprites originais do Noir.
7. Fazer Nexo andar pelo mesmo pathfinding da sala, inicialmente como comportamento local e depois com posição validada pelo servidor.

## Proveniência e limites de uso

A fonte é um kit legado de CMS/cliente Flash e emulador C# fornecido pelo usuário, com arquivos datados principalmente de 2016–2017. O relatório registra estrutura e princípios, sem copiar código, sprites, SWFs, credenciais, configurações com endereços de serviço ou registros de usuários. Para o Noir, a implementação e a arte devem ser próprias; os arquivos antigos servem apenas como referência de organização e modelo de dados.
