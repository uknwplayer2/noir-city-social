# Continuidade do projeto e builds Android

O código-fonte e os documentos de cada release devem permanecer no GitHub. O workspace de compilação pode ser recriado a partir do repositório; não dependa de arquivos guardados apenas numa sessão temporária.

## GitHub Actions

O workflow `.github/workflows/android-debug-apk.yml` roda em pushes e pull requests para `main`, além de permitir execução manual pela aba **Actions**. Ele instala dependências, verifica tipos, compila o APK debug e publica o arquivo como artefato por sete dias.

O artefato do Actions é assinado com a chave debug criada pelo runner e pode não atualizar um APK assinado anteriormente com outra chave. Para distribuir atualizações sobre a instalação existente, configure a chave de assinatura de continuidade em secrets protegidos do GitHub e ajuste o workflow para assinar com ela. Nunca coloque keystore, senha ou chave privada no repositório público.

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
- Base pública: versão `1.42`, `versionCode` 44. Versão atual: `1.43`, `versionCode` 45.
- A chave de continuidade que assina os APKs já distribuídos é privada e deve permanecer fora deste repositório público. Guarde uma cópia segura e faça backup antes de alterar o processo de assinatura.
- Antes de publicar uma versão, incremente `versionCode`, atualize `versionName` e confira pacote, assinatura e SHA-256 do APK.

O checkpoint importado não contém histórico Git. O novo repositório começa com um commit de importação da 1.42; releases anteriores continuam documentadas em `docs/releases/`.
