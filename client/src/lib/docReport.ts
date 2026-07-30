import { formatSeverityPercentage, type AnalysisResult } from '@/contexts/AnalysisContext';
import type { AgronomistaProfile } from '@/lib/profileTypes';

interface ReportContext {
  profile?: AgronomistaProfile;
  logoUrl?: string;
}

function safe(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return 'Nao informado';
  return String(value);
}

function escapeHtml(value: string | number | undefined | null) {
  return safe(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString('pt-BR');
}

function px(value: number) {
  return `${value.toLocaleString('pt-BR')} px2`;
}

function getTechnicalInterpretation(analysis: AnalysisResult) {
  return `A avaliacao fitopatometrica mediu severidade foliar de ${formatSeverityPercentage(analysis.severidade)} na amostra. O percentual corresponde a soma de clorose e necrose dividida pela area foliar valida. A interpretacao agronomica depende da cultura, da doenca, do estadio fenologico e do protocolo de amostragem.`;
}

function getRecommendations() {
  return [
    'Validar a mascara e a classificacao na imagem segmentada antes de usar o resultado.',
    'Repetir a amostragem em folhas representativas e registrar o protocolo de captura.',
    'Interpretar o percentual conforme a cultura, a doenca e orientacao tecnica especifica.',
  ];
}

function imageToDataUrl(src?: string, maxDimension = 900): Promise<string | null> {
  if (!src) return Promise.resolve(null);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    if (!src.startsWith('data:')) image.crossOrigin = 'anonymous';
    image.src = src;
  });
}

type ReportRow = [string, string | number | undefined | null];

function fieldRows(analysis: AnalysisResult): ReportRow[] {
  const field = analysis.field || {};
  return [
    ['Cultura', analysis.cultura],
    ['Propriedade', field.propriedadeNome],
    ['Municipio/UF', field.municipio || field.uf ? `${safe(field.municipio)}/${safe(field.uf)}` : undefined],
    ['Talhao', field.talhao],
    ['Cultivar', field.cultivar],
    ['Estadio fenologico', field.estadioFenologico],
    ['Safra', field.safra],
    ['Data da analise', formatDate(analysis.timestamp)],
    ['ID da analise', analysis.id],
  ];
}

function metricRows(analysis: AnalysisResult): ReportRow[] {
  return [
    ['Severidade foliar', formatSeverityPercentage(analysis.severidade)],
    ['Area foliar valida', px(analysis.areaTotal)],
    ['Area lesionada', px(analysis.areaLesionada)],
    ['Area saudavel', px(analysis.areaSaudavel)],
    ['Area foliar estimada', analysis.segmentacao ? px(analysis.segmentacao.areaFoliarEstimada) : undefined],
    ['Necrose detectada', analysis.segmentacao ? px(analysis.segmentacao.areaNecrose) : undefined],
    ['Clorose detectada', analysis.segmentacao ? px(analysis.segmentacao.areaClorose) : undefined],
    ['Regiao incerta', analysis.segmentacao?.areaIncerta !== undefined ? px(analysis.segmentacao.areaIncerta) : undefined],
    ['Area ausente/recortada', analysis.segmentacao ? px(analysis.segmentacao.areaAusente) : undefined],
    ['Confianca da segmentacao', typeof analysis.segmentacao?.confiancaSegmentacao === 'number' ? `${(analysis.segmentacao.confiancaSegmentacao * 100).toFixed(0)}%` : undefined],
    ['Amostra saudavel de referencia', typeof analysis.segmentacao?.amostraReferenciaSaudavel === 'number' ? `${analysis.segmentacao.amostraReferenciaSaudavel.toFixed(1)}%` : undefined],
    ['Ruido removido', typeof analysis.segmentacao?.ruidoRemovido === 'number' ? px(analysis.segmentacao.ruidoRemovido) : undefined],
  ];
}

function renderRows(rows: ReportRow[]) {
  return rows
    .map(([label, value]) => `
      <tr>
        <th>${escapeHtml(label)}</th>
        <td>${escapeHtml(value)}</td>
      </tr>
    `)
    .join('');
}

export async function downloadAnalysisDoc(analysis: AnalysisResult, context: ReportContext = {}) {
  const profile = context.profile;
  const logo = await imageToDataUrl(context.logoUrl || '/logo-new.jpeg', 320);
  const original = await imageToDataUrl(analysis.imageDataUrl);
  const processed = await imageToDataUrl(analysis.processedImageDataUrl);
  const recommendations = getRecommendations();

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Relatorio PhytoPathometric</title>
  <style>
    @page WordSection1 { size: 21cm 29.7cm; margin: 1.8cm; }
    body {
      color: #17231d;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
    }
    .header {
      background: #073522;
      color: #ffffff;
      padding: 18px 20px;
      border-radius: 10px;
      margin-bottom: 18px;
    }
    .header-table { width: 100%; border-collapse: collapse; }
    .header-table td { border: 0; vertical-align: middle; }
    .logo { width: 64px; height: 64px; object-fit: contain; background: #ffffff; border-radius: 10px; }
    h1 { font-size: 22pt; margin: 0; }
    h2 { color: #073522; font-size: 14pt; margin: 20px 0 8px; }
    h3 { color: #265d3d; font-size: 12pt; margin: 14px 0 6px; }
    .subtitle { color: #c7f2d6; margin: 4px 0 0; }
    .badge {
      display: inline-block;
      border: 1px solid #a7f3d0;
      background: #ecfdf5;
      color: #0f766e;
      font-weight: bold;
      padding: 7px 12px;
      border-radius: 16px;
    }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; }
    th, td { border: 1px solid #d9e7dd; padding: 7px 8px; text-align: left; vertical-align: top; }
    th { width: 34%; background: #eef7f0; color: #214c35; }
    .summary {
      border-left: 5px solid #0f766e;
      background: #f7fbf7;
      padding: 12px 14px;
      margin: 12px 0;
    }
    .images { width: 100%; border-collapse: collapse; }
    .images td { width: 50%; border: 1px solid #d9e7dd; text-align: center; }
    .report-img { max-width: 95%; max-height: 250px; }
    .note {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      color: #7c2d12;
      padding: 10px 12px;
      margin-top: 14px;
    }
    .footer {
      color: #607367;
      font-size: 9pt;
      margin-top: 24px;
      border-top: 1px solid #d9e7dd;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <table class="header-table">
      <tr>
        <td style="width: 78px;">${logo ? `<img class="logo" src="${logo}" alt="PhytoPathometric" />` : ''}</td>
        <td>
          <h1>Relatorio tecnico de analise fitopatometrica</h1>
          <p class="subtitle">Documento gerado pelo PhytoPathometric em ${escapeHtml(formatDate(new Date()))}</p>
        </td>
      </tr>
    </table>
  </div>

  <p class="badge">Severidade foliar: ${escapeHtml(formatSeverityPercentage(analysis.severidade))}</p>

  <h2>1. Identificacao da amostra</h2>
  <table>${renderRows(fieldRows(analysis))}</table>

  <h2>2. Responsavel tecnico</h2>
  <table>
    ${renderRows([
      ['Agronomo(a)', profile?.nome],
      ['CREA', profile?.crea],
      ['Empresa', profile?.empresa],
      ['E-mail', profile?.email],
      ['Telefone', profile?.telefone],
    ])}
  </table>

  <h2>3. Resultado quantitativo</h2>
  <table>${renderRows(metricRows(analysis))}</table>

  <h2>4. Interpretacao tecnica</h2>
  <div class="summary">
    <p>${escapeHtml(getTechnicalInterpretation(analysis))}</p>
    <p><strong>Observacao:</strong> A interpretacao agronomica do percentual varia conforme a cultura e a doenca avaliada.</p>
  </div>

  <h2>5. Recomendacoes</h2>
  <ul>
    ${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
  </ul>

  <h2>6. Evidencias por imagem</h2>
  <table class="images">
    <tr>
      <th>Imagem original</th>
      <th>Imagem segmentada</th>
    </tr>
    <tr>
      <td>${original ? `<img class="report-img" src="${original}" alt="Imagem original" />` : 'Imagem nao disponivel'}</td>
      <td>${processed ? `<img class="report-img" src="${processed}" alt="Imagem segmentada" />` : 'Imagem nao disponivel'}</td>
    </tr>
  </table>

  <h2>7. Observacoes de campo</h2>
  <p>${escapeHtml(analysis.observacoes || 'Sem observacoes registradas.')}</p>

  <h2>8. Metodologia</h2>
  <p>
    A analise foi realizada por ${escapeHtml(analysis.segmentacao?.metodo || 'segmentacao digital da imagem foliar')}, com separacao de area foliar,
    tecido saudavel e tecido lesionado. O percentual de severidade foi calculado pela razao entre
    pixels de clorose mais necrose e a area foliar valida. Fundo e area removida foram excluidos desse calculo.
  </p>

  <div class="note">
    Este relatorio auxilia o registro tecnico e o acompanhamento de campo. A decisao de manejo deve considerar
    amostragem representativa, diagnostico do agente causal, condicoes ambientais, estadio da cultura e recomendacao profissional.
  </div>

  <div class="footer">
    PhytoPathometric - ID ${escapeHtml(analysis.id)} - Documento editavel em Word/Google Docs apos abertura do arquivo.
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `relatorio_${sanitizeFilename(analysis.cultura)}_${analysis.id}.doc`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
