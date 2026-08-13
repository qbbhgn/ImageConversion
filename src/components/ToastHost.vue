<script setup lang="ts">
import { useToast } from '../composables/toast'

const { items } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-host">
      <TransitionGroup name="toast">
        <div
          v-for="item in items"
          :key="item.id"
          class="toast"
          :class="`toast--${item.type}`"
        >
          <span class="toast__icon">
            {{
              item.type === 'success' ? '✓' : item.type === 'error' ? '✕' : 'ℹ'
            }}
          </span>
          <span class="toast__msg">{{ item.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  max-width: min(360px, calc(100vw - 36px));
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  font-size: 13px;
  color: var(--text);
  pointer-events: auto;
}

.toast__icon {
  font-weight: 700;
  line-height: 1.2;
}

.toast--success .toast__icon {
  color: var(--success);
}

.toast--error .toast__icon {
  color: var(--danger);
}

.toast--info .toast__icon {
  color: var(--accent);
}

.toast__msg {
  word-break: break-word;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
