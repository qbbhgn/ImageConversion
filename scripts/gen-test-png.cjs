/* 生成测试用 PNG（96x96 RGBA，含半透明区域），用于本地功能测试 */
const zlib = require('zlib')
const fs = require('fs')

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

const w = 96
const h = 96
const raw = Buffer.alloc(h * (1 + w * 4))
for (let y = 0; y < h; y++) {
  const rowStart = y * (1 + w * 4)
  raw[rowStart] = 0 // filter: none
  for (let x = 0; x < w; x++) {
    const i = rowStart + 1 + x * 4
    raw[i] = Math.round((x * 255) / w)
    raw[i + 1] = Math.round((y * 255) / h)
    raw[i + 2] = Math.round(((x + y) * 255) / (w + h))
    raw[i + 3] = x < w / 2 ? 255 : 128 // 右侧半透明
  }
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(w, 0)
ihdr.writeUInt32BE(h, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type: RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])

const out = 'test-data/sample.png'
fs.writeFileSync(out, png)
console.log(`written ${out} (${png.length} bytes, ${w}x${h})`)
