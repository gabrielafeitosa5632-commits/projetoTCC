# API de segmentação foliar

Backend FastAPI usado pelo PhytoPathometric no desenvolvimento e quando uma URL de API é configurada no app. O frontend não executa Python na WebView: se a API não estiver disponível, ele usa o pipeline TypeScript automático já existente como fallback offline.

## Instalação e execução

Na raiz do projeto:

```powershell
python -m venv python_api/.venv
python_api/.venv/Scripts/Activate.ps1
python -m pip install -r python_api/requirements.txt
python -m uvicorn python_api.main:app --host 0.0.0.0 --port 8000 --reload
```

O primeiro processamento tenta baixar e armazenar o `birefnet-general` em `python_api/.model-cache`; se ele falhar, tenta `isnet-general-use`. O OpenCV é usado como fallback da máscara inicial. Em todos os casos, essa máscara inicial é refinada e nunca é usada diretamente como resultado final.

O Vite encaminha `/api/segment-leaf` para `http://127.0.0.1:8000` em desenvolvimento. Para um APK conectado a um servidor, copie `.env.example` para `.env` e defina uma URL HTTPS pública em `VITE_SEGMENTATION_API_URL` antes do build.

## Endpoint

`POST /api/segment-leaf`, com a imagem no campo multipart `image` e a estratégia opcional no campo `sensitivity` (`automatico`, `conservador`, `padrao` ou `sensivel`).

A resposta contém as métricas exigidas, imagens PNG como data URLs e dados adicionais para as visualizações da aba de injúrias. A desfolha principal é sempre calculada por:

```text
removedAreaPx / expectedLeafAreaPx * 100
```

O pipeline mantém máscaras separadas para primeiro plano inicial, tecido presente, forma esperada, furos internos, perda marginal, área removida e fundo. Furos são preservados antes de qualquer preenchimento; o fundo branco só é composto após o cálculo das máscaras.

## Classificação das cores

O fundo é removido **antes** da quantificação. Somente os pixels de tecido presente entram na classificação. O RGB é convertido por `skimage.color.rgb2lab` para CIELAB D65 real; L* é normalizado localmente para reduzir variações suaves de iluminação. O tecido sadio fornece um protótipo robusto por imagem e as classes são comparadas com distância CIEDE2000. Superpixels SLIC regularizam as regiões, enquanto componentes lineares muito estreitos são tratados como nervuras, não como clorose. HSV participa apenas como evidência auxiliar para rejeitar sombra, reflexo e ambiguidades de matiz.

O pipeline preferencial usa estes componentes:

- `rembg` + `onnxruntime`: BiRefNet/ISNet para a máscara inicial;
- `opencv-python-headless`: GrabCut, gradientes, filtros e marcadores;
- `scikit-image`: contorno ativo, watershed, SLIC, CIELAB/CIEDE2000 e morfologia;
- `scipy.ndimage`: reconstrução, distâncias e preenchimento de regiões.

No APK sem uma URL HTTPS em `VITE_SEGMENTATION_API_URL`, esses pacotes Python não podem ser executados dentro da WebView. Nesse caso o aplicativo usa o pipeline TypeScript offline, que também remove o fundo antes do CIELAB, mas deve ser considerado uma contingência. Para coleta definitiva do TCC, configure a API e registre o campo `metodo` exportado junto com cada análise.

## Testes

```powershell
python -m pytest python_api/tests -q
```

Os testes não baixam modelos: usam deliberadamente o fallback OpenCV para validar contrato, invariantes, fundo branco, mão junto ao pecíolo, fundos branco/escuro/solo/verde e separação das classes.

## Validação visual

Para gerar a matriz sintética completa e salvar original, todas as máscaras, sobreposição e métricas:

```powershell
$env:PHYTO_DISABLE_REMBG='1'
python -m python_api.validate_dataset
```

Para fotografias reais:

```powershell
python -m python_api.validate_dataset --input C:\caminho\para\fotos --output C:\caminho\para\resultados
```

Cada fotografia recebe uma pasta própria. Resultados sintéticos ajudam a detectar regressões, mas não substituem validação agronômica com um conjunto real, anotado e representativo de culturas, iluminação, danos e fundos de campo. Não descreva o método como “preciso” ou “validado” no TCC antes de medir Dice/IoU por classe e o erro da severidade em imagens que não participaram do ajuste.
