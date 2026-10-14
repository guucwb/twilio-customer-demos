import {defineConfig} from 'vitest/config'; export default defineConfig({root:new URL('.',import.meta.url).pathname,test:{include:['server/**/*.test.ts'],testTimeout:10000}});
