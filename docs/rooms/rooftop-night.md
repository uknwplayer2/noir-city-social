# Rooftop Night: grade e planta inicial

O salão oficial é separado do quarto pessoal. A planta usa uma grade **16 × 16**; a projeção isométrica do jogo mantém tiles de 64 × 32 px. As âncoras são coordenadas de piso.

## Regra de simetria

A linha central visual corresponde a trocar os eixos: uma âncora (x, y) tem espelho em (y, x). Peças retangulares espelhadas trocam rotação e os sprites de sofá/mesa usam inversão horizontal. A circulação central e a chegada ficam abertas.

| Zona/peça | Posição | Área |
|---|---:|---:|
| Piscina | (1, 5) | 4 × 4 |
| Sky Bar | (5, 1) | 4 × 4 |
| Sofás | (2, 10), (10, 2) | 4 × 2, espelhados |
| Mesas | (6, 11), (11, 6) | 2 × 2 |
| Banquetas | (9, 2), (2, 9) | 1 × 1 |
| Jardineiras | (0,4)/(4,0), (1,12)/(12,1), (4,14)/(14,4) | 1 × 1 |
| Luminárias | (7,10), (10,7) | 1 × 1 |

O globo abre os salões oficiais. Entrar salva a sala e a posição atuais; voltar restaura os dois. Os sprites estão em src/game/assets/rooftop. Os objetos exclusivos estão marcados adminOnly e não aparecem na loja comum.

## Validação visual

A planta e as áreas ocupadas são coordenadas da grade. É preciso conferir no navegador a altura/recorte dos WebP em telas estreitas e a circulação perto da piscina e do bar. Uma aba administrativa real depende de identidade/permissão ADM no jogo; até isso existir, o catálogo comum não lista esses itens.
