import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(__dirname, '..');

// Preview-only bundling. The Android app is built by Metro (../metro.config.js);
// this config exists solely to render the same screens in a browser.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  define: {
    global: 'window',
    __DEV__: 'true',
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: [
      { find: '@data', replacement: path.resolve(root, '..', 'src', 'data') },
      { find: '@', replacement: path.resolve(root, 'src') },
      // lucide-react-native needs react-native-svg; the DOM build is equivalent
      // and exports the same icon names.
      { find: 'lucide-react-native', replacement: 'lucide-react' },
      {
        find: '@react-native-async-storage/async-storage',
        replacement: path.resolve(__dirname, 'shims', 'async-storage.ts'),
      },
      {
        find: '@react-native/assets-registry/registry',
        replacement: path.resolve(__dirname, 'shims', 'assets-registry.ts'),
      },
      { find: 'react-native', replacement: 'react-native-web' },
    ],
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
      loader: { '.js': 'jsx' },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
