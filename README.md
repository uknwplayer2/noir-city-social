# Noir City

Jogo social para Android, com salas isométricas, avatares, móveis, catálogo, mochila e ferramentas de administração locais.

## Base importada

- Versão: `1.47` (`versionCode` 50)
- Android `applicationId`: `com.patio.noir`
- Cliente: TypeScript, React, Vite e Capacitor
- Splash nativa em tela cheia com arte UKNWLAB, animação, barra de progresso e áudio 8-bit
- Pesquisa técnica do kit CMS/banco Habbo registrada em `docs/research/`
- Controles de regressão e histórico de releases em `docs/`
- Diretório local de equipe e e-mail interno persistido no aparelho
- Rádio reduzido a um terço, efeito de moeda 8-bit nas compras e opção de reiniciar a câmera após salvar

## Desenvolvimento

Requisitos: Node.js 22 ou superior, Java 21, Android SDK e Gradle 8.14.3.

```sh
npm ci
npm run typecheck
npm run android:preflight
npm run android:apk
```

O APK é gravado em `output/NOIR-<versão>.apk`. O GitHub Actions executa o typecheck e a compilação em pushes e pull requests para `main`; também pode ser iniciado manualmente pela aba **Actions**. O APK fica disponível como artefato da execução.

## Pesquisa Habbo

As notas em `docs/research/` registram aprendizados sobre grade, projeção isométrica, móveis, avatares, roupas, salas e arquitetura cliente-servidor. O repositório contém o código do Noir e essas notas; não inclui os arquivos originais do kit, dumps de usuários, credenciais ou código de terceiros.

## Releases e assinatura

Consulte `docs/releases/` e `docs/RELEASE_GUARDRAILS.md` antes de alterar o jogo. A chave que assina os APKs distribuídos é privada: nunca a adicione ao repositório público. Builds do Actions usam a chave debug do runner até que a assinatura persistente seja configurada por secrets protegidos.
