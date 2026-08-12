const path = require('node:path');
const { FlatCompat } = require('@eslint/eslintrc');

// This file exists so ESLint stops searching parent directories and picks up
// the web app's flat config at the repo root. It simply re-exports the React
// Native preset, which is still eslintrc-shaped.
const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      'preview/dist/**',
      'vendor/**',
    ],
  },
  ...compat.extends('@react-native'),
  {
    settings: {
      'import/resolver': {
        node: { paths: [path.resolve(__dirname, 'src')] },
      },
    },
  },
];
