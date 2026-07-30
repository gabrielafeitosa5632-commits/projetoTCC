import type { AnalysisResult } from '@/contexts/AnalysisContext';
import type { AgronomistaProfile } from '@/lib/profileTypes';

interface ReportContext {
  profile?: AgronomistaProfile;
  logoUrl?: string;
}

interface PdfImage {
  name: string;
  data: Uint8Array;
  width: number;
  height: number;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;

function textByte(value: string) {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u2026/g, '...')
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (char === '\\' || char === '(' || char === ')') return `\\${char}`;
      if (code === 10 || code === 13) return ' ';
      return code <= 255 ? char : '?';
    })
    .join('');
}

function toBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function dataUrlToBytes(dataUrl: string) {
  const [, base64 = ''] = dataUrl.split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    if (!src.startsWith('data:')) image.crossOrigin = 'anonymous';
    image.src = src;
  });
}

async function imageToJpeg(src?: string, maxDimension = 1100): Promise<Omit<PdfImage, 'name'> | null> {
  if (!src) return null;
  try {
    const image = await loadImage(src);
    const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return {
      data: dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.84)),
      width,
      height,
    };
  } catch {
    return null;
  }
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString('pt-BR');
}

function safe(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function wrapText(value: string, maxChars: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitImage(image: PdfImage, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  return {
    width: image.width * ratio,
    height: image.height * ratio,
  };
}

function buildPdf(content: string, images: PdfImage[]) {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const append = (value: string | Uint8Array) => {
    const bytes = typeof value === 'string' ? toBytes(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };

  const imageStartId = 6;
  const contentId = imageStartId + images.length;
  const maxObjectId = contentId;
  const imageResources = images
    .map((image, index) => `/${image.name} ${imageStartId + index} 0 R`)
    .join(' ');

  append('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const addObject = (id: number, body: string) => {
    offsets[id] = length;
    append(`${id} 0 obj\n${body}\nendobj\n`);
  };

  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << ${imageResources} >> >> /Contents ${contentId} 0 R >>`,
  );
  addObject(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addObject(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  images.forEach((image, index) => {
    const id = imageStartId + index;
    offsets[id] = length;
    append(`${id} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`);
    append(image.data);
    append('\nendstream\nendobj\n');
  });

  addObject(contentId, `<< /Length ${toBytes(content).length} >>\nstream\n${content}\nendstream`);

  const xrefOffset = length;
  append(`xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= maxObjectId; id++) {
    append(`${String(offsets[id] || 0).padStart(10, '0')} 00000 n \n`);
  }
  append(`trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return concatBytes(chunks);
}

function sanitizeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export async function downloadAnalysisPdf(analysis: AnalysisResult, context: ReportContext = {}) {
  const logo = await imageToJpeg(context.logoUrl || '/logo-new.jpeg', 360);
  const original = await imageToJpeg(analysis.imageDataUrl);
  const processed = await imageToJpeg(analysis.processedImageDataUrl);
  const images: PdfImage[] = [];
  if (logo) images.push({ ...logo, name: 'ImLogo' });
  if (original) images.push({ ...original, name: 'ImOriginal' });
  if (processed) images.push({ ...processed, name: 'ImProcessed' });

  const commands: string[] = [];
  const write = (value: string) => commands.push(value);
  const text = (value: string, x: number, y: number, size = 10, font: 'F1' | 'F2' = 'F1', color = '0 0 0') => {
    write(`BT ${color} rg /${font} ${size} Tf ${x} ${y} Td (${textByte(value)}) Tj ET`);
  };
  const rect = (x: number, y: number, w: number, h: number, color: string, stroke = false) => {
    write(`q ${color} ${stroke ? 'RG' : 'rg'} ${x} ${y} ${w} ${h} re ${stroke ? 'S' : 'f'} Q`);
  };
  const drawImage = (image: PdfImage | undefined, x: number, y: number, maxWidth: number, maxHeight: number) => {
    if (!image) return;
    const size = fitImage(image, maxWidth, maxHeight);
    const drawX = x + (maxWidth - size.width) / 2;
    const drawY = y + (maxHeight - size.height) / 2;
    write(`q ${size.width.toFixed(2)} 0 0 ${size.height.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /${image.name} Do Q`);
  };

  const field = analysis.field || {};
  const profile = context.profile;
  const logoImage = images.find(image => image.name === 'ImLogo');
  const originalImage = images.find(image => image.name === 'ImOriginal');
  const processedImage = images.find(image => image.name === 'ImProcessed');

  rect(0, 770, PAGE_WIDTH, 72, '0.025 0.170 0.120');
  if (logoImage) drawImage(logoImage, MARGIN, 780, 52, 52);
  text('PhytoPathometric', 108, 808, 18, 'F2', '1 1 1');
  text('Relatorio tecnico de analise fitopatometrica', 108, 789, 11, 'F1', '0.78 0.95 0.84');
  text(`ID ${analysis.id} | ${formatDate(analysis.timestamp)}`, 390, 807, 8, 'F1', '0.78 0.95 0.84');
  text(`Severidade foliar ${analysis.severidade.toFixed(2)}%`, 370, 792, 11, 'F2', '1 1 1');

  rect(MARGIN, 716, PAGE_WIDTH - MARGIN * 2, 34, '0.925 0.975 0.945');
  rect(MARGIN, 716, PAGE_WIDTH - MARGIN * 2, 34, '0.655 0.820 0.690', true);
  text(`Percentual medido: ${analysis.severidade.toFixed(2)}%`, MARGIN + 14, 735, 12, 'F2');
  text('Interpretar conforme a cultura e a doenca avaliada.', MARGIN + 245, 735, 9);

  const rows: Array<[string, string]> = [
    ['Cultura', analysis.cultura],
    ['Propriedade', safe(field.propriedadeNome)],
    ['Municipio/UF', field.municipio || field.uf ? `${safe(field.municipio)}/${safe(field.uf)}` : '-'],
    ['Talhao', safe(field.talhao)],
    ['Cultivar', safe(field.cultivar)],
    ['Estadio fenologico', safe(field.estadioFenologico)],
    ['Safra', safe(field.safra)],
    ['Area foliar valida', `${analysis.areaTotal.toLocaleString('pt-BR')} px2`],
    ['Area lesionada', `${analysis.areaLesionada.toLocaleString('pt-BR')} px2`],
    ['Area saudavel', `${analysis.areaSaudavel.toLocaleString('pt-BR')} px2`],
  ];

  let y = 690;
  text('Dados da avaliacao', MARGIN, y, 12, 'F2');
  y -= 22;
  rows.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? MARGIN : 315;
    if (index > 0 && index % 2 === 0) y -= 28;
    text(label, x, y + 11, 8, 'F2');
    text(value, x, y - 2, 10);
  });

  const agronomistRows = [
    ['Agronomo(a)', safe(profile?.nome)],
    ['CREA', safe(profile?.crea)],
    ['Empresa', safe(profile?.empresa)],
    ['E-mail', safe(profile?.email)],
    ['Telefone', safe(profile?.telefone)],
  ];
  y -= 46;
  text('Responsavel tecnico', MARGIN, y, 12, 'F2');
  y -= 22;
  agronomistRows.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? MARGIN : 315;
    if (index > 0 && index % 2 === 0) y -= 28;
    text(label, x, y + 11, 8, 'F2');
    text(value, x, y - 2, 10);
  });

  const imageTop = 326;
  text('Foto original', MARGIN, imageTop + 184, 11, 'F2');
  text('Imagem segmentada', 314, imageTop + 184, 11, 'F2');
  rect(MARGIN, imageTop, 240, 170, '0.970 0.970 0.970');
  rect(314, imageTop, 240, 170, '0.970 0.970 0.970');
  drawImage(originalImage, MARGIN, imageTop, 240, 170);
  drawImage(processedImage, 314, imageTop, 240, 170);

  y = 286;
  text('Metricas de segmentacao', MARGIN, y, 12, 'F2');
  y -= 20;
  const segmentationRows = [
    ['Necrose detectada', analysis.segmentacao ? `${analysis.segmentacao.areaNecrose.toLocaleString('pt-BR')} px2` : '-'],
    ['Clorose detectada', analysis.segmentacao ? `${analysis.segmentacao.areaClorose.toLocaleString('pt-BR')} px2` : '-'],
    ['Regiao incerta', analysis.segmentacao?.areaIncerta !== undefined ? `${analysis.segmentacao.areaIncerta.toLocaleString('pt-BR')} px2` : '-'],
    ['Area foliar estimada', analysis.segmentacao ? `${analysis.segmentacao.areaFoliarEstimada.toLocaleString('pt-BR')} px2` : '-'],
    ['Area ausente/recortada', analysis.segmentacao ? `${analysis.segmentacao.areaAusente.toLocaleString('pt-BR')} px2` : '-'],
    ['Confianca segmentacao', typeof analysis.segmentacao?.confiancaSegmentacao === 'number' ? `${(analysis.segmentacao.confiancaSegmentacao * 100).toFixed(0)}%` : '-'],
    ['Amostra saudavel ref.', typeof analysis.segmentacao?.amostraReferenciaSaudavel === 'number' ? `${analysis.segmentacao.amostraReferenciaSaudavel.toFixed(1)}%` : '-'],
  ];
  segmentationRows.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? MARGIN : 315;
    if (index > 0 && index % 2 === 0) y -= 24;
    text(label, x, y + 9, 8, 'F2');
    text(value, x, y - 3, 10);
  });

  y -= 42;
  text('Observacoes', MARGIN, y, 12, 'F2');
  const noteLines = wrapText(analysis.observacoes || 'Sem observacoes registradas.', 96).slice(0, 5);
  y -= 18;
  noteLines.forEach((line) => {
    text(line, MARGIN, y, 9);
    y -= 13;
  });

  text(`Metodo: ${analysis.segmentacao?.metodo || 'segmentacao foliar por HSV + CIELAB'}. Conferir resultado em campo antes de decisao agronomica.`, MARGIN, 52, 8);
  text(`Gerado em ${formatDate(new Date())}`, MARGIN, 38, 8);

  const pdfBytes = buildPdf(commands.join('\n'), images);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `relatorio_${sanitizeFilename(analysis.cultura)}_${analysis.id}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
