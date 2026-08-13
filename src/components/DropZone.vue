<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ file: [file: File] }>()

const dragging = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
let dragDepth = 0

const acceptTypes =
  'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml,image/x-icon'

function openPicker(): void {
  inputRef.value?.click()
}

function onInputChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('file', file)
  input.value = ''
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
}

function onDragEnter(event: DragEvent): void {
  event.preventDefault()
  dragDepth += 1
  dragging.value = true
}

function onDragLeave(event: DragEvent): void {
  event.preventDefault()
  dragDepth -= 1
  if (dragDepth <= 0) {
    dragDepth = 0
    dragging.value = false
  }
}

function onDrop(event: DragEvent): void {
  event.preventDefault()
  dragDepth = 0
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) emit('file', file)
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'dropzone--dragging': dragging }"
    @click="openPicker"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <input
      ref="inputRef"
      type="file"
      :accept="acceptTypes"
      class="dropzone__input"
      @change="onInputChange"
    />
    <div class="dropzone__icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
    <p class="dropzone__title">
      <span class="dropzone__accent">拖拽图片到这里</span>
      <span>或</span>
      <span class="dropzone__action">点击选择文件</span>
    </p>
    <p class="dropzone__sub">
      支持 PNG / JPEG / WebP / GIF / BMP / SVG · 支持动画 GIF
    </p>
  </div>
</template>

<style scoped>
.dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 34px 20px;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  background: var(--bg-soft);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.15s ease;
  text-align: center;
}

.dropzone:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg-soft));
}

.dropzone--dragging {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-soft));
  transform: scale(1.01);
}

.dropzone__input {
  display: none;
}

.dropzone__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.dropzone__icon svg {
  width: 28px;
  height: 28px;
}

.dropzone__title {
  margin: 4px 0 0;
  font-size: 15px;
  color: var(--text);
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.dropzone__accent {
  color: var(--text-strong);
  font-weight: 600;
}

.dropzone__action {
  color: var(--accent);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dropzone__sub {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
}
</style>
