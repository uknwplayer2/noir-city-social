# Referência do esquema SQL Habbo para o Noir

## Escopo e procedência

Foi feita uma leitura estrutural do dump SQL enviado no chat: export do phpMyAdmin datado de 31/12/2017, com 167 tabelas, para MySQL 5.5. A análise abaixo usa nomes de tabelas e colunas como referência de modelagem. Não importa registros do servidor original, não copia contas ou mensagens e não trata o dump como código de movimento.

## O que é útil para o Noir

### Móveis e posição no quarto

O dump separa definições de móveis e instâncias colocadas:

- `furniture` descreve metadados do móvel: largura e comprimento na grade, altura de empilhamento, se permite sentar ou caminhar por cima, número do sprite, interação, ajustes de altura e tipo de roupa quando aplicável.
- `items` descreve cada instância: móvel base, sala, dono, dados extras e posição `x/y/z), rotação e posição de parede.
- `catalog_items` liga páginas de catálogo a tipos de móveis e preços.

**Aplicação:** manter a definição do móvel separada da instância. No Noir, `FurniDef` já guarda dimensões/colisão e `Placed` guarda âncora e rotação; a referência sugere evoluir a instância com altura/z e tipo de interação quando a simulação precisar, sem abandonar a grade do piso.

### Planta, portas e alturas

- `room_models` contém coordenadas da porta e direção, mapa de altura do piso, itens públicos e altura da parede.
- `rooms` guarda o modelo, revestimentos de piso/parede, limite de ocupantes e opções de sala.
- `catalog_predesigned_rooms` guarda modelos prontos e listas de itens de chão/parede.

**Aplicação:** no Noir, a grade deve continuar sendo a fonte de escala. Uma futura estrutura de planta pode associar altura por célula, porta, paredes e zonas de circulação à grade, permitindo escadas e níveis sem posicionamentos soltos em pixels. A planta Rooftop atual é um primeiro template fixo; ainda não usa heightmap.

### Bots e conversa

- `bots` registra aparência, sala, posição e rotação, além de tipo de bot, modo de caminhada (`stand`, `freeroam`, `specified_range`), limites da área, fala automática, intervalo de fala e balão.
- `bots_responses` separa palavras-chave, texto de resposta e modo de fala.
- `bots_speech` guarda falas associadas a um bot; `catalog_bot_presets` guarda presets de aparência e tipo.

**Aplicação para Nexo:** separar identidade/look, estado de posição, política de movimento e conversa. O campo de intervalo é uma boa proteção contra spam. `freeroam` e `specified_range` descrevem modos, mas não revelam o algoritmo de pathfinding: esse comportamento está na lógica do emulador, não neste banco.

### Aparência e roupas

- `catalog_clothing` lista peças e partes de roupa.
- `user_clothing` associa peças a usuários.
- `user_wardrobe` guarda looks salvos; o banco também armazena um campo `look` serializado no perfil.
- A configuração do cliente aponta para recursos como dados de figura e catálogo de móveis.

**Aplicação:** o avatar pode ser composto a partir de partes compatíveis e cores, enquanto o look salvo referencia as escolhas. Para o Noir, isso orienta a separação futura entre definição de roupa, sprite/asset, paleta de cores e composição do avatar; o SQL não contém, por si só, o renderer nem os sprites.

### Catálogo e cargos

- `catalog_pages` tem visibilidade, estado habilitado, ordenação e `min_rank`.
- `catalog_items` associa ofertas à página do catálogo.

**Aplicação:** categorias administrativas podem ser filtradas no servidor pela permissão do usuário. Um booleano de interface como `adminOnly` é só metadado visual e não substitui autorização real. O Noir ainda precisa de identidade e cargos antes de uma aba ADM ser considerada protegida.

### Amizades e visitas

Existem tabelas específicas para amizades, relações entre usuários, quartos favoritos e visitas. Os nomes apontam como separar vínculos sociais, preferências e histórico de presença. As regras exatas precisam ser confirmadas no código do emulador antes de reproduzir semânticas.

## Limites e cuidados

O dump é antigo e depende de um emulador/CMS específicos. O esquema ajuda a pensar em entidades e campos, mas não define sozinho protocolo, movimento, validação ou renderização.
Há também campos customizados de ações adultas/agressivas em salas. Isso reforça que se trata de um fork privado/modificado, não de uma especificação oficial ou de um desenho a copiar para o Noir.
 Não se deve conectar o Noir aos endpoints de servidor encontrados no dump nem importar o banco completo.

O arquivo também contém tabelas e registros de usuários, credenciais/tickets de autenticação, endereços de rede e logs de conversa. Esses dados são alheios ao aprendizado de arquitetura e não foram copiados para este documento nem para o repositório. A análise foi limitada aos nomes e às estruturas técnicas relevantes.
