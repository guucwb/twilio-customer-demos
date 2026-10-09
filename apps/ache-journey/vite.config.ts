import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],envDir:false,server:{port:5179,strictPort:true,proxy:{'/api':'http://127.0.0.1:3004','/activity/config.json':'http://127.0.0.1:3004'}},preview:{port:5179,strictPort:true}});
