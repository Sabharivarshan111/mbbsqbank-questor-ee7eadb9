# Screen preview harness (development only)

This folder is **not part of the Android app**. Nothing here is imported by
`index.js`, bundled by Metro, or shipped in the APK — it exists purely so the
React Native screens can be rendered on a desktop browser for design review and
screenshots, on machines with no Android emulator available.

It works by pointing `react-native` at `react-native-web`, which maps the same
`View` / `Text` / `Pressable` components onto DOM nodes. The screen source under
`../src` is the real, unmodified native code.

```sh
npm run preview        # serves the harness at http://localhost:5173
npm run preview:build  # static build, used by the screenshot script
```

To see the app for real, run it on a device or emulator instead:

```sh
npm run android
```
