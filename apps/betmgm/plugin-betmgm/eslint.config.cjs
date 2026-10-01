const js = require('@eslint/js');
const ts = require('typescript-eslint');
const globals = require('globals');
module.exports = ts.config({ignores:['node_modules/**','build/**','public/**']},js.configs.recommended,...ts.configs.recommended,{languageOptions:{globals:{...globals.node,...globals.browser}}},{files:['*.js','*.cjs'],rules:{'@typescript-eslint/no-require-imports':'off'}});
