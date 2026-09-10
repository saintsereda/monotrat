/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { type Plugin, defineConfig } from 'vite'

const CSP = [
  "default-src 'self'",
  "connect-src 'self' https://api.monobank.ua",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/** GitHub Pages can't send response headers, so the production build carries the CSP as a meta tag. */
const cspMeta = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
})

export default defineConfig({
  // relative asset paths work both on GitHub Pages (/monotrat/) and at a domain root
  base: './',
  plugins: [react(), tailwindcss(), cspMeta()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})
