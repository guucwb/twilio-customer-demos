import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5175, strictPort: true, proxy: { '/api/ache': 'http://127.0.0.1:3003' } },
  preview: { port: 5175, strictPort: true },
});
