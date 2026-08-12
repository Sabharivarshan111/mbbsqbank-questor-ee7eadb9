module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
          // Shared with the web app — see metro.config.js.
          '@data': '../src/data',
          '@shared': '../src/lib',
        },
      },
    ],
  ],
};
