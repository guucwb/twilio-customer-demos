import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({base:'/globo/',plugins:[react()],server:{port:5179,strictPort:true,proxy:{'/api/globo':'http://127.0.0.1:3009'}},preview:{port:5179,strictPort:true}});
