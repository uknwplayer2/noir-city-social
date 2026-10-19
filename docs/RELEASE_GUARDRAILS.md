# Proteções contra regressão entre versões

## Situação do GitHub

O snapshot importado da 1.42 não tem metadados `.git`; a criação do repositório público inicia um histórico novo com esta base. O workflow de Actions foi ajustado para `main`, faz typecheck e build do APK debug, e publica o APK como artefato. Não inclua chaves de assinatura no repositório.

## Fonte de verdade

- O APK que será atualizado e o código-fonte devem avançar juntos. Nunca reconstruir uma versão antiga apenas porque o ambiente Android foi reinstalado.
- A versão 1.40 (`versionCode 41`) tinha uma falha de inicialização em alguns aparelhos: consultava as barras do sistema antes da criação da janela visual da splash. A correção 1.40.1 usa `versionCode 42`; futuras compilações devem manter a mesma chave de assinatura e `applicationId` para atualizar por cima e preservar o save local.
- A versão atual 1.41 (`versionCode 43`) mantém o splash nativo de três segundos e o som 8-bit. A arte de skyline usa título inicialmente invisível que aparece em 1,5 segundo e barra de progresso preenchida durante os três segundos. Preserve esses tempos e a identidade de assinatura nos próximos builds.
- A versão 1.42 (`versionCode 44`) também remove a barra de título Android do splash, por meio do tema sem ActionBar e `FEATURE_NO_TITLE`. O preflight protege esse comportamento.
- A base pública deste projeto foi a 1.42, código 44. A versão atual é 1.46, código 48. Continue incrementando ambos os números em cada release.
- A versão 1.43 ancora os botões de zoom do quarto e do celular no avatar e conserva a âncora da pinça no ponto médio entre os dedos.
- A versão 1.44 mantém o login local na página principal, persiste a sessão somente quando “Manter conectado” está marcado, e abre a página principal (nunca o quarto) após iniciar ou reiniciar. O botão Sair limpa a sessão; o botão de casa dentro do quarto retorna ao menu sem desconectar. Alertas administrativos usam janela arrastável e redimensionável. O zoom inclui centralização do avatar e maior aproximação; a câmera do celular exibe prévia ao vivo do canvas.
- A versão 1.45 preenche o quadro da câmera com `object-fit: cover`; o gesto de arrastar desloca o canvas do quarto para ajustar o enquadramento antes da captura. Na cobrinha, cada alimento é uma coroa pixelada; os controles são por deslize e cada segundo ponto concede duas moedas ao save local. O placar indica pontos e moedas ganhas na partida.
- A versão 1.46 adiciona diretório Equipe acima de Comunidade e caixa de composição de e-mail interno. O save v5 migra v1–v4 e persiste até 100 mensagens locais. Como o protótipo não tem contas remotas, a lista contém apenas o perfil atual quando seu cargo é admin/moderator e as mensagens não são entregues a outros dispositivos.
- A versão 1.46.1 mantém a funcionalidade de Equipe e usa `useMemo` para derivar a caixa postal a partir do array persistido, sem retornar arrays novos diretamente do seletor Zustand.
- A versão 1.47 reduz o `spriteScale` do Rádio Noir para aproximadamente um terço, transforma o blip de moeda em dois tons quadrados 8-bit usados pelas compras bem-sucedidas da loja compartilhada e só oferece “Nova foto / reiniciar câmera” depois de salvar com sucesso.
- A versão 1.48 escolhe móveis sobrepostos pelo ponto mais alto da coluna atingida pelo toque; em caso de empate, usa a ordem de profundidade de desenho. Isso evita que uma mesa baixa capture toques feitos na parte elevada de uma estante.
- A versão 1.49 preserva o toque longo de 3 segundos no avatar para abrir o menu Noir, as ações locais de sentar/deitar e levantar, as quatro opções de dança e o gesto de duplo toque para mãos nos bolsos. Assentos continuam bloqueando a caminhada; o avatar deve encontrar um tile livre adjacente antes de assumir a pose. `stackHeight` e `canStack` são metadados de catálogo nesta versão e não autorizam ainda colocar móveis sobre outros móveis.
- A próxima versão preparada, 1.50 (`versionCode 53`), mantém o toque longo e o menu do avatar, preserva os quatro looks antigos e permite personalizar cada parte do visual com layers. A figura é persistida em `figure`; saves anteriores usam `lookId` para migração. Os sprites direcionais antigos seguem ativos nos conjuntos intactos. O menu também oferece seis estilos e três tamanhos de bolha de fala com prévia viva e preferências persistidas. O save permanece v5, e o `applicationId` e a assinatura de continuidade não mudam.
- Os controles de zoom (botões do quarto e celular) devem manter o avatar como ponto de ancoragem; a pinça deve manter o ponto médio dos dedos. O preflight verifica os dois caminhos.
- O save local usa `SAVE_VERSION`. Ao mudar sua estrutura, aumente a versão e mantenha migração explícita para cada versão já distribuída. Em 1.38, saves v1 e v2 são aceitos e recebem o cargo local `admin` para preservar o perfil de desenvolvimento existente. A 1.39 mantém esse formato e recupera a tela de login vista na gravação antiga, sem enviar nem validar senha enquanto não houver autenticação online. A 1.40 mantém o save e abre com arte e áudio nativos por três segundos antes do WebView. A 1.40.1 corrige a inicialização da splash em dispositivos que não expõem o controlador de insets antes da criação da janela. A 1.44 eleva o save para v4 e migra saves v1, v2 e v3.
- Registre cada build em `docs/releases/` com funções preservadas, migrações, limitações e resultado das verificações.

## Portão local antes de compilar

`npm run android:apk` executa `npm run android:preflight` antes do build. O script `scripts/check-release-invariants.mjs` falha se a versão do APK e a tela divergem, se uma migração antiga desaparece, ou se os recursos administrativos, zoom, painéis e captura forem removidos sem atualizar a lista de compatibilidade. `scripts/build-android.mjs` procura o toolchain instalado no projeto ou no diretório irmão `android-toolchain` e usa o Gradle local, evitando baixar outra cópia a cada restauração do ambiente.

Antes de entregar um APK, execute:

1. `npm run typecheck`
2. `npx eslint src/components/patio/Game.tsx src/components/patio/Panels.tsx src/components/patio/RoomView.tsx src/components/patio/PhoneModal.tsx src/components/patio/TeamWindow.tsx src/components/patio/AdminConsole.tsx src/game/store.ts src/game/logic.ts src/game/types.ts`
3. `npm run android:preflight`
4. `npm run android:apk`
5. Confira `versionName`, `versionCode`, assinatura e SHA-256 do APK gerado.

O preflight também exige o fluxo de login local e a splash nativa de três segundos com a janela criada antes de ocultar as barras do sistema. Ao adicionar autenticação real, substitua a regra do login por testes da integração antes de remover o aviso.

Não apague `output/NOIR-*.apk`, os documentos de release nem `restore-android-build-env.sh` ao reinstalar ferramentas. O ambiente é descartável; o histórico de versões e as regras de migração são parte do projeto.

## Limites do protótipo

Os cargos e a console 1.38 ainda são locais ao perfil salvo. Não constituem controle de acesso seguro para jogo online. A loja inferior é para todos; a loja superior e os itens Rooftop são filtrados para `admin`. A publicação comunitária permanece desativada até existir backend e moderação.
