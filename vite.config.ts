import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 使用相对路径，确保部署到 GitHub Pages 子路径（/<仓库名>/）下资源也能正常加载
  base: './',
})
