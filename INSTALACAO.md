# 🎨 Instalação dos Novos Ícones do PhytoPathometric

## ✅ Arquivos Gerados

Este pacote contém:
- **5 densidades de ícones** (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- **Ícone circular** com fundo transparente
- **playstore_icon.png** (512x512) para Google Play Store

---

## 📋 Passo a Passo

### 1️⃣ Localize a pasta Android do seu projeto

```
C:\Users\Gabriela\Desktop\PhytoPathometric\phytopathometric\android\app\src\main\res\
```

### 2️⃣ Copie as pastas de ícones

Copie todas as pastas `mipmap-*` deste pacote para a pasta `res`:

```
android_icons/mipmap-mdpi/     → android/app/src/main/res/mipmap-mdpi/
android_icons/mipmap-hdpi/     → android/app/src/main/res/mipmap-hdpi/
android_icons/mipmap-xhdpi/    → android/app/src/main/res/mipmap-xhdpi/
android_icons/mipmap-xxhdpi/   → android/app/src/main/res/mipmap-xxhdpi/
android_icons/mipmap-xxxhdpi/  → android/app/src/main/res/mipmap-xxxhdpi/
```

**IMPORTANTE:** Substitua os arquivos existentes quando perguntado!

### 3️⃣ Verifique o AndroidManifest.xml

Abra o arquivo:
```
android/app/src/main/AndroidManifest.xml
```

Confirme que tem esta linha (deve já estar correta):
```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    ...>
```

### 4️⃣ Limpe e recompile o app

No terminal do projeto:

```bash
# Limpar build anterior
cd android
./gradlew clean

# Voltar para raiz
cd ..

# Recompilar
npm run build
npx cap sync android
```

### 5️⃣ Abra no Android Studio e compile

```bash
npx cap open android
```

No Android Studio:
1. **Build → Clean Project**
2. **Build → Rebuild Project**
3. **Build → Generate Signed Bundle / APK**

---

## 🎯 Ícone para Google Play Store

O arquivo `playstore_icon.png` (512x512px) é usado quando você for publicar o app na Google Play Store.

**Onde usar:**
- Google Play Console → Ícone da app → Carregar `playstore_icon.png`

---

## ✅ Verificação

Depois de recompilar:
1. Desinstale a versão antiga do app do celular
2. Instale a nova versão
3. O novo ícone deve aparecer na tela inicial!

---

## 🔄 Problema? Tente isso:

### Ícone não mudou?
```bash
# Limpar cache do Android
cd android
./gradlew clean
./gradlew cleanBuildCache

# Desinstalar app do celular manualmente
# Reinstalar
```

### Ainda aparece o ícone antigo?
- Android pode cachear ícones por algumas horas
- Reinicie o celular
- Ou aguarde algumas horas

---

## 📞 Suporte

Se tiver problemas, tire um print da estrutura de pastas:
```
android/app/src/main/res/
```

E verifique se todas as pastas `mipmap-*` têm os arquivos:
- `ic_launcher.png`
- `ic_launcher_round.png`

---

**Versão:** PhytoPathometric v1.1.0  
**Data:** Maio 2026
