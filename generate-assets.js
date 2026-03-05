/**
 * Generate valid PNG asset files for the app
 * Uses only Node.js built-in modules (zlib)
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Build CRC32 lookup table
const crc32table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crc32table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.allocUnsafe(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.allocUnsafe(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function generatePNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build scanlines: filter byte (0) + RGB per pixel, row by row
  const rowLen = 1 + width * 3;
  const rawData = Buffer.allocUnsafe(rowLen * height);
  for (let y = 0; y < height; y++) {
    const off = y * rowLen;
    rawData[off] = 0; // no filter
    for (let x = 0; x < width; x++) {
      rawData[off + 1 + x * 3] = r;
      rawData[off + 2 + x * 3] = g;
      rawData[off + 3 + x * 3] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 1 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const assetsDir = path.join(__dirname, 'assets');

// Dark navy background: #1a1a2e = rgb(26, 26, 46)
const [r, g, b] = [26, 26, 46];

console.log('Generating icon.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), generatePNG(1024, 1024, r, g, b));

console.log('Generating adaptive-icon.png (1024x1024)...');
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), generatePNG(1024, 1024, r, g, b));

console.log('Generating splash.png (1080x1920)...');
fs.writeFileSync(path.join(assetsDir, 'splash.png'), generatePNG(1080, 1920, r, g, b));

console.log('Done! All assets generated.');
