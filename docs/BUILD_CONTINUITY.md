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
- Base pública: versão `1.42`, `versionCode` 44. Versão atual: `1.48`, `versionCode` 51. A 1.43 corrigiu o zoom ancorado no avatar; a 1.44 restaura sessão local opcional, o retorno à página principal, logout, janela de alerta arrastável, centralização do avatar e prévia viva da câmera; a 1.45 atualiza câmera e cobrinha; a 1.46 adiciona diretório de Equipe e e-mail interno local persistido, migrando saves para versão 5; a 1.46.1 corrige a seleção da caixa postal no React; a 1.47 reduz o rádio, adiciona efeito de moeda 8-bit às compras e reinício da câmera após salvar uma foto; a 1.48 corrige a seleção de móveis sobrepostos priorizando a altura do ponto tocado e usando profundidade como desempate. O diretório atual inclui somente cargos do perfil salvo neste aparelho; envio entre contas exige backend.
- A chave de continuidade que assina os APKs já distribuídos é privada e deve permanecer fora deste repositório público. Guarde uma cópia segura e faça backup antes de alterar o processo de assinatura.
- Antes de publicar uma versão, incremente `versionCode`, atualize `versionName` e confira pacote, assinatura e SHA-256 do APK.

O checkpoint importado não contém histórico Git. O novo repositório começa com um commit de importação da 1.42; releases anteriores continuam documentadas em `docs/releases/`.
