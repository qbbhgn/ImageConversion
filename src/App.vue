<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { OutputResult, ResizeSettings, SourceImageInfo } from './types'
import {
  createImageCanvas,
  fileToArrayBuffer,
  fileToDataUrl,
  loadImage,
} from './utils/image'
import { getGifInfo } from './utils/gif'
import { buildOutputs } from './utils/convert'
import { useToast } from './composables/toast'
import DropZone from './components/DropZone.vue'
import ImagePreview from './components/ImagePreview.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import ToastHost from './components/ToastHost.vue'

const toast = useToast()

const ACCEPTED = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/x-icon',
]

const source = ref<SourceImageInfo | null>(null)
const dataUrl = ref('')
const buffer = ref<ArrayBuffer | null>(null)

const settings = reactive<ResizeSettings>({
  enabled: false,
  width: 0,
  height: 0,
  lockAspect: true,
  quality: 0.9,
  outputFormat: 'original',
  gifMode: 'animated',
})

const results = ref<OutputResult[]>([])
const generating = ref(false)
const progress = ref(0)
const resizedUrl = ref('')

function detectFormat(mime: string, fileName: string): string {
  if (mime === 'image/jpeg') return 'jpeg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/bmp') return 'bmp'
  if (mime === 'image/svg+xml') return 'svg'
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'png'
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg'
  if (ext === 'webp') return 'webp'
  if (ext === 'gif') return 'gif'
  if (ext === 'bmp') return 'bmp'
  if (ext === 'svg') return 'svg'
  return 'png'
}

async function handleFile(file: File): Promise<void> {
  if (!ACCEPTED.includes(file.type)) {
    toast.error(`不支持的格式：${file.type || file.name}`)
    return
  }
  try {
    const url = await fileToDataUrl(file)
    const buf = await fileToArrayBuffer(file)
    const img = await loadImage(url)
    const format = detectFormat(file.type, file.name)
    const isGif = format === 'gif'
    let isAnimated = false
    let frameCount = 1
    if (isGif) {
      const info = getGifInfo(buf)
      isAnimated = info.isAnimated
      frameCount = info.frameCount
    }

    source.value = {
      fileName: file.name,
      fileSize: file.size,
      mime: file.type,
      format,
      width: img.naturalWidth,
      height: img.naturalHeight,
      isGif,
      isAnimated,
      frameCount,
    }
    dataUrl.value = url
    buffer.value = buf
    settings.enabled = false
    settings.width = img.naturalWidth
    settings.height = img.naturalHeight
    settings.gifMode = 'animated'
    settings.outputFormat = 'original'
    results.value = []
    resizedUrl.value = ''
    progress.value = 0
    toast.success(`已加载：${file.name}`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '文件加载失败')
  }
}

// 缩放预览（防抖）
let previewTimer = 0
watch(
  () => [
    settings.enabled,
    settings.width,
    settings.height,
    source.value?.width,
    source.value?.height,
  ],
  () => {
    window.clearTimeout(previewTimer)
    if (!source.value || !settings.enabled || !dataUrl.value) {
      resizedUrl.value = ''
      return
    }
    previewTimer = window.setTimeout(async () => {
      try {
        const img = await loadImage(dataUrl.value)
        const canvas = createImageCanvas(img, settings.width, settings.height)
        resizedUrl.value = canvas.toDataURL('image/png')
      } catch {
        resizedUrl.value = ''
      }
    }, 200)
  }
)

async function generate(): Promise<void> {
  if (!source.value || !buffer.value || !dataUrl.value) {
    toast.info('请先选择一张图片')
    return
  }
  generating.value = true
  progress.value = 0
  results.value = []
  try {
    const list = await buildOutputs({
      source: source.value,
      buffer: buffer.value,
      dataUrl: dataUrl.value,
      settings,
      onProgress: (p) => {
        progress.value = p
      },
    })
    results.value = list
    toast.success(`已生成 ${list.length} 种代码格式`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '生成失败')
  } finally {
    generating.value = false
    progress.value = 0
  }
}

function resetAll(): void {
  source.value = null
  dataUrl.value = ''
  buffer.value = null
  results.value = []
  resizedUrl.value = ''
  progress.value = 0
}
</script>

<template>
  <div class="app">
    <header class="app__header">
      <div class="app__brand">
        <div class="app__logo">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <div>
          <h1 class="app__title">图片转换工具箱</h1>
          <p class="app__subtitle">
            图片 / GIF → Base64 · SVG · HTML · CSS，支持分辨率调整
          </p>
        </div>
      </div>
      <button
        v-if="source"
        type="button"
        class="btn btn--ghost"
        @click="resetAll"
      >
        重新选择
      </button>
    </header>

    <main class="app__main">
      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title">1. 选择图片</h2>
        </div>
        <DropZone @file="handleFile" />
      </section>

      <template v-if="source">
        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">2. 预览</h2>
          </div>
          <ImagePreview
            :source="source"
            :data-url="dataUrl"
            :resized-url="resizedUrl"
            :target-width="settings.width"
            :target-height="settings.height"
            :resizing="settings.enabled"
          />
        </section>

        <section class="panel">
          <div class="panel__head">
            <h2 class="panel__title">3. 设置</h2>
          </div>
          <SettingsPanel v-model="settings" :source="source" />
          <button
            type="button"
            class="btn btn--primary btn--block btn--generate"
            :disabled="generating"
            @click="generate"
          >
            {{ generating ? '正在生成…' : '⚡ 生成代码' }}
          </button>
        </section>
      </template>

      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title">4. 结果</h2>
        </div>
        <OutputPanel
          :results="results"
          :generating="generating"
          :progress="progress"
        />
      </section>
    </main>

    <footer class="app__footer">
      <span>纯前端本地处理，图片不会上传到服务器</span>
      <span>Vue 3 · TypeScript · Vite</span>
    </footer>

    <ToastHost />
  </div>
</template>
