import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const SIZES = {
  'mipmap-ldpi': 36,
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const COLORS = {
  white: [255, 255, 255, 255],
  dark: [20, 88, 47, 255],
  mid: [50, 166, 111, 255],
  light: [142, 202, 66, 255],
  spot: [44, 112, 68, 220],
};

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
  return out;
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPixel(buf, width, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const i = (Math.floor(y) * width + Math.floor(x)) * 4;
  const a = color[3] / 255;
  buf[i] = Math.round(color[0] * a + buf[i] * (1 - a));
  buf[i + 1] = Math.round(color[1] * a + buf[i + 1] * (1 - a));
  buf[i + 2] = Math.round(color[2] * a + buf[i + 2] * (1 - a));
  buf[i + 3] = 255;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function inLeaf(x, y) {
  const cy = 0.53;
  const halfHeight = 0.36;
  const t = (y - cy) / halfHeight;
  if (t < -1 || t > 1) return false;
  const center = 0.5;
  const width = 0.235 * Math.pow(1 - t * t, 0.58) * (1 - 0.16 * t);
  return Math.abs(x - center) <= width;
}

function drawLine(buf, width, ax, ay, bx, by, color, stroke) {
  const minX = Math.floor(Math.min(ax, bx) - stroke);
  const maxX = Math.ceil(Math.max(ax, bx) + stroke);
  const minY = Math.floor(Math.min(ay, by) - stroke);
  const maxY = Math.ceil(Math.max(ay, by) + stroke);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const d = distToSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
      if (d <= stroke / 2) setPixel(buf, width, x, y, color);
    }
  }
}

function drawCircle(buf, width, cx, cy, r, color, stroke = 0) {
  const min = Math.floor(Math.min(cx - r - stroke, cy - r - stroke));
  const max = Math.ceil(Math.max(cx + r + stroke, cy + r + stroke));
  for (let y = min; y <= max; y += 1) {
    for (let x = min; x <= max; x += 1) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if ((stroke && d >= r - stroke / 2 && d <= r + stroke / 2) || (!stroke && d <= r)) {
        setPixel(buf, width, x, y, color);
      }
    }
  }
}

function drawIcon(size) {
  const scale = 4;
  const w = size * scale;
  const buf = Buffer.alloc(w * w * 4);
  for (let i = 0; i < buf.length; i += 4) COLORS.white.forEach((v, c) => { buf[i + c] = v; });

  const s = w;
  const sw = Math.max(2, s * 0.045);
  const corner = [
    [0.19, 0.18, 0.19, 0.34], [0.19, 0.18, 0.35, 0.18],
    [0.81, 0.18, 0.65, 0.18], [0.81, 0.18, 0.81, 0.34],
    [0.19, 0.82, 0.19, 0.66], [0.19, 0.82, 0.35, 0.82],
    [0.81, 0.82, 0.65, 0.82], [0.81, 0.82, 0.81, 0.66],
  ];
  corner.forEach(([ax, ay, bx, by]) => drawLine(buf, w, ax * s, ay * s, bx * s, by * s, COLORS.dark, sw));

  for (let y = 0; y < w; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const nx = (x + 0.5) / s;
      const ny = (y + 0.5) / s;
      if (inLeaf(nx, ny)) {
        const t = Math.max(0, Math.min(1, (nx - 0.28) / 0.44));
        const color = [
          Math.round(COLORS.light[0] * (1 - t) + COLORS.mid[0] * t),
          Math.round(COLORS.light[1] * (1 - t) + COLORS.mid[1] * t),
          Math.round(COLORS.light[2] * (1 - t) + COLORS.mid[2] * t),
          255,
        ];
        setPixel(buf, w, x, y, color);
      }
    }
  }

  for (let y = 0; y < w; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const nx = (x + 0.5) / s;
      const ny = (y + 0.5) / s;
      if (inLeaf(nx, ny)) {
        const nearEdge = !inLeaf(nx - 0.012, ny) || !inLeaf(nx + 0.012, ny) || !inLeaf(nx, ny - 0.012) || !inLeaf(nx, ny + 0.012);
        if (nearEdge) setPixel(buf, w, x, y, COLORS.dark);
      }
    }
  }

  drawLine(buf, w, 0.5 * s, 0.22 * s, 0.5 * s, 0.80 * s, COLORS.dark, sw * 0.8);
  drawLine(buf, w, 0.5 * s, 0.52 * s, 0.38 * s, 0.43 * s, COLORS.dark, sw * 0.55);
  drawLine(buf, w, 0.5 * s, 0.63 * s, 0.36 * s, 0.53 * s, COLORS.dark, sw * 0.55);
  drawLine(buf, w, 0.5 * s, 0.50 * s, 0.59 * s, 0.39 * s, COLORS.dark, sw * 0.55);

  [[0.39, 0.37, 0.025], [0.36, 0.47, 0.02], [0.45, 0.51, 0.03], [0.58, 0.34, 0.025], [0.62, 0.48, 0.03], [0.58, 0.62, 0.032]].forEach(([x, y, r]) => {
    drawCircle(buf, w, x * s, y * s, r * s, COLORS.spot);
  });

  drawCircle(buf, w, 0.66 * s, 0.57 * s, 0.065 * s, COLORS.dark, sw * 0.68);
  drawLine(buf, w, 0.70 * s, 0.61 * s, 0.77 * s, 0.68 * s, COLORS.dark, sw * 0.68);
  drawCircle(buf, w, 0.64 * s, 0.73 * s, 0.014 * s, COLORS.dark, sw * 0.38);
  drawCircle(buf, w, 0.72 * s, 0.78 * s, 0.014 * s, COLORS.dark, sw * 0.38);
  drawLine(buf, w, 0.67 * s, 0.80 * s, 0.72 * s, 0.71 * s, COLORS.dark, sw * 0.38);

  [[0.70, 0.43, 0.025], [0.76, 0.39, 0.045], [0.82, 0.34, 0.065]].forEach(([x, y, h]) => {
    for (let yy = Math.floor((y - h) * s); yy < y * s; yy += 1) {
      for (let xx = Math.floor(x * s); xx < (x + 0.026) * s; xx += 1) {
        setPixel(buf, w, xx, yy, x > 0.78 ? COLORS.light : COLORS.mid);
      }
    }
  });

  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sum = [0, 0, 0, 0];
      for (let yy = 0; yy < scale; yy += 1) {
        for (let xx = 0; xx < scale; xx += 1) {
          const i = ((y * scale + yy) * w + (x * scale + xx)) * 4;
          for (let c = 0; c < 4; c += 1) sum[c] += buf[i + c];
        }
      }
      const o = (y * size + x) * 4;
      for (let c = 0; c < 4; c += 1) out[o + c] = Math.round(sum[c] / (scale * scale));
    }
  }
  return png(size, size, out);
}

for (const [folder, size] of Object.entries(SIZES)) {
  const dir = join(ROOT, 'android', 'app', 'src', 'main', 'res', folder);
  mkdirSync(dir, { recursive: true });
  const icon = drawIcon(size);
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
    writeFileSync(join(dir, name), icon);
  }
  writeFileSync(join(dir, 'ic_launcher_background.png'), png(size, size, Buffer.alloc(size * size * 4, 255)));
}

console.log('Android launcher icons generated.');
