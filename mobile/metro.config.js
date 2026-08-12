const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// The question bank lives in the web app's src/data. It is pure TypeScript data
// with no DOM or browser dependencies, so the native app consumes it directly
// instead of keeping a second copy in sync.
const sharedData = path.resolve(__dirname, '..', 'src', 'data');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Metro refuses to resolve files outside the project root unless they are
  // explicitly watched.
  watchFolders: [sharedData],
  resolver: {
    extraNodeModules: {
      '@data': sharedData,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
