const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 table
const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, toCrc, crcBuf]);
}

function createPNG(width, height, drawFn) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Wigally's Scale of Justice Emblem
function drawWigallyIcon(x, y, size, isMaskable = false) {
  // Normalize coordinates (-1 to 1)
  const nx = (x - size / 2) / (size / 2);
  const ny = (y - size / 2) / (size / 2);

  // Background: Deep Slate #0f172a with subtle radial gradient
  const distFromCenter = Math.sqrt(nx * nx + ny * ny);

  let bgR = 15;
  let bgG = 23;
  let bgB = 42;

  // Maskable keeps solid full bleed
  if (!isMaskable) {
    // Soft rounded squircle corner mask for standard icon
    const cornerRadius = 0.85;
    const qx = Math.max(Math.abs(nx) - 0.75, 0);
    const qy = Math.max(Math.abs(ny) - 0.75, 0);
    if (Math.sqrt(qx * qx + qy * qy) > 0.22) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
  }

  // Scale down graphics if maskable to fit within safe zone (80%)
  const scale = isMaskable ? 0.70 : 0.82;
  const sx = nx / scale;
  const sy = ny / scale;

  // Golden Amber palette for Scales: #f59e0b to #fbbf24
  const amberR = 245;
  const amberG = 158;
  const amberB = 11;

  const goldR = 251;
  const goldG = 191;
  const goldB = 36;

  // Emerald palette for Wigally accent: #10b981
  const emeraldR = 16;
  const emeraldG = 185;
  const emeraldB = 129;

  // 1. Central Pillar (Vertical column from sy = -0.55 to 0.45)
  if (Math.abs(sx) < 0.05 && sy >= -0.55 && sy <= 0.45) {
    return [goldR, goldG, goldB, 255];
  }

  // 2. Base Pedestal (sy = 0.45 to 0.55, width sx = -0.35 to 0.35)
  if (sy >= 0.45 && sy <= 0.52 && Math.abs(sx) <= 0.35) {
    return [amberR, amberG, amberB, 255];
  }
  if (sy >= 0.52 && sy <= 0.58 && Math.abs(sx) <= 0.45) {
    return [amberR, amberG, amberB, 255];
  }

  // 3. Top Finial / Emerald Gem (Circle at sx=0, sy=-0.58, r=0.08)
  const finialDist = Math.hypot(sx, sy - (-0.58));
  if (finialDist <= 0.08) {
    return [emeraldR, emeraldG, emeraldB, 255];
  }

  // 4. Horizontal Balance Beam (sy = -0.32, sx = -0.58 to 0.58, thickness 0.04)
  if (sy >= -0.35 && sy <= -0.29 && Math.abs(sx) <= 0.58) {
    return [goldR, goldG, goldB, 255];
  }

  // 5. Left Scale String & Pan (Center at sx = -0.45)
  // Strings from (-0.45, -0.30) to (-0.55, 0.05) and (-0.35, 0.05)
  const leftX = sx - (-0.45);
  // String 1:
  const lineDist1 = Math.abs((leftX * 0.35) - ((sy - (-0.30)) * -0.10)) / 0.36;
  if (sy >= -0.30 && sy <= 0.05 && lineDist1 < 0.02) {
    return [amberR, amberG, amberB, 220];
  }
  // String 2:
  const lineDist2 = Math.abs((leftX * 0.35) - ((sy - (-0.30)) * 0.10)) / 0.36;
  if (sy >= -0.30 && sy <= 0.05 && lineDist2 < 0.02) {
    return [amberR, amberG, amberB, 220];
  }
  // Left Pan (Dish shape: circle arc at bottom)
  const panLeftDist = Math.hypot(leftX, sy - 0.02);
  if (panLeftDist <= 0.16 && sy >= 0.05 && sy <= 0.13) {
    return [goldR, goldG, goldB, 255];
  }

  // 6. Right Scale String & Pan (Center at sx = 0.45)
  const rightX = sx - 0.45;
  const lineDist3 = Math.abs((rightX * 0.35) - ((sy - (-0.30)) * -0.10)) / 0.36;
  if (sy >= -0.30 && sy <= 0.05 && lineDist3 < 0.02) {
    return [amberR, amberG, amberB, 220];
  }
  const lineDist4 = Math.abs((rightX * 0.35) - ((sy - (-0.30)) * 0.10)) / 0.36;
  if (sy >= -0.30 && sy <= 0.05 && lineDist4 < 0.02) {
    return [amberR, amberG, amberB, 220];
  }
  const panRightDist = Math.hypot(rightX, sy - 0.02);
  if (panRightDist <= 0.16 && sy >= 0.05 && sy <= 0.13) {
    return [goldR, goldG, goldB, 255];
  }

  // 7. Emerald Dot in Right Pan (Symbolizing verified law / balance)
  const dotDist = Math.hypot(rightX, sy - 0.02);
  if (dotDist <= 0.045) {
    return [emeraldR, emeraldG, emeraldB, 255];
  }

  // Return base background
  return [bgR, bgG, bgB, 255];
}

// Generate Icons
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating 192x192 icon...');
const icon192 = createPNG(192, 192, (x, y, s) => drawWigallyIcon(x, y, s, false));
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

console.log('Generating 512x512 standard icon...');
const icon512 = createPNG(512, 512, (x, y, s) => drawWigallyIcon(x, y, s, false));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

console.log('Generating 512x512 maskable icon...');
const iconMaskable512 = createPNG(512, 512, (x, y, s) => drawWigallyIcon(x, y, s, true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), iconMaskable512);

console.log('Generating 180x180 apple touch icon...');
const appleTouch = createPNG(180, 180, (x, y, s) => drawWigallyIcon(x, y, s, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

console.log('Generating 32x32 favicon...');
const favicon32 = createPNG(32, 32, (x, y, s) => drawWigallyIcon(x, y, s, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon32);

console.log('All PWA icons successfully generated!');
