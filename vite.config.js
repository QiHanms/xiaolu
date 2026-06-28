import { defineConfig } from 'vite'

export default defineConfig({
  base: '/xiaolu/',  // 👈 加上这一行
  server: {
    host: true,
    port: 3000
  },
  build: {
    target: 'esnext'
  }
})