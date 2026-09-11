import react from '@vitejs/plugin-react';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const LOCAL_MMD_PREFIX = '/__local-mmd/';
const LOCAL_MMD_ROOT = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  'assets-source/Character MMD',
);

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.bmp': 'image/bmp',
  '.pmx': 'application/octet-stream',
  '.png': 'image/png',
};

function serveLocalMmdAssets(): Plugin {
  const middleware: Connect.NextHandleFunction = async (request, response, next) => {
    if (!request.url?.startsWith(LOCAL_MMD_PREFIX)) {
      next();
      return;
    }

    try {
      const requestPath = decodeURIComponent(
        request.url.slice(LOCAL_MMD_PREFIX.length).split('?')[0],
      )
        .replaceAll('\\', '/')
        .replace(/^\/+/, '');
      const filePath = resolve(LOCAL_MMD_ROOT, requestPath);
      if (filePath !== LOCAL_MMD_ROOT && !filePath.startsWith(`${LOCAL_MMD_ROOT}${sep}`)) {
        response.statusCode = 403;
        response.end('Forbidden');
        return;
      }

      const file = await stat(filePath);
      if (!file.isFile()) {
        next();
        return;
      }

      response.statusCode = 200;
      response.setHeader(
        'Content-Type',
        CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      );
      response.setHeader('Content-Length', file.size);
      response.setHeader('Cache-Control', 'no-store');
      createReadStream(filePath).pipe(response);
    } catch {
      next();
    }
  };

  return {
    name: 'serve-local-mmd-assets',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), serveLocalMmdAssets()],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { sourcemap: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/simulation/**/*.test.ts'],
    coverage: { reporter: ['text', 'html'] },
  },
});
