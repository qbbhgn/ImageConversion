import type { OutputResult, ResizeSettings, SourceImageInfo } from '../types'
import {
  blobToDataUrl,
  canvasToBlob,
  createImageCanvas,
  dataUrlToBase64,
  loadImage,
} from './image'
import { canvasToPixelSvg, imageToSvg } from './svg'
import { resizeAnimatedGif } from './gif'
import { safeClassName } from './format'

export interface GenerateOptions {
  source: SourceImageInfo
  buffer: ArrayBuffer
  dataUrl: string
  settings: ResizeSettings
  onProgress?: (percent: number) => void
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'image'
}

function clampDim(v: number): number {
  return Math.max(1, Math.min(8192, Math.round(v || 1)))
}

interface StaticMime {
  mime: string
  ext: string
}

function resolveStaticMime(
  format: ResizeSettings['outputFormat'],
  source: SourceImageInfo
): StaticMime {
  switch (format) {
    case 'png':
      return { mime: 'image/png', ext: 'png' }
    case 'jpeg':
      return { mime: 'image/jpeg', ext: 'jpg' }
    case 'webp':
      return { mime: 'image/webp', ext: 'webp' }
    case 'original':
    default:
      switch (source.format) {
        case 'jpeg':
          return { mime: 'image/jpeg', ext: 'jpg' }
        case 'webp':
          return { mime: 'image/webp', ext: 'webp' }
        case 'gif':
        case 'bmp':
        case 'svg':
        default:
          return { mime: 'image/png', ext: 'png' }
      }
  }
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 根据源图片与设置，生成所有代码格式输出。
 * 静态图（含 GIF 取首帧）：Canvas 缩放/转格式 → base64 / svg / html / css / 像素 SVG
 * 动画 GIF（保留动画）：gifuct-js 解码 + gif.js 重新编码 → base64 / svg / html / css
 */
export async function buildOutputs(
  opts: GenerateOptions
): Promise<OutputResult[]> {
  const { source, buffer, dataUrl, settings, onProgress } = opts
  const base = baseName(source.fileName)
  const results: OutputResult[] = []
  const resize = settings.enabled
  const outW = resize ? clampDim(settings.width) : source.width
  const outH = resize ? clampDim(settings.height) : source.height

  const keepAnimated =
    source.isGif && source.isAnimated && settings.gifMode === 'animated'

  let outDataUrl = dataUrl
  let outWidth = source.width
  let outHeight = source.height
  let staticCanvas: HTMLCanvasElement | null = null

  if (keepAnimated) {
    // 动画 GIF：缩放则重新编码动画，否则使用原始文件
    if (resize) {
      const blob = await resizeAnimatedGif(buffer, outW, outH, (p) =>
        onProgress?.(p * 100)
      )
      outDataUrl = await blobToDataUrl(blob)
      outWidth = outW
      outHeight = outH
    }
  } else {
    // 静态路径（含 GIF 取首帧）
    const img = await loadImage(dataUrl)
    // GIF 取首帧时也必须重编码为静态图
    const firstFrameGif = source.isGif && settings.gifMode === 'first-frame'
    const needReencode =
      resize || settings.outputFormat !== 'original' || firstFrameGif
    outWidth = resize ? outW : img.naturalWidth
    outHeight = resize ? outH : img.naturalHeight
    if (needReencode) {
      const { mime } = resolveStaticMime(settings.outputFormat, source)
      const bg = mime === 'image/jpeg' ? '#ffffff' : undefined
      staticCanvas = createImageCanvas(img, outWidth, outHeight, bg)
      const blob = await canvasToBlob(staticCanvas, mime, settings.quality)
      outDataUrl = await blobToDataUrl(blob)
    } else {
      staticCanvas = createImageCanvas(img, outWidth, outHeight)
    }
  }

  const rawBase64 = dataUrlToBase64(outDataUrl)

  results.push({
    key: 'base64',
    label: 'Base64（Data URL）',
    hint: 'data:image/...;base64 形式，可直接用于 <img src>、CSS url()、fetch 等场景',
    mime: 'text/plain',
    extension: 'txt',
    content: outDataUrl,
    size: outDataUrl.length,
    fileName: `${base}.base64.txt`,
  })

  results.push({
    key: 'base64-raw',
    label: 'Base64 纯数据',
    hint: '不含 data: 前缀的纯 Base64 字符串',
    mime: 'text/plain',
    extension: 'txt',
    content: rawBase64,
    size: rawBase64.length,
    fileName: `${base}.base64.txt`,
  })

  const svgEmbed = imageToSvg(outDataUrl, outWidth, outHeight, source.fileName)
  results.push({
    key: 'svg',
    label: 'SVG（内嵌图片）',
    hint: '把图片数据内嵌到 SVG 的 <image> 中，任意缩放不模糊',
    mime: 'image/svg+xml',
    extension: 'svg',
    content: svgEmbed,
    size: svgEmbed.length,
    fileName: `${base}.svg`,
  })

  if (staticCanvas) {
    try {
      const pixelSvg = canvasToPixelSvg(staticCanvas, { maxPixels: 250000 })
      results.push({
        key: 'svg-pixel',
        label: 'SVG（像素风）',
        hint: '每个像素用 <rect> 表示，真正的矢量像素画（适合小图/图标）',
        mime: 'image/svg+xml',
        extension: 'svg',
        content: pixelSvg,
        size: pixelSvg.length,
        fileName: `${base}.pixel.svg`,
      })
    } catch {
      // 尺寸过大时自动跳过像素 SVG
    }
  }

  const html = `<img src="${outDataUrl}" alt="${escapeAttr(base)}" width="${outWidth}" height="${outHeight}" />`
  results.push({
    key: 'html',
    label: 'HTML <img>',
    hint: '可直接粘贴到网页中的图片标签',
    mime: 'text/html',
    extension: 'html',
    content: html,
    size: html.length,
    fileName: `${base}.html`,
  })

  const cssClass = safeClassName(base)
  const css =
    `.${cssClass} {\n` +
    `  width: ${outWidth}px;\n` +
    `  height: ${outHeight}px;\n` +
    `  background-image: url("${outDataUrl}");\n` +
    `  background-size: 100% 100%;\n` +
    `}`
  results.push({
    key: 'css',
    label: 'CSS background',
    hint: '作为背景图内嵌到 CSS 中',
    mime: 'text/css',
    extension: 'css',
    content: css,
    size: css.length,
    fileName: `${base}.css`,
  })

  return results
}
