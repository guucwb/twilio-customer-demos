import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
// Load only in the isolated server process. No env value is printed or bundled.
dotenv.config({path:fileURLToPath(new URL('../../../.env',import.meta.url)),quiet:true});
createApp({apiKey:process.env.BOTI_AI_ENABLED==='true'?process.env.OPENAI_API_KEY:undefined,model:process.env.OPENAI_MODEL,staticDir:fileURLToPath(new URL('../dist',import.meta.url))}).listen(3002,'127.0.0.1',()=>console.info('Boti API + built demo: http://127.0.0.1:3002 · external messaging disabled'));
