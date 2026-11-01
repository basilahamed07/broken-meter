/* Generates the app icons (dark background, red "broke meter" dial). Pure Node, no dependencies.
 * Runs on postinstall and only writes files that are missing, so you can drop in your own artwork. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const BG = [17, 17, 17, 255];
const CLEAR = [0, 0, 0, 0];
// dial: ring + needle pointing into the red zone
function dial(u, v, scale, colors) {
  const x = (u - 0.5) / scale, y = (v - 0.55) / scale;
  const r = Math.hypot(x, y), ang = Math.atan2(-y, x); // 0 = right, PI = left
  if (r > 0.30 && r < 0.40 && y <= 0) {
    const t = 1 - Math.min(1, Math.max(0, ang / Math.PI)); // 0 left .. 1 right
    return t < 0.4 ? colors.green : t < 0.7 ? colors.amber : colors.red;
  }
  // needle toward the red end
  const na = 0.45, nx = Math.cos(na), ny = -Math.sin(na);
  const along = x * nx + y * ny, across = Math.abs(x * ny - y * nx);
  if (along > 0 && along < 0.30 && across < 0.018) return colors.text;
  if (r < 0.045) return colors.text;
  return null;
}
const COL = { green: [29, 158, 117, 255], amber: [239, 159, 39, 255], red: [226, 75, 74, 255], text: [242, 241, 236, 255] };

const files = {
  'icon.png': [1024, (u, v) => dial(u, v, 1, COL) || BG],
  'splash-icon.png': [512, (u, v) => dial(u, v, 1, COL) || CLEAR],
  'android-icon-foreground.png': [512, (u, v) => dial(u, v, 1.5, COL) || CLEAR],
  'android-icon-background.png': [512, () => BG],
  'android-icon-monochrome.png': [432, (u, v) => (dial(u, v, 1.5, { green: COL.text, amber: COL.text, red: COL.text, text: COL.text }) ? [0, 0, 0, 255] : CLEAR)],
  'favicon.png': [48, (u, v) => dial(u, v, 1, COL) || BG],
};

const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });
for (const [name, [size, fn]] of Object.entries(files)) {
  const f = path.join(dir, name);
  if (!fs.existsSync(f)) { fs.writeFileSync(f, png(size, fn)); console.log('generated assets/' + name); }
}
