# Protocolo de validação da segmentação para o TCC

## 1. O que o aplicativo mede

O processamento deve seguir esta ordem:

1. remover o fundo e selecionar uma única lâmina foliar;
2. classificar somente o tecido dentro da máscara em sadio, clorose, necrose ou incerto;
3. calcular cada classe usando a mesma máscara e o mesmo denominador;
4. guardar imagem original, mapa segmentado, método/modelo, confiança e avisos.

Pixels de fundo nunca podem aparecer em uma classe. A soma de tecido sadio, clorose, necrose, área removida e área incerta deve reconstruir exatamente a área foliar estimada.

## 2. Aquisição padronizada

- Uma folha por fotografia, sem mão, galho, etiqueta ou outra folha tocando a lâmina.
- Fundo fosco uniforme e contrastante; evitar fundo verde e superfícies brilhantes.
- Luz difusa, sem flash direto, sombras duras ou reflexo especular.
- Câmera paralela à folha, distância e resolução constantes.
- Incluir uma escala e, se possível, uma carta de cor no enquadramento sem encostar na folha.
- Não misturar, no mesmo conjunto experimental, fotografias feitas com protocolos diferentes.

## 3. Conjunto de referência

Anotar manualmente máscaras independentes para fundo, tecido sadio, clorose e necrose. As anotações devem ser feitas sem olhar o resultado do aplicativo. Recomenda-se dupla anotação em uma fração das imagens para medir a concordância entre avaliadores.

Separar as imagens por planta ou parcela em desenvolvimento e teste. Fotografias da mesma folha, planta ou sequência não devem aparecer nos dois grupos. O conjunto de teste não pode ser usado para ajustar limiares.

## 4. Métricas mínimas

Para a máscara da folha e para cada classe, reportar matriz de confusão por pixel, precisão, sensibilidade, especificidade, Dice/F1 e IoU. Para as porcentagens de clorose, necrose e severidade, reportar erro absoluto médio, viés, RMSE, intervalo de confiança e gráfico de Bland–Altman. R² isolado não mede concordância e não deve ser a única métrica.

Definir antes da análise os critérios de aceitação e a regra para resultados de baixa confiança. Um exemplo conservador a ser discutido com a orientação é: Dice da folha ≥ 0,95; Dice por lesão ≥ 0,85; erro absoluto da severidade ≤ 3 pontos percentuais; e repetibilidade intraclasse ≥ 0,90.

## 5. Teste de robustez

Estratificar os resultados por cultura, aparelho, iluminação, fundo, tamanho da folha, nível de severidade e presença de sombra/reflexo. Repetir uma parte das fotografias em dias diferentes. Registrar falhas, inclusive análises rejeitadas pela confiança; não excluir silenciosamente os casos difíceis.

## 6. Execução técnica

```powershell
python -m pytest python_api/tests -q
$env:PHYTO_DISABLE_REMBG='1'
python -m python_api.validate_dataset
python -m python_api.validate_dataset --input C:\caminho\fotos-reais --output C:\caminho\resultados
```

Para a coleta definitiva no Android, configure `VITE_SEGMENTATION_API_URL` com a URL HTTPS da API para usar BiRefNet/ISNet, OpenCV e scikit-image. Sem essa URL, o APK registra o método offline CIELAB; não misture os dois métodos na mesma análise estatística sem avaliar e declarar a diferença.
