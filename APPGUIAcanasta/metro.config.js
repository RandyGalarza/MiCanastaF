const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Permite que Metro reconozca y resuelva archivos .wasm (requerido por expo-sqlite en web)
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Configura cabeceras COOP y COEP para habilitar SharedArrayBuffer necesario para expo-sqlite web worker
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;

