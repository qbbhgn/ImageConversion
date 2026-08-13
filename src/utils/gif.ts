import { parseGIF, decompressFrames } from 'gifuct-js'
import GIF from 'gif.js'
import workerURL from 'gif.js/dist/gif.worker.js?url'

export interface GifInfo {
  width: number
  height: number
  frameCount: number
  isAnimated: boolean
}

/** 解析 GIF 基本信息（不构建像素数据，速度快） */
export function getGifInfo(buffer: ArrayBuffer): GifInfo {
  const parsed = parseGIF(buffer)
  const frames = decompressFrames(parsed, false)
  return {
    width: parsed.lsd.width,
    height: parsed.lsd.height,
    frameCount: frames.length,
    isAnimated: frames.length > 1,
  }
}

/**
 * 缩放动画 GIF：
 * 用 gifuct-js 解码每一帧（含透明/恢复背景等 disposal 处理），
 * 逐帧绘制到画布并缩放到目标尺寸，再用 gif.js 重新编码为动画 GIF。
 */
export function resizeAnimatedGif(
  buffer: ArrayBuffer,
  targetWidth: number,
  targetHeight: number,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const parsed = parseGIF(buffer)
      const frames = decompressFrames(parsed, true)
      const srcW = parsed.lsd.width
      const srcH = parsed.lsd.height
      const outW = Math.max(1, Math.round(targetWidth))
      const outH = Math.max(1, Math.round(targetHeight))

      // 合成画布（原尺寸，用于处理帧间残留）
      const composite = document.createElement('canvas')
      composite.width = srcW
      composite.height = srcH
      const ctx = composite.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('无法创建 GIF 合成画布')

      // 缩放画布（目标尺寸）
      const scaled = document.createElement('canvas')
      scaled.width = outW
      scaled.height = outH
      const sctx = scaled.getContext('2d', { willReadFrequently: true })
      if (!sctx) throw new Error('无法创建 GIF 缩放画布')
      sctx.imageSmoothingEnabled = true
      sctx.imageSmoothingQuality = 'high'

      let prevCanvas: HTMLCanvasElement | null = null

      const encoder = new GIF({
        workers: 2,
        workerScript: workerURL,
        width: outW,
        height: outH,
        repeat: 0,
        quality: 10,
      })

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i]

        // 根据上一帧的 disposal 类型处理残留
        if (i > 0) {
          const prev = frames[i - 1]
          if (prev.disposalType === 2) {
            ctx.clearRect(0, 0, srcW, srcH)
          } else if (prev.disposalType === 3 && prevCanvas) {
            ctx.drawImage(prevCanvas, 0, 0)
          }
        }

        // 记录当前合成状态（供 disposal=3 恢复用）
        prevCanvas = document.createElement('canvas')
        prevCanvas.width = srcW
        prevCanvas.height = srcH
        const pctx = prevCanvas.getContext('2d')
        if (pctx) pctx.drawImage(composite, 0, 0)

        // 绘制当前帧像素到对应位置
        const patch = new Uint8ClampedArray(frame.patch)
        const imgData = new ImageData(
          patch,
          frame.dims.width,
          frame.dims.height
        )
        ctx.putImageData(imgData, frame.dims.left, frame.dims.top)

        // 缩放合成结果
        sctx.clearRect(0, 0, outW, outH)
        sctx.drawImage(composite, 0, 0, srcW, srcH, 0, 0, outW, outH)
        // gifuct 的 delay 单位是 1/100 秒，gif.js 期望毫秒
        encoder.addFrame(scaled, {
          delay: Math.max(1, Math.round(frame.delay * 10)),
          copy: true,
        })
      }

      encoder.on('progress', (percent: number) => onProgress?.(percent))
      encoder.on('finished', (blob: Blob) => resolve(blob))
      encoder.on('abort', () => reject(new Error('GIF 编码被中止')))
      encoder.render()
    } catch (err) {
      reject(err instanceof Error ? err : new Error('GIF 处理失败'))
    }
  })
}
