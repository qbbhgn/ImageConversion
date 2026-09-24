import type { Component } from 'vue'
import { FileText, Film, Image } from '@lucide/vue'

export interface ToolDefinition {
  id: string
  path: string
  name: string
  category: string
  icon: Component
  component: () => Promise<{ default: Component }>
}

export const tools: ToolDefinition[] = [
  {
    id: 'document-to-pdf',
    path: '/tools/document-to-pdf',
    name: '文档转 PDF',
    category: '文档工具',
    icon: FileText,
    component: () => import('./document-to-pdf/DocumentToPdfPage.vue'),
  },
  {
    id: 'image-converter',
    path: '/tools/image-converter',
    name: '图片转换',
    category: '图片工具',
    icon: Image,
    component: () => import('./image-converter/ImageConverterPage.vue'),
  },
  {
    id: 'sprite-tester',
    path: '/tools/sprite-tester',
    name: '序列帧测试',
    category: '图片工具',
    icon: Film,
    component: () => import('./sprite-tester/SpriteTesterPage.vue'),
  },
]
