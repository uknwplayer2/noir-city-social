# Continuidade do projeto e builds Android

O código-fonte e os documentos de cada release devem permanecer no GitHub. O workspace de compilação pode ser recriado a partir do repositório; não dependa de arquivos guardados apenas numa sessão temporária.

## GitHub Actions

O workflow `.github/workflows/android-debug-apk.yml` roda em pushes e pull requests para `main`, além de permitir execução manual pela aba **Actions**. Ele instala dependências, verifica tipos, compila o APK debug e publica o arquivo como artefato por sete dias.

O workflow pode assinar o APK debug com a mesma chave de continuidade usada pelo APK local. Cadastre estes quatro **Actions secrets** no repositório público (Settings → Secrets and variables → Actions): `NOIR_KEYSTORE_BASE64`, `NOIR_KEYSTORE_PASSWORD`, `NOIR_KEY_ALIAS` e `NOIR_KEY_PASSWORD`. O workflow restaura a chave somente em builds de `push` e execução manual; pull requests usam a chave debug temporária do runner, pois o GitHub não expõe secrets a PRs. Se o secret da keystore ainda não estiver configurado, a build continua usando a chave temporária.

Nunca coloque keystore, senha ou chave privada no repositório público nem em logs. Faça cópias privadas da keystore em locais seguros. A chave configurada aqui corresponde à chave do APK local v1.48.

## Build local

Requisitos: Node.js 22 ou superior, Java 21, Android SDK e Gradle 8.14.3. Para compilar:

```sh
npm ci
npm run typecheck
npm run android:preflight
npm run android:apk
```

O APK é gravado em `output/NOIR-<versionName>.apk`. O script usa o toolchain local em `ANDROID_TOOLCHAIN_DIR`, em `.android-toolchain` ou na pasta irmã `android-toolchain`; sem ele, usa o Gradle Wrapper.

## Identidade e assinatura

- `applicationId`: `com.patio.noir`.
- Base pública: versão `1.42`, `versionCode` 44. Próxima versão preparada: `1.50`, `versionCode` 53, baseada na 1.49 (`versionCode` 52). A 1.43 corrigiu o zoom ancorado no avatar; a 1.44 restaura sessão local opcional, o retorno à página principal, logout, janela de alerta arrastável, centralização do avatar e prévia viva da câmera; a 1.45 atualiza câmera e cobrinha; a 1.46 adiciona diretório de Equipe e e-mail interno local persistido, migrando saves para versão 5; a 1.46.1 corrige a seleção da caixa postal no React; a 1.47 reduz o rádio, adiciona efeito de moeda 8-bit às compras e reinício da câmera após salvar uma foto; a 1.48 corrige a seleção de móveis sobrepostos priorizando a altura do ponto tocado e usando profundidade como desempate; a 1.49 adiciona ações locais do avatar para sentar/deitar e dançar, com menu por toque longo; a 1.50 adiciona conjuntos visuais compatíveis com `lookId`, preserva os sprites direcionais dos looks sem alterações e permite personalização persistida do avatar por layers, além de seis estilos e três tamanhos de bolha de fala com preferências persistidas no save v5. O diretório atual inclui somente cargos do perfil salvo neste aparelho; envio entre contas exige backend.
- A chave de continuidade que assina os APKs já distribuídos é privada e deve permanecer fora deste repositório público. O Actions obtém a cópia por secrets e a mantém apenas no diretório temporário do runner durante a compilação.
- Antes de publicar uma versão, incremente `versionCode`, atualize `versionName` e confira pacote, assinatura e SHA-256 do APK.

O checkpoint importado não contém histórico Git. O novo repositório começa com um commit de importação da 1.42; releases anteriores continuam documentadas em `docs/releases/`.
