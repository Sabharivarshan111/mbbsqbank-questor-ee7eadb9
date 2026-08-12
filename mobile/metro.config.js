const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// The question bank lives in the web app's src/data. It is pure TypeScript data
// with no DOM or browser dependencies, so the native app consumes it directly
// instead of keeping a second copy in sync.
const sharedData = path.resolve(__dirname, '..', 'src', 'data');

// A few web-app modules are pure logic with no DOM dependency and are shared
// rather than forked — notably the display-name blocklist, which would drift
// if it were duplicated. Only files this app actually imports are bundled.
const sharedLib = path.resolve(__dirname, '..', 'src', 'lib');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Metro refuses to resolve files outside the project root unless they are
  // explicitly watched.
  watchFolders: [sharedData, sharedLib],
  resolver: {
    extraNodeModules: {
      '@data': sharedData,
      '@shared': sharedLib,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
