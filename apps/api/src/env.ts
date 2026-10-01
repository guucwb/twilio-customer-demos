import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Backend entrypoints only. Do not log environment values.
dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
