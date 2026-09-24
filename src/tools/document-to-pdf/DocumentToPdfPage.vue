<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Download,
  FileOutput,
  FileText,
  LoaderCircle,
  Upload,
} from '@lucide/vue'
import * as CFB from 'cfb'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import * as XLSX from 'xlsx'
import { useToast } from '../../shared/composables/toast'
import './document-to-pdf.css'

function installMapGetOrInsertComputedPolyfill(): void {
  const mapPrototype = Map.prototype as Map<unknown, unknown> & {
    getOrInsertComputed?: (
      key: unknown,
      callback: (key: unknown) => unknown
    ) => unknown
  }
  if (mapPrototype.getOrInsertComputed) return
  Object.defineProperty(mapPrototype, 'getOrInsertComputed', {
    configurable: true,
    value(
      this: Map<unknown, unknown>,
      key: unknown,
      callback: (key: unknown) => unknown
    ) {
      if (this.has(key)) return this.get(key)
      const value = callback(key)
      this.set(key, value)
      return value
    },
    writable: true,
  })
}

installMapGetOrInsertComputedPolyfill()

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

type SourceKind = 'doc' | 'docx' | 'xlsx' | 'pdf' | 'image' | 'html'
type TargetKind = 'pdf' | 'html' | 'csv' | 'png' | 'jpg' | 'webp'

interface SourceFile {
  file: File
  kind: SourceKind
  name: string
  html: string
  imageUrl?: string
  csv?: string
}

interface TargetOption {
  kind: TargetKind
  label: string
  hint: string
}

const toast = useToast()
const inputRef = ref<HTMLInputElement | null>(null)
const previewRef = ref<HTMLElement | null>(null)
const source = ref<SourceFile | null>(null)
const draggingOver = ref(false)
const converting = ref<TargetKind | null>(null)
const fontSize = ref(15)
const lineHeight = ref(1.65)

const acceptedExtensions = [
  '.docx',
  '.doc',
  '.docm',
  '.xlsx',
  '.xls',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.html',
  '.htm',
]
const optionsByKind: Record<SourceKind, TargetOption[]> = {
  doc: [
    { kind: 'pdf', label: 'PDF', hint: '将提取出的文字排版为 PDF' },
    { kind: 'html', label: 'HTML', hint: '导出提取出的文字' },
  ],
  docx: [
    { kind: 'pdf', label: 'PDF', hint: '保持文档排版导出为 PDF' },
    { kind: 'html', label: 'HTML', hint: '导出为网页文件' },
  ],
  xlsx: [
    { kind: 'pdf', label: 'PDF', hint: '将工作表排版为 PDF' },
    { kind: 'html', label: 'HTML', hint: '导出表格网页' },
    { kind: 'csv', label: 'CSV', hint: '导出当前工作簿中的表格数据' },
  ],
  pdf: [
    { kind: 'html', label: 'HTML', hint: '提取 PDF 文本为网页' },
    { kind: 'png', label: 'PNG', hint: '逐页导出 PDF 并打包为 ZIP' },
  ],
  image: [
    { kind: 'pdf', label: 'PDF', hint: '将图片放入 A4 PDF' },
    { kind: 'png', label: 'PNG', hint: '转换为 PNG 图片' },
    { kind: 'jpg', label: 'JPG', hint: '转换为 JPG 图片' },
    { kind: 'webp', label: 'WebP', hint: '转换为 WebP 图片' },
    { kind: 'html', label: 'HTML', hint: '导出为带图片的网页' },
  ],
  html: [
    { kind: 'pdf', label: 'PDF', hint: '将网页排版为 PDF' },
    { kind: 'png', label: 'PNG', hint: '截取网页内容为图片' },
  ],
}

const targetOptions = computed(() =>
  source.value ? optionsByKind[source.value.kind] : []
)
const sourceLabel = computed(() => {
  if (!source.value) return '尚未导入文件'
  return {
    doc: 'Word 文档（旧版）',
    docx: 'Word 文档',
    xlsx: 'Excel 工作簿',
    pdf: 'PDF 文档',
    image: '图片',
    html: 'HTML 网页',
  }[source.value.kind]
})

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function extensionOf(name: string): string {
  return name.slice(name.lastIndexOf('.')).toLowerCase()
}

function kindOf(name: string): SourceKind | null {
  const extension = extensionOf(name)
  if (extension === '.doc') return 'doc'
  if (extension === '.docx') return 'docx'
  if (extension === '.xlsx' || extension === '.xls') return 'xlsx'
  if (extension === '.pdf') return 'pdf'
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extension))
    return 'image'
  if (extension === '.html' || extension === '.htm') return 'html'
  return null
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function readPdf(file: File): Promise<string> {
  const document = await pdfjsLib.getDocument({
    data: await file.arrayBuffer(),
  }).promise
  const pages: string[] = []
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(`<h2>第 ${index} 页</h2><p>${escapeHtml(text)}</p>`)
  }
  return pages.join('') || '<p>这个 PDF 没有可提取的文本。</p>'
}

function streamBytes(entry: CFB.CFB$Entry | null): Uint8Array {
  if (!entry) throw new Error('legacy-doc-stream-missing')
  return Uint8Array.from(entry.content)
}

function readLegacyDocText(buffer: ArrayBuffer): string {
  const compoundFile = CFB.read(new Uint8Array(buffer), { type: 'array' })
  const wordDocument = streamBytes(CFB.find(compoundFile, 'WordDocument'))
  const wordView = new DataView(
    wordDocument.buffer,
    wordDocument.byteOffset,
    wordDocument.byteLength
  )
  if (wordView.getUint16(0, true) !== 0xa5ec)
    throw new Error('legacy-doc-invalid')

  const tableName =
    wordView.getUint16(0x0a, true) & 0x0200 ? '1Table' : '0Table'
  const table = streamBytes(CFB.find(compoundFile, tableName))
  const tableView = new DataView(
    table.buffer,
    table.byteOffset,
    table.byteLength
  )
  const bodyLength = wordView.getUint32(0x4c, true)
  let position = wordView.getUint32(0x1a2, true)

  while (tableView.getUint8(position) === 1) {
    const skipLength = tableView.getUint16(position + 1, true)
    position += 3 + skipLength
  }
  if (tableView.getUint8(position) !== 2)
    throw new Error('legacy-doc-piece-table-missing')

  const pieceTableSize = tableView.getUint32(position + 1, true)
  const pieceCount = (pieceTableSize - 4) / 12
  const pieceTableStart = position + 5
  if (!Number.isInteger(pieceCount) || pieceCount <= 0)
    throw new Error('legacy-doc-piece-table-invalid')

  const parts: string[] = []
  for (let index = 0; index < pieceCount; index += 1) {
    const cpStart = tableView.getUint32(pieceTableStart + index * 4, true)
    const cpEnd = Math.min(
      tableView.getUint32(pieceTableStart + (index + 1) * 4, true),
      bodyLength
    )
    if (cpStart >= bodyLength || cpEnd <= cpStart) continue

    const descriptorOffset =
      pieceTableStart + (pieceCount + 1) * 4 + index * 8 + 2
    const encodedOffset = tableView.getUint32(descriptorOffset, true)
    const isCompressed = (encodedOffset & 0x40000000) !== 0
    const fileOffset = isCompressed
      ? (encodedOffset & 0x3fffffff) / 2
      : encodedOffset
    const byteLength = (cpEnd - cpStart) * (isCompressed ? 1 : 2)
    const piece = wordDocument.subarray(fileOffset, fileOffset + byteLength)
    parts.push(
      new TextDecoder(isCompressed ? 'gb18030' : 'utf-16le').decode(piece)
    )
  }

  const text = parts
    .join('')
    .replace(/\x07/g, '\t')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text) throw new Error('legacy-doc-text-empty')
  return text
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>').replace(/\t/g, '&emsp;')}</p>`
    )
    .join('')
}

async function readFile(file: File): Promise<SourceFile> {
  const kind = kindOf(file.name)
  if (!kind) throw new Error('不支持的文件格式')
  if (kind === 'image')
    return {
      file,
      kind,
      name: file.name,
      html: '',
      imageUrl: URL.createObjectURL(file),
    }
  if (kind === 'docx') {
    const html = (
      await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    ).value
    return { file, kind, name: file.name, html }
  }
  if (kind === 'doc') {
    return {
      file,
      kind,
      name: file.name,
      html: readLegacyDocText(await file.arrayBuffer()),
    }
  }
  if (kind === 'xlsx') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheets = workbook.SheetNames.map(
      (name) =>
        `<h2>${escapeHtml(name)}</h2>${XLSX.utils.sheet_to_html(workbook.Sheets[name])}`
    ).join('')
    return {
      file,
      kind,
      name: file.name,
      html: sheets,
      csv: XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]),
    }
  }
  if (kind === 'pdf')
    return { file, kind, name: file.name, html: await readPdf(file) }
  return { file, kind, name: file.name, html: await file.text() }
}

async function loadFile(file: File): Promise<void> {
  try {
    if (source.value?.imageUrl) URL.revokeObjectURL(source.value.imageUrl)
    source.value = await readFile(file)
    toast.success(`已识别为${sourceLabel.value}：${file.name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('password') || message.includes('encrypted')) {
      toast.error('这个文件受密码保护，浏览器端无法读取')
    } else if (message === 'legacy-doc-text-empty') {
      toast.error('这个 .doc 无法提取文字，建议用 Word 另存为 .docx 后再上传')
    } else if (
      message.includes('zip') ||
      message.includes('central directory')
    ) {
      toast.error('这个文件不是有效的 .docx 文档，可能是旧版 .doc 或文件已损坏')
    } else {
      toast.error(
        file.name.toLowerCase().endsWith('.pdf')
          ? 'PDF 读取失败，请确认文件未损坏或未加密'
          : 'Word 文档读取失败，请确认文件未加密；旧版 .doc 建议另存为 .docx'
      )
    }
  }
}

function openPicker(): void {
  inputRef.value?.click()
}
function onInput(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) void loadFile(input.files[0])
  input.value = ''
}
function onDrop(event: DragEvent): void {
  event.preventDefault()
  draggingOver.value = false
  if (event.dataTransfer?.files?.[0]) void loadFile(event.dataTransfer.files[0])
}

async function canvasFromPreview(): Promise<HTMLCanvasElement> {
  if (!previewRef.value) throw new Error('没有可转换的预览')
  return html2canvas(previewRef.value, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  })
}

async function canvasesFromPdf(): Promise<HTMLCanvasElement[]> {
  if (!source.value) throw new Error('没有可转换的 PDF')
  const pdfDocument = await pdfjsLib.getDocument({
    data: await source.value.file.arrayBuffer(),
  }).promise
  const canvases: HTMLCanvasElement[] = []
  for (
    let pageNumber = 1;
    pageNumber <= pdfDocument.numPages;
    pageNumber += 1
  ) {
    const page = await pdfDocument.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) throw new Error('PDF canvas context unavailable')
    await page.render({
      canvas,
      canvasContext,
      viewport,
    }).promise
    canvases.push(canvas)
  }
  return canvases
}

async function exportPdf(): Promise<void> {
  const canvas = await canvasFromPreview()
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const width = 190
  const pageHeight = Math.floor((canvas.width * 277) / width)
  let offset = 0
  let pageIndex = 0
  while (offset < canvas.height) {
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = Math.min(pageHeight, canvas.height - offset)
    slice
      .getContext('2d')
      ?.drawImage(
        canvas,
        0,
        offset,
        canvas.width,
        slice.height,
        0,
        0,
        canvas.width,
        slice.height
      )
    if (pageIndex > 0) pdf.addPage()
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.94),
      'JPEG',
      10,
      10,
      width,
      (slice.height * width) / canvas.width
    )
    offset += slice.height
    pageIndex += 1
  }
  pdf.save(`${source.value?.name.replace(/\.[^.]+$/, '') || 'converted'}.pdf`)
}

async function exportImage(kind: 'png' | 'jpg' | 'webp'): Promise<void> {
  const mime = kind === 'jpg' ? 'image/jpeg' : `image/${kind}`
  const base = source.value?.name.replace(/\.[^.]+$/, '') || 'converted'
  if (source.value?.kind !== 'pdf') {
    const canvas = await canvasFromPreview()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, 0.94)
    )
    if (!blob) throw new Error('图片生成失败')
    download(blob, `${base}.${kind}`)
    return
  }

  const canvases = await canvasesFromPdf()
  const zip = new JSZip()
  for (const [index, canvas] of canvases.entries()) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, 0.94)
    )
    if (!blob) throw new Error(`第 ${index + 1} 页图片生成失败`)
    zip.file(`${base}_page-${index + 1}.${kind}`, blob)
  }
  const archive = await zip.generateAsync({ type: 'blob' })
  download(archive, `${base}.${kind}.zip`)
}

async function convert(target: TargetKind): Promise<void> {
  if (!source.value) return
  converting.value = target
  try {
    const base = source.value.name.replace(/\.[^.]+$/, '') || 'converted'
    if (target === 'pdf') await exportPdf()
    else if (target === 'png' || target === 'jpg' || target === 'webp')
      await exportImage(target)
    else if (target === 'csv' && source.value.csv)
      download(
        new Blob([source.value.csv], { type: 'text/csv;charset=utf-8' }),
        `${base}.csv`
      )
    else if (target === 'html') {
      const html =
        source.value.kind === 'html'
          ? await source.value.file.text()
          : source.value.kind === 'image'
            ? `<!doctype html><html><body><img src="${await fileToDataUrl(source.value.file)}" alt="${base}"></body></html>`
            : `<!doctype html><html><body>${source.value.html}</body></html>`
      download(
        new Blob([html], { type: 'text/html;charset=utf-8' }),
        `${base}.html`
      )
    }
    toast.success(`已导出 ${target.toUpperCase()}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    console.error('文件转换失败', error)
    toast.error(
      message.toLowerCase().includes('password') ||
        message.toLowerCase().includes('encrypted')
        ? '这个 PDF 受密码保护，浏览器端无法转换'
        : `转换失败${message ? `：${message}` : '，请重试或更换文件'}`
    )
  } finally {
    converting.value = null
  }
}
</script>

<template>
  <main class="document-tool">
    <header class="document-tool__header">
      <div class="document-tool__brand">
        <span class="document-tool__icon"><FileOutput :size="28" /></span>
        <div>
          <h1>文件格式转换</h1>
          <p>上传 Word、Excel、PDF、图片或 HTML，选择可用的目标格式</p>
        </div>
      </div>
    </header>
    <section class="document-layout">
      <aside class="document-controls">
        <div
          class="document-dropzone"
          :class="{ 'is-dragging': draggingOver }"
          @click="openPicker"
          @dragover.prevent="draggingOver = true"
          @dragleave="draggingOver = false"
          @drop="onDrop"
        >
          <Upload :size="24" />
          <strong>{{ source ? '替换文件' : '上传文件' }}</strong>
          <span>Word / Excel / PDF / 图片 / HTML</span>
          <input
            ref="inputRef"
            type="file"
            :accept="acceptedExtensions.join(',')"
            hidden
            @change="onInput"
          />
        </div>
        <div v-if="source" class="document-file">
          <FileText :size="18" />
          <span>{{ source.name }}</span>
          <small>{{ sourceLabel }}</small>
        </div>
        <div class="document-targets">
          <div class="document-section-title">转换为</div>
          <button
            v-for="option in targetOptions"
            :key="option.kind"
            type="button"
            class="document-target"
            :disabled="!!converting"
            @click="convert(option.kind)"
          >
            <LoaderCircle
              v-if="converting === option.kind"
              class="document-spin"
              :size="18"
            />
            <Download v-else :size="18" />
            <span>
              <strong>{{ option.label }}</strong>
              <small>{{ option.hint }}</small>
            </span>
          </button>
          <p v-if="!source" class="document-note">
            上传文件后，这里会根据源格式显示可用的转换目标。
          </p>
        </div>
        <label class="document-field">
          <span>
            预览字号
            <b>{{ fontSize }}px</b>
          </span>
          <input
            v-model.number="fontSize"
            type="range"
            min="12"
            max="24"
            step="1"
          />
        </label>
        <label class="document-field">
          <span>
            预览行距
            <b>{{ lineHeight }}</b>
          </span>
          <input
            v-model.number="lineHeight"
            type="range"
            min="1.2"
            max="2.4"
            step="0.05"
          />
        </label>
      </aside>
      <section class="document-preview-area">
        <div class="document-preview-meta">
          <span>内容预览</span>
          <span>{{ source ? sourceLabel : '等待上传' }}</span>
        </div>
        <article
          ref="previewRef"
          class="document-paper"
          :style="{ fontSize: `${fontSize}px`, lineHeight }"
        >
          <img
            v-if="source?.imageUrl"
            class="document-image"
            :src="source.imageUrl"
            alt="待转换图片"
          />
          <div v-else-if="source" v-html="source.html" />
          <div v-else class="document-empty">上传文件后将在这里预览内容</div>
        </article>
      </section>
    </section>
  </main>
</template>
