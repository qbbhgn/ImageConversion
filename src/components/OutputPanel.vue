<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OutputResult } from '../types'
import { formatBytes, truncate } from '../utils/format'
import { copyText, downloadText } from '../utils/download'
import { useToast } from '../composables/toast'

const props = defineProps<{
  results: OutputResult[]
  generating: boolean
  progress: number
}>()

const toast = useToast()

const activeKey = ref('')
const expanded = ref(false)

const active = computed<OutputResult | null>(
  () => props.results.find((r) => r.key === activeKey.value) ?? null
)

watch(
  () => props.results,
  (list) => {
    activeKey.value = list[0]?.key ?? ''
    expanded.value = false
  },
  { immediate: true }
)

const MAX_CHARS = 4000

const shown = computed(() =>
  active.value
    ? truncate(active.value.content, expanded.value ? Infinity : MAX_CHARS)
    : ''
)

function toggleExpand(): void {
  if (active.value && active.value.content.length > MAX_CHARS) {
    expanded.value = !expanded.value
  }
}

async function onCopy(): Promise<void> {
  if (!active.value) return
  const ok = await copyText(active.value.content)
  toast[ok ? 'success' : 'error'](
    ok ? `已复制「${active.value.label}」到剪贴板` : '复制失败，请手动选择复制'
  )
}

function onDownload(): void {
  if (!active.value) return
  downloadText(active.value.content, active.value.fileName, active.value.mime)
  toast.success(`已下载 ${active.value.fileName}`)
}
</script>

<template>
  <section class="output">
    <div class="output__head">
      <h2 class="output__title">输出结果</h2>
      <span v-if="results.length" class="output__count">
        {{ results.length }} 种格式
      </span>
    </div>

    <!-- 生成中 -->
    <div v-if="generating" class="output__busy">
      <div class="progress">
        <div class="progress__bar" :style="{ width: `${progress}%` }"></div>
      </div>
      <p class="output__busy-text">
        {{ progress > 0 ? `正在生成… ${Math.round(progress)}%` : '正在生成…' }}
      </p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!results.length" class="output__empty">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      <p>
        上传图片并点击「生成代码」，这里会显示 Base64 / SVG / HTML / CSS 等结果
      </p>
    </div>

    <!-- 结果 -->
    <template v-else>
      <div class="tabs">
        <button
          v-for="r in results"
          :key="r.key"
          type="button"
          class="tab"
          :class="{ 'tab--active': r.key === activeKey }"
          @click="activeKey = r.key"
        >
          <span class="tab__label">{{ r.label }}</span>
          <span class="tab__size">{{ formatBytes(r.size) }}</span>
        </button>
      </div>

      <div v-if="active" class="codebox">
        <div class="codebox__toolbar">
          <span class="codebox__hint">{{ active.hint }}</span>
          <div class="codebox__actions">
            <button
              v-if="active.content.length > MAX_CHARS"
              type="button"
              class="btn btn--ghost"
              @click="toggleExpand"
            >
              {{ expanded ? '收起' : '展开完整' }}
            </button>
            <button type="button" class="btn btn--ghost" @click="onDownload">
              下载 {{ active.fileName }}
            </button>
            <button type="button" class="btn btn--primary" @click="onCopy">
              复制
            </button>
          </div>
        </div>
        <pre class="codebox__pre"><code>{{ shown }}</code></pre>
        <div class="codebox__foot">
          <span>大小：{{ formatBytes(active.size) }}</span>
          <span>MIME：{{ active.mime }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.output {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
  padding: 18px;
}

.output__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.output__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-strong);
}

.output__count {
  font-size: 12px;
  color: var(--text-dim);
  background: var(--chip-bg);
  padding: 3px 10px;
  border-radius: 999px;
}

.output__busy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-soft);
  overflow: hidden;
}

.progress__bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width 0.2s ease;
}

.output__busy-text {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
}

.output__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 20px;
  color: var(--text-dim);
  text-align: center;
}

.output__empty svg {
  width: 34px;
  height: 34px;
  opacity: 0.6;
}

.output__empty p {
  margin: 0;
  font-size: 13px;
  max-width: 420px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text-dim);
  border-radius: 10px;
  padding: 7px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab:hover {
  border-color: var(--accent);
  color: var(--text);
}

.tab--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--bg-soft));
  color: var(--text-strong);
}

.tab__label {
  font-size: 13px;
  font-weight: 600;
}

.tab__size {
  font-size: 11px;
  font-family: var(--mono);
  opacity: 0.8;
}

.codebox {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--code-bg);
}

.codebox__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--panel-2);
}

.codebox__hint {
  font-size: 12px;
  color: var(--text-dim);
}

.codebox__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.codebox__pre {
  margin: 0;
  padding: 14px;
  overflow: auto;
  max-height: 360px;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-all;
}

.codebox__foot {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-dim);
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn--primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
}

.btn--primary:hover {
  filter: brightness(1.1);
}

.btn--ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.btn--ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
