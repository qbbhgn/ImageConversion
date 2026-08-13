/** 格式化字节大小 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** 截断超长文本，用于展示（复制/下载仍为完整内容） */
export function truncate(text: string, maxLength = 3000): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…（已截断，剩余 ${text.length - maxLength} 字符）`
}

/** 生成安全的 CSS 类名 */
export function safeClassName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '-')
  return /^[a-zA-Z_]/.test(clean) ? clean : `img-${clean}`
}
