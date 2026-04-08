import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 默认 base 为相对路径 `./`：同一份 dist 既可挂根路径，也可挂 /web/，避免 script 写成 `/assets/...`
// 在子路径打开时仍指向正确目录，减少「整页白屏」（实为 JS/CSS 404）。
// 若必须用绝对路径：VITE_BASE=/web/ npm run build
function appBase() {
  const v = process.env.VITE_BASE?.trim()
  if (!v || v === '/') return './'
  const withSlash = v.startsWith('/') ? v : `/${v}`
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`
}

export default defineConfig({
  base: appBase(),
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://101.37.157.23:8080',
        changeOrigin: true,
      },
      '/donk-api': {
        target: 'http://101.37.157.23:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/donk-api/, '/api'),
      },
      '/uploads': {
        target: 'http://101.37.157.23:8080',
        changeOrigin: true,
      },
    },
  },
})

