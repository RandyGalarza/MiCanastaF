const appJson = require('./app.json');

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    extra: {
      ...config.extra,
      googleMapsApiKeyConfigured: Boolean(googleMapsApiKey),
    },
    plugins: [
      ...(config.plugins ?? appJson.expo.plugins),
      ...(googleMapsApiKey
        ? [['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }]]
        : []),
    ],
  };
};
