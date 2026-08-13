<script setup lang="ts">
import type { SourceImageInfo } from '../types'
import { formatBytes } from '../utils/format'

defineProps<{
  source: SourceImageInfo
  dataUrl: string
  resizedUrl: string
  targetWidth: number
  targetHeight: number
  resizing: boolean
}>()

function formatName(format: string): string {
  const map: Record<string, string> = {
    png: 'PNG',
    jpeg: 'JPEG',
    webp: 'WebP',
    gif: 'GIF',
    bmp: 'BMP',
    svg: 'SVG',
  }
  return map[format] ?? format.toUpperCase()
}
</script>

<template>
  <div class="preview">
    <div class="preview__card">
      <div class="preview__head">
        <span class="preview__badge">原图</span>
        <span class="preview__meta">
          {{ source.width }} × {{ source.height }} ·
          {{ formatBytes(source.fileSize) }}
        </span>
      </div>
      <div class="preview__stage">
        <img :src="dataUrl" :alt="source.fileName" class="preview__img" />
      </div>
      <div class="preview__foot">
        <span>{{ formatName(source.format) }}</span>
        <span v-if="source.isGif && source.isAnimated">
          {{ source.frameCount }} 帧 · 动画
        </span>
        <span v-else>{{ source.frameCount }} 帧</span>
      </div>
    </div>

    <div
      class="preview__card"
      :class="{ 'preview__card--disabled': !resizing }"
    >
      <div class="preview__head">
        <span class="preview__badge preview__badge--accent">调整后</span>
        <span class="preview__meta">
          {{ resizing ? `${targetWidth} × ${targetHeight}` : '未启用缩放' }}
        </span>
      </div>
      <div class="preview__stage">
        <img
          v-if="resizing && resizedUrl"
          :src="resizedUrl"
          alt="调整后预览"
          class="preview__img"
        />
        <div v-else class="preview__placeholder">
          <span>开启「分辨率调整」后在此预览</span>
        </div>
      </div>
      <div class="preview__foot">
        <span v-if="resizing">等比放大 / 缩小（非裁剪）</span>
        <span v-else>使用原始分辨率</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.preview__card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
  padding: 12px;
  min-width: 0;
}

.preview__card--disabled {
  opacity: 0.75;
}

.preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.preview__badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--chip-bg);
  color: var(--text-dim);
}

.preview__badge--accent {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
}

.preview__meta {
  font-size: 12px;
  color: var(--text-dim);
}

.preview__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  max-height: 260px;
  padding: 8px;
  background: var(--checker);
  border-radius: 10px;
  overflow: hidden;
}

.preview__img {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

.preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: var(--text-dim);
  font-size: 13px;
}

.preview__foot {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--text-dim);
}
</style>
