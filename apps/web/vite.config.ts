import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // Never load the repository's credential file into Vite.
  envDir: false,
  server: {
    port: 5173, strictPort: true,
    // Permit only the bundled font assets outside this workspace's web directory.
    fs: { strict: true, allow: ['.', fileURLToPath(new URL('../../node_modules/@fontsource', import.meta.url))] },
    proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false } },
  },
});
