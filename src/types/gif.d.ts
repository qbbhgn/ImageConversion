/**
 * gif.js 的类型声明。
 * 不使用 @types/gif.js（其依赖 Node 的 events 模块，与纯浏览器项目不兼容）。
 */
declare module 'gif.js' {
  export interface GIFOptions {
    repeat?: number
    quality?: number
    workers?: number
    workerScript?: string
    background?: string
    width?: number | null
    height?: number | null
    transparent?: string | null
    dither?: string | boolean
    debug?: boolean
  }

  export interface AddFrameOptions {
    delay?: number
    copy?: boolean
    dispose?: number
  }

  export default class GIF {
    readonly running: boolean
    constructor(options?: GIFOptions)

    addFrame(
      image:
        | CanvasImageSource
        | HTMLCanvasElement
        | CanvasRenderingContext2D
        | ImageData,
      options?: AddFrameOptions
    ): void

    setOption<K extends keyof GIFOptions>(key: K, value: GIFOptions[K]): void
    setOptions(options: GIFOptions): void

    on(event: 'abort' | 'start', listener: () => void): this
    on(event: 'finished', listener: (blob: Blob) => void): this
    on(event: 'progress', listener: (percent: number) => void): this

    once(event: 'abort' | 'start', listener: () => void): this
    once(event: 'finished', listener: (blob: Blob) => void): this
    once(event: 'progress', listener: (percent: number) => void): this

    render(): void
    abort(): void
  }
}
