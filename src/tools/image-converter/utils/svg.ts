function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 生成内嵌图片的 SVG：把图片 Data URL 嵌入 <image> 标签。
 * 适用于任意位图（包括动画 GIF），且 SVG 可任意缩放。
 */
export function imageToSvg(
  dataUrl: string,
  width: number,
  height: number,
  title?: string
): string {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  const titleTag = title ? `  <title>${escapeXml(title)}</title>\n` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n` +
    titleTag +
    `  <image href="${dataUrl}" xlink:href="${dataUrl}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" />\n` +
    `</svg>`
  )
}

function rgbaColor(r: number, g: number, b: number, a: number): string {
  if (a === 255) return `rgb(${r},${g},${b})`
  return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`
}

export interface PixelSvgOptions {
  /** 最大像素数，超出则拒绝生成（防止生成超大文件） */
  maxPixels?: number
}

/**
 * 生成"像素风"矢量 SVG：每个像素（横向合并连续同色像素）用 <rect> 表示。
 * 适合小尺寸图片 / 图标 / 像素画，是真正的矢量图形。
 */
export function canvasToPixelSvg(
  canvas: HTMLCanvasElement,
  opts: PixelSvgOptions = {}
): string {
  const maxPixels = opts.maxPixels ?? 250000
  const width = canvas.width
  const height = canvas.height
  const pixelCount = width * height
  if (pixelCount > maxPixels) {
    throw new Error(
      `像素数 ${pixelCount} 超出限制（最大 ${maxPixels}），请缩小图片后再生成像素 SVG`
    )
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('无法读取画布像素')
  const data = ctx.getImageData(0, 0, width, height).data
  const rects: string[] = []
  for (let y = 0; y < height; y++) {
    let x = 0
    while (x < width) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]
      if (a === 0) {
        x += 1
        continue
      }
      let run = 1
      while (x + run < width) {
        const j = (y * width + x + run) * 4
        if (
          data[j] === r &&
          data[j + 1] === g &&
          data[j + 2] === b &&
          data[j + 3] === a
        )
          run += 1
        else break
      }
      rects.push(
        `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${rgbaColor(r, g, b, a)}" />`
      )
      x += run
    }
  }
  const body = rects.join('\n  ')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `shape-rendering="crispEdges" width="${width}" height="${height}">\n  ` +
    body +
    `\n</svg>`
  )
}
