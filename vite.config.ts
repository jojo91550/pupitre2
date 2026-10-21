/// <reference types="vitest/config" />
import { rmSync } from 'node:fs';
import path from 'node:path';
import type { ClientRequest } from 'node:http';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite';

// Routing table of docs/specs/004-api-and-routing.md: these prefixes belong to
// course-service, everything else under /api to user-service. Keep it in step
// with the Helm chart's pupitre.routeTable.
const COURSE_SERVICE_PREFIXES = [
  'courses',
  'paths',
  'skills',
  'batch',
  'uploads',
  'admin/courses',
  'admin/cache',
  'admin/lab-checks',
  'admin/exports/lab-checks',
];

// Only these request headers reach the backend. The Astro proxy forwarded every
// client header, X-Forwarded-For and X-Internal-Secret included (audit H4).
const FORWARDED_HEADERS = new Set([
  'accept',
  'authorization',
  'content-type',
  'content-length',
  'host',
]);

function stripHeaders(proxyReq: ClientRequest) {
  for (const name of proxyReq.getHeaderNames()) {
    if (!FORWARDED_HEADERS.has(name.toLowerCase())) proxyReq.removeHeader(name);
  }
}

// public/mockServiceWorker.js is only for `pnpm dev:mock`: keep it out of a
// production build.
function dropMockWorker(mode: string): Plugin {
  return {
    name: 'pupitre:drop-mock-worker',
    apply: 'build',
    closeBundle() {
      if (mode !== 'mock') rmSync(path.resolve('dist', 'mockServiceWorker.js'), { force: true });
    },
  };
}

function target(url: string): ProxyOptions {
  return {
    target: url,
    changeOrigin: true,
    configure: (proxy) => proxy.on('proxyReq', stripHeaders),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const userService = env.VITE_USER_SERVICE_URL || 'http://localhost:8081';
  const courseService = env.VITE_COURSE_SERVICE_URL || 'http://localhost:8082';
  const coursePattern = `^/api/(${COURSE_SERVICE_PREFIXES.join('|')})(/|\\?|$)`;

  return {
    plugins: [react(), tailwindcss(), dropMockWorker(mode)],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    server: {
      port: 3000,
      // In mock mode MSW answers in the browser, so nothing is proxied.
      proxy:
        mode === 'mock'
          ? undefined
          : {
              [coursePattern]: target(courseService),
              '/uploads': target(courseService),
              '/api': target(userService),
            },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
