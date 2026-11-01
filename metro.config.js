const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// expo-sqlite on web needs cross-origin isolation headers
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};
config.resolver.assetExts.push('wasm');
module.exports = config;
