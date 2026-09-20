/** 静态图片输出格式 */
export type StaticOutputFormat = 'original' | 'png' | 'jpeg' | 'webp'

/** GIF 处理方式：保留动画 或 取第一帧转为静态图 */
export type GifMode = 'animated' | 'first-frame'

export interface ResizeSettings {
  /** 是否启用分辨率调整 */
  enabled: boolean
  /** 目标宽度 */
  width: number
  /** 目标高度 */
  height: number
  /** 锁定宽高比 */
  lockAspect: boolean
  /** 编码质量 (0.1 - 1)，仅对 JPEG/WebP 生效 */
  quality: number
  /** 静态图输出格式 */
  outputFormat: StaticOutputFormat
  /** GIF 处理方式 */
  gifMode: GifMode
}

export interface SourceImageInfo {
  fileName: string
  fileSize: number
  mime: string
  /** png | jpeg | webp | gif | bmp | svg */
  format: string
  width: number
  height: number
  isGif: boolean
  isAnimated: boolean
  frameCount: number
}

export interface OutputResult {
  key: string
  label: string
  hint: string
  mime: string
  extension: string
  content: string
  size: number
  fileName: string
}
