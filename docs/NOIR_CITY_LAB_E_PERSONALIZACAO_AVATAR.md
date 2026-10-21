# Dossiê técnico — Noir City Lab e personalização de cores do avatar

**Status:** arquitetura inicial documentada; implementação ainda não iniciada.  
**Data:** 21/10/2026  
**Repositório de referência:** `uknwplayer2/noir-city-social`  
**Branch de referência:** `main`

## 1. Decisão fundamental

Existem dois sistemas diferentes, embora relacionados:

1. **Noir City Lab:** ferramenta para criar, inspecionar, editar e validar pixel art e sprites.
2. **Personalização de cores do avatar:** funcionalidade dentro do Noir City que permite ao jogador escolher cores para roupas e outras partes do avatar.

O Lab prepara assets; o jogo utiliza esses assets para mostrar a aparência personalizada. Não fundir os dois sistemas nem fazer o jogo depender de executar o Lab em tempo real.

## 2. Sistema A — Noir City Lab

### Finalidade
Ferramenta de criação e preparação de pixel art para produzir assets consistentes e tecnicamente corretos.

### Funções previstas
- Inspecionar PNGs: dimensões, RGBA, transparência, cores e limites de frames.
- Visualizar pixels como mapa textual/indexado para diagnóstico.
- Identificar pixels isolados, componentes conectados e fragmentos fora dos frames.
- Gerenciar paletas e comparar versões.
- Preparar e validar spritesheets.
- Exportar PNGs aprovados para o jogo.
- Preservar originais e gerar resultados reproduzíveis.

### Integridade dos pixels
Um mapa com um caractere por pixel só é reversível se conseguir representar todas as cores e valores alfa sem ambiguidade. Para imagens arbitrárias, usar uma grade indexada e uma tabela de cores RGBA, ou outro formato lossless. A visualização por caracteres pode ser uma camada auxiliar. A primeira prova deve converter/representar e reconstruir uma imagem, verificando igualdade pixel a pixel.

### Execução e fluxo
A proposta inicial é uma ferramenta de desenvolvimento separada, não um módulo executado dentro do jogo:

`referência/desenho/imagem gerada → Noir City Lab → inspeção/edição → validação → PNG aprovado → assets do Noir City`

O Lab não deve sobrescrever arquivos originais automaticamente. Uma interface gráfica pode vir depois de a base estar comprovada.

## 3. Sistema B — personalização de cores do avatar

### Finalidade
No próprio Noir City, permitir que o jogador escolha a cor de uma roupa no armário e veja o avatar atualizado. A personalização por paleta observada em jogos como Habbo é uma referência conceitual; não afirmamos conhecer a implementação interna do Habbo.

### Objetivo técnico
Evitar manter um sprite completo para cada cor quando for possível usar um sprite-base e regras de recolorização. A versão colorida pode ser gerada em tempo de execução e armazenada em cache para evitar processamento repetido.

### Estratégias a avaliar
**Recolorização por máscara/região:** identifica os pixels que podem mudar de cor; preserva transparência, detalhes e áreas não recolorizáveis.

**Recolorização que preserva tonalidade:** mapeia sombras, meios-tons e luzes da cor original para uma rampa correspondente da cor escolhida, mantendo o volume da peça.

As estratégias podem coexistir e ser escolhidas por asset. Não fazer substituição global indiscriminada: a mesma cor pode aparecer em regiões diferentes e detalhes importantes podem ser destruídos.

### Paleta e combinações
Uma peça pode oferecer 20 ou mais cores sem necessariamente armazenar 20 sprites completos. Se houver várias regiões com escolhas independentes, as combinações crescem rapidamente; não pré-gerar todas sem necessidade demonstrada.

### Antes de integrar
Inspecionar o código atual para identificar:
- Catálogo e representação dos itens de roupa.
- Estado e persistência da aparência do avatar.
- Fluxo de seleção do armário até o avatar.
- Carregamento e desenho dos sprites.
- Compatibilidade com as camadas independentes já existentes.

Os nomes e caminhos dos módulos só devem ser definidos após examinar a arquitetura real.

## 4. Relação entre os sistemas

| Tema | Noir City Lab | Personalização de cores do avatar |
|---|---|---|
| Onde funciona | Ferramenta de desenvolvimento | Dentro do jogo |
| Usuário principal | Criador de assets | Jogador |
| Entrada | PNGs, spritesheets, paletas e referências | Sprite-base, regras e escolha do jogador |
| Saída | Arte preparada e validada | Aparência personalizada |
| Prioridade | Controle artístico e integridade | Experiência, fidelidade visual e desempenho |

No futuro, o Lab poderá produzir máscaras, rampas de tonalidade e mapas de regiões consumidos pela personalização. Essa é uma ponte entre sistemas, não motivo para fundi-los.

## 5. Plano de execução

### Etapa 1 — compreender a arquitetura
Inspecionar catálogo, armário, composição do avatar, carregamento de imagens e persistência. Não alterar o comportamento do jogo nesta etapa.

### Etapa 2 — protótipo de recolorização
- Selecionar uma única peça de roupa adequada.
- Criar um teste isolado e reversível.
- Testar uma paleta de pelo menos 20 cores.
- Conferir contornos, sombras, transparência e detalhes.
- Confirmar que o original permanece intacto.

### Etapa 3 — integrar ao avatar
Conectar o método aprovado ao estado da aparência e ao armário. Testar persistência e compatibilidade com as camadas existentes.

### Etapa 4 — expandir
Aplicar a solução a outras peças somente após validar o primeiro teste. Cada tipo de arte pode precisar de máscaras e rampas próprias.

### Etapa 5 — desenvolver o Lab separadamente
Implementar inspeção de PNG, mapas de pixels, paletas e validação de spritesheets. No futuro, permitir que exporte dados auxiliares de recolorização, sem exigir sua execução dentro do jogo.

## 6. Regras de segurança
- Não sobrescrever sprites originais durante testes.
- Não apagar backups.
- Não alterar spritesheets em lote sem validação visual e técnica.
- Não presumir que todos os pixels da mesma cor pertencem à mesma região.
- Não reduzir a paleta de uma arte sem avaliar a perda de qualidade.
- Fazer alterações pequenas, revisar o diff e executar as verificações disponíveis.
- Não criar builds/APKs nem publicar alterações como consequência automática de um teste.

## 7. Asset já trabalhado como contexto

Arquivo: `src/game/assets/furniture/cama-luxo-sprite.png`

Dimensões esperadas: **1536 × 354 px**, RGBA, quatro frames horizontais de **384 × 354 px**. Um fragmento junto à divisão entre frames foi corrigido após análise visual; backups do original e da versão anterior ao corte foram preservados. Não modificar novamente sem pedido específico e nova verificação.

Esse trabalho mostra a utilidade de ferramentas de inspeção de transparência, limites de frames e análise de pixels. Não significa que a cama de luxo deva ser o primeiro alvo de personalização do avatar.

## 8. Critérios de sucesso

**Personalização do avatar**
- Uma peça aceita pelo menos 20 cores.
- Contornos, transparência, sombras e detalhes permanecem visualmente aceitáveis.
- Apenas as regiões pretendidas mudam.
- A escolha persiste de acordo com a arquitetura existente.
- O arquivo original não é alterado.

**Noir City Lab**
- Inspeciona um PNG sem alterá-lo.
- Reconstrói uma imagem lossless com igualdade pixel a pixel.
- Verifica dimensões, frames e transparência de modo reproduzível.
- Exporta arquivos novos sem sobrescrever originais silenciosamente.

## 9. Ponto de retomada

**Próxima ação:** analisar o código atual do armário e da aparência do avatar antes de escolher os arquivos a modificar. Manter o Noir City Lab como iniciativa separada para criação e validação de pixel art.

**Decisão registrada:** Noir City Lab cria e prepara a arte; a personalização de cores é uma funcionalidade do jogo que aplica cores escolhidas pelo jogador aos assets apropriados. São sistemas distintos, com possível integração por máscaras, paletas e metadados.
