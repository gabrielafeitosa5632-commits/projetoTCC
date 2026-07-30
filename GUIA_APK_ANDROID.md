# 📱 Guia: Compilar APK do PhytoPathometric para Android

## Pré-requisitos

Você precisa ter instalado no seu PC:

1. **Android Studio** (https://developer.android.com/studio)
   - Inclui Android SDK, Gradle e emulador
   - Tamanho: ~900 MB

2. **Java Development Kit (JDK) 11+**
   - Android Studio já inclui, mas você pode verificar:
   ```bash
   java -version
   ```

3. **Git** (para clonar o projeto)

## Passo 1: Clonar ou Copiar o Projeto

Se você tem o projeto em um repositório Git:
```bash
git clone <seu-repositorio> phytopathometric
cd phytopathometric
```

Ou copie a pasta `/home/ubuntu/phytopathometric` para seu PC.

## Passo 2: Instalar Dependências

```bash
# Instalar Node.js (se não tiver)
# Download: https://nodejs.org/

# No terminal/prompt, dentro da pasta do projeto:
npm install
# ou
pnpm install
```

## Passo 3: Compilar o Projeto Web

```bash
npm run build
# ou
pnpm run build
```

Isso vai gerar a pasta `dist/public` com os arquivos web compilados.

## Passo 4: Sincronizar com Android

```bash
npx cap sync android
```

Isso copia os arquivos web para o projeto Android.

## Passo 5: Abrir no Android Studio

### Opção A: Via Terminal
```bash
npx cap open android
```

### Opção B: Manualmente
1. Abra **Android Studio**
2. Clique em **File → Open**
3. Selecione a pasta `android` do projeto
4. Aguarde o Gradle sincronizar (pode levar 2-5 minutos na primeira vez)

## Passo 6: Gerar o APK Assinado

No Android Studio:

1. Clique em **Build → Generate Signed Bundle / APK**
2. Selecione **APK** e clique **Next**
3. Clique em **Create new...** para criar uma chave de assinatura:
   - **Key store path**: Escolha um local (ex: `C:\keystore.jks`)
   - **Password**: Crie uma senha forte (ex: `PhytoPath2024!`)
   - **Key alias**: `phytopathometric`
   - **Key password**: Mesma senha acima
   - **Validity**: 25 anos
   - Clique **OK**

4. Selecione a chave criada e clique **Next**
5. Em **Flavors**, selecione **release** e clique **Finish**
6. Aguarde a compilação (pode levar 5-10 minutos)

## Passo 7: Localizar o APK

O arquivo APK estará em:
```
android/app/release/app-release.apk
```

## Passo 8: Instalar no Celular

### Via USB (Recomendado)
1. Conecte o Samsung Galaxy A51 ao PC via USB
2. Ative **Depuração USB** no celular:
   - Configurações → Sobre → Toque 7x em "Número da compilação"
   - Volte → Opções de desenvolvedor → Ative "Depuração USB"
3. No Android Studio, clique em **Run → Run 'app'**
4. Selecione seu celular e clique **OK**

### Via Arquivo
1. Copie o arquivo `app-release.apk` para o celular (via USB ou email)
2. No celular, abra o arquivo e clique em **Instalar**
3. Pode pedir permissão para instalar de fontes desconhecidas:
   - Configurações → Segurança → Ative "Fontes desconhecidas"

## Troubleshooting

### Erro: "Gradle sync failed"
- Solução: Clique em **File → Sync Now** ou reinicie o Android Studio

### Erro: "SDK not found"
- Solução: Abra **Tools → SDK Manager** e instale o Android SDK 34 (ou mais recente)

### Erro: "Keystore was tampered with"
- Solução: Delete o arquivo `keystore.jks` e crie um novo

### App não abre
- Verifique se o `capacitor.config.ts` tem `webDir: 'dist/public'`
- Execute `npm run build` novamente
- Execute `npx cap sync android`

## Próximas Atualizações

Sempre que você atualizar o código:

```bash
npm run build
npx cap sync android
# Abra no Android Studio e compile novamente
```

## Suporte

Se tiver dúvidas, consulte:
- Documentação Capacitor: https://capacitorjs.com/docs
- Documentação Android Studio: https://developer.android.com/docs

---

**Email para suporte:** gabrielafeitosa5631@gmail.com

**Versão:** PhytoPathometric v1.1.0
