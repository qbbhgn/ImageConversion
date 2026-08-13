/** 将 File 读取为 Data URL */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

/** 将 File 读取为 ArrayBuffer */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

/** 将 Blob 读取为 Data URL */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('读取数据失败'))
    reader.readAsDataURL(blob)
  })
}

/** ArrayBuffer → 纯 Base64 字符串 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Base64 + MIME → Data URL */
export function base64ToDataUrl(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`
}

/** 从 Data URL 中提取纯 Base64 */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

/** Data URL → Blob */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, payload] = dataUrl.split(',')
  const mime = /^data:(.*?)(;|$)/.exec(meta)?.[1] ?? 'application/octet-stream'
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** 加载图片元素 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片解码失败，请确认文件有效'))
    img.src = src
  })
}

/**
 * 按目标尺寸绘制图片（等比放大/缩小，非裁剪）。
 * @param background 可选背景色，用于 JPEG 等不支持透明通道的格式
 */
export function createImageCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  background?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(targetWidth))
  canvas.height = Math.max(1, Math.round(targetHeight))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Canvas → Blob（可指定格式与质量） */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败'))),
      type,
      quality
    )
  })
}
