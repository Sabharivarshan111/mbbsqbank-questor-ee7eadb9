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
    // Node ESM tooling, not React Native. The RN preset's parser options do
    // not allow top-level import/await, which this script legitimately uses.
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2022,
      // Node globals: these scripts run under node, not React Native.
      globals: {
        Buffer: 'readonly',
        process: 'readonly',
        console: 'readonly',
        // Runs inside page.evaluate, i.e. in the browser, not in node.
        getComputedStyle: 'readonly',
        document: 'readonly',
        window: 'readonly',
      },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  },
  {
    settings: {
      'import/resolver': {
        node: { paths: [path.resolve(__dirname, 'src')] },
      },
    },
  },
];
