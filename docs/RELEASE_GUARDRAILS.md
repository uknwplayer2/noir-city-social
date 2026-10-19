# Proteções contra regressão entre versões

## Situação do GitHub

O snapshot importado da 1.42 não tem metadados `.git`; a criação do repositório público inicia um histórico novo com esta base. O workflow de Actions foi ajustado para `main`, faz typecheck e build do APK debug, e publica o APK como artefato. Não inclua chaves de assinatura no repositório.

## Fonte de verdade

- O APK que será atualizado e o código-fonte devem avançar juntos. Nunca reconstruir uma versão antiga apenas porque o ambiente Android foi reinstalado.
- A versão 1.40 (`versionCode 41`) tinha uma falha de inicialização em alguns aparelhos: consultava as barras do sistema antes da criação da janela visual da splash. A correção 1.40.1 usa `versionCode 42`; futuras compilações devem manter a mesma chave de assinatura e `applicationId` para atualizar por cima e preservar o save local.
- A versão atual 1.41 (`versionCode 43`) mantém o splash nativo de três segundos e o som 8-bit. A arte de skyline usa título inicialmente invisível que aparece em 1,5 segundo e barra de progresso preenchida durante os três segundos. Preserve esses tempos e a identidade de assinatura nos próximos builds.
- A versão 1.42 (`versionCode 44`) também remove a barra de título Android do splash, por meio do tema sem ActionBar e `FEATURE_NO_TITLE`. O preflight protege esse comportamento.
- A versão-base deste novo repositório é a 1.42, código 44. A próxima versão deve usar `versionName` 1.43 e `versionCode` 45, se não houver release posterior.
- O save local usa `SAVE_VERSION`. Ao mudar sua estrutura, aumente a versão e mantenha migração explícita para cada versão já distribuída. Em 1.38, saves v1 e v2 são aceitos e recebem o cargo local `admin` para preservar o perfil de desenvolvimento existente. A 1.39 mantém esse formato e recupera a tela de login vista na gravação antiga, sem enviar nem validar senha enquanto não houver autenticação online. A 1.40 mantém o save e abre com arte e áudio nativos por três segundos antes do WebView. A 1.40.1 corrige a inicialização da splash em dispositivos que não expõem o controlador de insets antes da criação da janela.
- Registre cada build em `docs/releases/` com funções preservadas, migrações, limitações e resultado das verificações.

## Portão local antes de compilar

`npm run android:apk` executa `npm run android:preflight` antes do build. O script `scripts/check-release-invariants.mjs` falha se a versão do APK e a tela divergem, se uma migração antiga desaparece, ou se os recursos administrativos, zoom, painéis e captura forem removidos sem atualizar a lista de compatibilidade. `scripts/build-android.mjs` procura o toolchain instalado no projeto ou no diretório irmão `android-toolchain` e usa o Gradle local, evitando baixar outra cópia a cada restauração do ambiente.

Antes de entregar um APK, execute:

1. `npm run typecheck`
2. `npx eslint src/components/patio/Game.tsx src/components/patio/Panels.tsx src/components/patio/RoomView.tsx src/components/patio/PhoneModal.tsx src/components/patio/AdminConsole.tsx src/game/store.ts src/game/logic.ts src/game/types.ts`
3. `npm run android:preflight`
4. `npm run android:apk`
5. Confira `versionName`, `versionCode`, assinatura e SHA-256 do APK gerado.

O preflight também exige o fluxo de login local e a splash nativa de três segundos com a janela criada antes de ocultar as barras do sistema. Ao adicionar autenticação real, substitua a regra do login por testes da integração antes de remover o aviso.

Não apague `output/NOIR-*.apk`, os documentos de release nem `restore-android-build-env.sh` ao reinstalar ferramentas. O ambiente é descartável; o histórico de versões e as regras de migração são parte do projeto.

## Limites do protótipo

Os cargos e a console 1.38 ainda são locais ao perfil salvo. Não constituem controle de acesso seguro para jogo online. A loja inferior é para todos; a loja superior e os itens Rooftop são filtrados para `admin`. A publicação comunitária permanece desativada até existir backend e moderação.
