import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/build/**', '**/dist/**', 'plugin-flash-analytics/public/**', 'plugin-flash-analytics/*.js', 'serverless/functions/**', 'serverless/assets/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);
