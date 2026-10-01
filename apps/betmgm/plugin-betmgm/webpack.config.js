const path = require('path');
module.exports = (config) => {
  const shared = path.resolve(__dirname, '../shared');
  function extend(rules) {
    for (const rule of rules || []) {
      if (typeof rule.loader === 'string' && rule.loader.includes('babel-loader')) rule.include = [path.resolve(__dirname,'src'),shared];
      extend(rule.oneOf); extend(rule.rules);
    }
  }
  extend(config.module.rules);
  config.resolve.plugins = (config.resolve.plugins || []).filter(plugin => plugin.constructor.name !== "ModuleScopePlugin");
  config.resolve.alias = { ...config.resolve.alias, react: path.resolve(__dirname,'node_modules/react'), 'react-dom':path.resolve(__dirname,'node_modules/react-dom') };
  return config;
};
