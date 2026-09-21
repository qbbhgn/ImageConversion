<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  Film,
  GripVertical,
  Pause,
  Play,
  RotateCcw,
  Upload,
} from '@lucide/vue'
import { useToast } from '../../shared/composables/toast'

interface SpriteSource {
  name: string
  size: number
  width: number
  height: number
  url: string
}

type PlayMode = 'loop' | 'once' | 'ping-pong'

const acceptedTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/x-icon',
]

const toast = useToast()
const inputRef = ref<HTMLInputElement | null>(null)
const source = ref<SpriteSource | null>(null)
const rows = ref(1)
const columns = ref(4)
const frameLimit = ref(4)
const fps = ref(8)
const playMode = ref<PlayMode>('loop')
const playing = ref(false)
const currentIndex = ref(0)
const direction = ref(1)
const pixelated = ref(false)
const draggingOver = ref(false)
const draggedFrame = ref<number | null>(null)
const frameOrder = ref<number[]>([0, 1, 2, 3])
let timer = 0
let previousCellCount = 4

const cellCount = computed(() => rows.value * columns.value)
const activeFrames = computed(() => frameOrder.value.slice(0, frameLimit.value))
const currentCell = computed(() => activeFrames.value[currentIndex.value] ?? 0)
const frameWidth = computed(() =>
  source.value ? source.value.width / columns.value : 0
)
const frameHeight = computed(() =>
  source.value ? source.value.height / rows.value : 0
)
const frameAspect = computed(() =>
  source.value
    ? `${source.value.width * rows.value} / ${source.value.height * columns.value}`
    : '1 / 1'
)
const intervalLabel = computed(() => Math.round(1000 / fps.value))

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value || min)))
}

function cellStyle(cell: number): Record<string, string> {
  if (!source.value) return {}
  const column = cell % columns.value
  const row = Math.floor(cell / columns.value)
  return {
    backgroundImage: `url("${source.value.url}")`,
    backgroundSize: `${columns.value * 100}% ${rows.value * 100}%`,
    backgroundPosition: `${columns.value === 1 ? 0 : (column / (columns.value - 1)) * 100}% ${rows.value === 1 ? 0 : (row / (rows.value - 1)) * 100}%`,
    aspectRatio: frameAspect.value,
  }
}

function rebuildOrder(): void {
  const previous = frameOrder.value.filter((cell) => cell < cellCount.value)
  const known = new Set(previous)
  for (let cell = 0; cell < cellCount.value; cell += 1) {
    if (!known.has(cell)) previous.push(cell)
  }
  frameOrder.value = previous
  frameLimit.value = clampInteger(frameLimit.value, 1, cellCount.value)
  currentIndex.value = Math.min(currentIndex.value, frameLimit.value - 1)
}

function resetOrder(): void {
  frameOrder.value = Array.from(
    { length: cellCount.value },
    (_, index) => index
  )
  currentIndex.value = 0
}

function advance(step: number): void {
  const count = activeFrames.value.length
  if (count <= 1) return

  if (playMode.value === 'ping-pong') {
    let next = currentIndex.value + step * direction.value
    if (next >= count || next < 0) {
      direction.value *= -1
      next = currentIndex.value + step * direction.value
    }
    currentIndex.value = clampInteger(next, 0, count - 1)
    return
  }

  const next = currentIndex.value + step
  if (next >= count && playMode.value === 'once') {
    currentIndex.value = count - 1
    playing.value = false
    return
  }
  currentIndex.value = (next + count) % count
}

function restartTimer(): void {
  window.clearInterval(timer)
  if (playing.value) {
    timer = window.setInterval(() => advance(1), 1000 / fps.value)
  }
}

function togglePlayback(): void {
  if (!source.value) return
  if (
    playMode.value === 'once' &&
    currentIndex.value === frameLimit.value - 1
  ) {
    currentIndex.value = 0
  }
  direction.value = 1
  playing.value = !playing.value
}

function resetPlayback(): void {
  playing.value = false
  currentIndex.value = 0
  direction.value = 1
}

function previousFrame(): void {
  playing.value = false
  advance(-1)
}

function nextFrame(): void {
  playing.value = false
  advance(1)
}

function updateGrid(): void {
  rows.value = clampInteger(rows.value, 1, 32)
  columns.value = clampInteger(columns.value, 1, 32)
  const wasUsingAllFrames = frameLimit.value === previousCellCount
  if (wasUsingAllFrames) frameLimit.value = cellCount.value
  rebuildOrder()
  previousCellCount = cellCount.value
}

function updateFrameLimit(): void {
  frameLimit.value = clampInteger(frameLimit.value, 1, cellCount.value)
  currentIndex.value = Math.min(currentIndex.value, frameLimit.value - 1)
}

function updateFps(): void {
  fps.value = clampInteger(fps.value, 1, 60)
}

function openPicker(): void {
  inputRef.value?.click()
}

function loadFile(file: File): void {
  if (!acceptedTypes.includes(file.type)) {
    toast.error(`不支持的格式：${file.type || file.name}`)
    return
  }

  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    if (source.value) URL.revokeObjectURL(source.value.url)
    source.value = {
      name: file.name,
      size: file.size,
      width: image.naturalWidth,
      height: image.naturalHeight,
      url,
    }
    resetPlayback()
    rebuildOrder()
    toast.success(`已加载：${file.name}`)
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    toast.error('图片加载失败')
  }
  image.src = url
}

function onInput(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) loadFile(file)
  input.value = ''
}

function onDrop(event: DragEvent): void {
  event.preventDefault()
  draggingOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

function onFrameDrop(targetIndex: number): void {
  if (draggedFrame.value === null || draggedFrame.value === targetIndex) return
  const next = [...frameOrder.value]
  const [moved] = next.splice(draggedFrame.value, 1)
  if (moved === undefined) return
  next.splice(targetIndex, 0, moved)
  frameOrder.value = next
  draggedFrame.value = null
}

watch([playing, fps], restartTimer)
watch(playMode, () => {
  direction.value = 1
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  if (source.value) URL.revokeObjectURL(source.value.url)
})
</script>

<template>
  <div class="sprite-tool">
    <header class="sprite-header">
      <div class="sprite-header__brand">
        <span class="sprite-header__icon"><Film :size="28" /></span>
        <div>
          <h1>序列帧测试</h1>
          <p>分割 Sprite Sheet，调整顺序并实时预览动画</p>
        </div>
      </div>
      <button
        v-if="source"
        type="button"
        class="sprite-replace-dropzone"
        :class="{ 'sprite-replace-dropzone--dragging': draggingOver }"
        @click="openPicker"
        @dragenter.prevent="draggingOver = true"
        @dragover.prevent
        @dragleave.prevent="draggingOver = false"
        @drop="onDrop"
      >
        <Upload :size="16" />
        <span>拖入或点击换图</span>
      </button>
    </header>

    <input
      ref="inputRef"
      type="file"
      accept="image/*,.svg"
      class="sprite-file-input"
      @change="onInput"
    />

    <main class="sprite-main">
      <section v-if="!source" class="sprite-upload">
        <button
          type="button"
          class="sprite-upload__target"
          :class="{ 'sprite-upload__target--dragging': draggingOver }"
          @click="openPicker"
          @dragenter.prevent="draggingOver = true"
          @dragover.prevent
          @dragleave.prevent="draggingOver = false"
          @drop="onDrop"
        >
          <Upload :size="30" />
          <strong>拖入序列帧图片，或点击选择</strong>
          <span>PNG / JPEG / WebP / GIF / BMP / SVG</span>
        </button>
      </section>

      <template v-else>
        <aside class="sprite-settings">
          <section class="sprite-section">
            <div class="sprite-section__heading">
              <h2>分割设置</h2>
              <span>{{ cellCount }} 个网格</span>
            </div>
            <div class="sprite-field-grid">
              <label class="sprite-field">
                <span>行数</span>
                <input
                  v-model.number="rows"
                  type="number"
                  min="1"
                  max="32"
                  @change="updateGrid"
                />
              </label>
              <label class="sprite-field">
                <span>列数</span>
                <input
                  v-model.number="columns"
                  type="number"
                  min="1"
                  max="32"
                  @change="updateGrid"
                />
              </label>
              <label class="sprite-field sprite-field--wide">
                <span>播放帧数</span>
                <input
                  v-model.number="frameLimit"
                  type="number"
                  min="1"
                  :max="cellCount"
                  @change="updateFrameLimit"
                />
              </label>
            </div>
            <div class="sprite-metrics">
              <span>原图 {{ source.width }} × {{ source.height }}</span>
              <span>
                单帧 {{ frameWidth.toFixed(1) }} × {{ frameHeight.toFixed(1) }}
              </span>
            </div>
          </section>

          <section class="sprite-section">
            <div class="sprite-section__heading"><h2>播放设置</h2></div>
            <label class="sprite-field sprite-field--range">
              <span>
                速度
                <b>{{ fps }} FPS</b>
              </span>
              <input
                v-model.number="fps"
                type="range"
                min="1"
                max="60"
                @input="updateFps"
              />
              <small>每帧约 {{ intervalLabel }} ms</small>
            </label>
            <div class="sprite-field">
              <span>播放方式</span>
              <div class="sprite-segments">
                <button
                  type="button"
                  :class="{ active: playMode === 'loop' }"
                  @click="playMode = 'loop'"
                >
                  循环
                </button>
                <button
                  type="button"
                  :class="{ active: playMode === 'once' }"
                  @click="playMode = 'once'"
                >
                  单次
                </button>
                <button
                  type="button"
                  :class="{ active: playMode === 'ping-pong' }"
                  @click="playMode = 'ping-pong'"
                >
                  往返
                </button>
              </div>
            </div>
            <label class="sprite-toggle">
              <input v-model="pixelated" type="checkbox" />
              <span>像素化渲染</span>
            </label>
          </section>

          <section class="sprite-file">
            <div>
              <strong>{{ source.name }}</strong>
              <span>{{ (source.size / 1024).toFixed(1) }} KB</span>
            </div>
            <button type="button" title="重新载入播放" @click="resetPlayback">
              <RotateCcw :size="17" />
            </button>
          </section>
        </aside>

        <section class="sprite-workspace">
          <div
            class="sprite-stage"
            :class="{ 'sprite-stage--pixelated': pixelated }"
          >
            <div class="sprite-stage__frame" :style="cellStyle(currentCell)" />
          </div>

          <div class="sprite-controls">
            <button type="button" title="上一帧" @click="previousFrame">
              <ChevronLeft :size="22" />
            </button>
            <button
              type="button"
              class="sprite-controls__play"
              :title="playing ? '暂停' : '播放'"
              @click="togglePlayback"
            >
              <Pause v-if="playing" :size="25" />
              <Play v-else :size="25" />
            </button>
            <button type="button" title="下一帧" @click="nextFrame">
              <ChevronRight :size="22" />
            </button>
            <span>
              第 {{ currentIndex + 1 }} / {{ activeFrames.length }} 帧
            </span>
          </div>

          <section class="sprite-frames">
            <div class="sprite-section__heading">
              <h2>播放顺序</h2>
              <button
                type="button"
                class="sprite-text-button"
                @click="resetOrder"
              >
                恢复默认
              </button>
            </div>
            <div class="sprite-frame-list">
              <button
                v-for="(cell, index) in activeFrames"
                :key="cell"
                type="button"
                class="sprite-frame"
                :class="{ 'sprite-frame--active': index === currentIndex }"
                draggable="true"
                @click="currentIndex = index"
                @dragstart="draggedFrame = index"
                @dragover.prevent
                @drop="onFrameDrop(index)"
              >
                <span class="sprite-frame__number">{{ cell + 1 }}</span>
                <span class="sprite-frame__image" :style="cellStyle(cell)" />
                <GripVertical :size="15" />
              </button>
            </div>
          </section>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped src="./sprite-tester.css"></style>
