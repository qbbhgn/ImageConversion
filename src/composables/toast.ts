import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

const state = reactive<{ items: ToastItem[] }>({ items: [] })
let nextId = 1

/** 轻量级全局消息提示 */
export function useToast() {
  function push(type: ToastType, message: string, duration = 3200): void {
    const id = nextId++
    state.items.push({ id, type, message })
    window.setTimeout(() => {
      const idx = state.items.findIndex((i) => i.id === id)
      if (idx >= 0) state.items.splice(idx, 1)
    }, duration)
  }

  return {
    items: state.items,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  }
}
