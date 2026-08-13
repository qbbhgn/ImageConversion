<script setup lang="ts">
import { computed } from 'vue'
import type { ResizeSettings, SourceImageInfo } from '../types'

const props = defineProps<{ source: SourceImageInfo }>()
const settings = defineModel<ResizeSettings>({ required: true })

/** 是否为动画 GIF（响应式，随源图片切换而更新） */
const isAnimatedGif = computed(
  () => props.source.isGif && props.source.isAnimated
)

const scalePresets = [
  { label: '100%', factor: 1 },
  { label: '75%', factor: 0.75 },
  { label: '50%', factor: 0.5 },
  { label: '25%', factor: 0.25 },
  { label: '12.5%', factor: 0.125 },
]

function clamp(v: number): number {
  return Math.max(1, Math.min(8192, Math.round(Number.isFinite(v) ? v : 1)))
}

function setWidth(value: number): void {
  settings.value.width = clamp(value)
  if (settings.value.lockAspect && props.source.width > 0) {
    settings.value.height = clamp(
      (settings.value.width * props.source.height) / props.source.width
    )
  }
}

function setHeight(value: number): void {
  settings.value.height = clamp(value)
  if (settings.value.lockAspect && props.source.height > 0) {
    settings.value.width = clamp(
      (settings.value.height * props.source.width) / props.source.height
    )
  }
}

function applyScale(factor: number): void {
  settings.value.enabled = true
  settings.value.width = Math.max(1, Math.round(props.source.width * factor))
  settings.value.height = Math.max(1, Math.round(props.source.height * factor))
}

function toggleResize(checked: boolean): void {
  settings.value.enabled = checked
  if (checked) {
    settings.value.width = props.source.width
    settings.value.height = props.source.height
  }
}
</script>

<template>
  <div class="settings">
    <!-- 分辨率调整 -->
    <section class="settings__section">
      <div class="settings__row settings__row--between">
        <h3 class="settings__title">分辨率调整</h3>
        <label class="switch">
          <input
            type="checkbox"
            :checked="settings.enabled"
            @change="toggleResize(($event.target as HTMLInputElement).checked)"
          />
          <span class="switch__track"></span>
        </label>
      </div>

      <template v-if="settings.enabled">
        <div class="settings__presets">
          <button
            v-for="p in scalePresets"
            :key="p.label"
            type="button"
            class="chip"
            :class="{
              'chip--active':
                Math.abs(
                  settings.width - Math.round(source.width * p.factor)
                ) <= 1 &&
                Math.abs(
                  settings.height - Math.round(source.height * p.factor)
                ) <= 1,
            }"
            @click="applyScale(p.factor)"
          >
            {{ p.label }}
          </button>
          <button
            type="button"
            class="chip"
            :class="{
              'chip--active':
                !settings.enabled || settings.width === source.width,
            }"
            @click="toggleResize(false)"
          >
            原始
          </button>
        </div>

        <div class="settings__dims">
          <label class="field">
            <span class="field__label">宽 (px)</span>
            <input
              type="number"
              min="1"
              max="8192"
              class="field__input"
              :value="settings.width"
              @input="
                setWidth(Number(($event.target as HTMLInputElement).value))
              "
            />
          </label>
          <span class="settings__x">×</span>
          <label class="field">
            <span class="field__label">高 (px)</span>
            <input
              type="number"
              min="1"
              max="8192"
              class="field__input"
              :value="settings.height"
              @input="
                setHeight(Number(($event.target as HTMLInputElement).value))
              "
            />
          </label>
        </div>

        <label class="check">
          <input type="checkbox" v-model="settings.lockAspect" />
          <span>锁定宽高比（等比缩放，非裁剪）</span>
        </label>
      </template>
      <p v-else class="settings__hint">未启用缩放，将使用图片原始分辨率。</p>
    </section>

    <!-- GIF 处理 -->
    <section v-if="isAnimatedGif" class="settings__section">
      <h3 class="settings__title">GIF 处理方式</h3>
      <div class="settings__radios">
        <label class="radio">
          <input type="radio" value="animated" v-model="settings.gifMode" />
          <span class="radio__box"></span>
          <span>
            <span class="radio__label">保留动画</span>
            <span class="radio__desc">缩放时逐帧重编码动画</span>
          </span>
        </label>
        <label class="radio">
          <input type="radio" value="first-frame" v-model="settings.gifMode" />
          <span class="radio__box"></span>
          <span>
            <span class="radio__label">取第一帧</span>
            <span class="radio__desc">转为静态图，可生成像素 SVG</span>
          </span>
        </label>
      </div>
    </section>

    <!-- 输出格式与质量 -->
    <section class="settings__section">
      <h3 class="settings__title">图片输出格式</h3>
      <div class="settings__radios settings__radios--wrap">
        <label
          v-for="f in [
            { value: 'original', label: '原图' },
            { value: 'png', label: 'PNG' },
            { value: 'jpeg', label: 'JPEG' },
            { value: 'webp', label: 'WebP' },
          ]"
          :key="f.value"
          class="radio radio--card"
        >
          <input
            type="radio"
            :value="f.value"
            v-model="settings.outputFormat"
            :disabled="isAnimatedGif && settings.gifMode === 'animated'"
          />
          <span class="radio__label radio__label--card">{{ f.label }}</span>
        </label>
      </div>

      <label class="field">
        <span class="field__label">
          JPEG / WebP 质量：{{ Math.round(settings.quality * 100) }}%
        </span>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          class="slider"
          v-model.number="settings.quality"
        />
      </label>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.settings__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings__row {
  display: flex;
  align-items: center;
}

.settings__row--between {
  justify-content: space-between;
}

.settings__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-strong);
}

.settings__hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
}

.settings__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.chip--active {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.settings__dims {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.settings__x {
  padding-bottom: 10px;
  color: var(--text-dim);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.field__label {
  font-size: 12px;
  color: var(--text-dim);
}

.field__input {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  font-family: var(--mono);
  outline: none;
  transition: border-color 0.15s ease;
}

.field__input:focus {
  border-color: var(--accent);
}

.check,
.radio {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
}

.check input[type='checkbox'] {
  accent-color: var(--accent);
  width: 15px;
  height: 15px;
}

.settings__radios {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings__radios--wrap {
  flex-direction: row;
  flex-wrap: wrap;
}

.radio {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.radio input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.radio__box {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border: 2px solid var(--border);
  border-radius: 50%;
  position: relative;
  transition: border-color 0.15s ease;
}

.radio input:checked + .radio__box {
  border-color: var(--accent);
}

.radio input:checked + .radio__box::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--accent);
}

.radio input:disabled ~ * {
  opacity: 0.45;
  cursor: not-allowed;
}

.radio__label {
  font-size: 13px;
  font-weight: 600;
}

.radio__desc {
  display: block;
  font-size: 11px;
  color: var(--text-dim);
}

.radio--card {
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-soft);
  transition: all 0.15s ease;
}

.radio--card:hover {
  border-color: var(--accent);
}

.radio--card:has(input:checked) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-soft));
}

.radio--card .radio__box {
  display: none;
}

.radio__label--card {
  font-weight: 600;
}

.slider {
  width: 100%;
  accent-color: var(--accent);
  cursor: pointer;
}

.switch {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch__track {
  display: block;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  background: var(--border);
  position: relative;
  transition: background 0.2s ease;
}

.switch__track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.switch input:checked + .switch__track {
  background: var(--accent);
}

.switch input:checked + .switch__track::after {
  transform: translateX(18px);
}
</style>
