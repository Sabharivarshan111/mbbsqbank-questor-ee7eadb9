import React, { useEffect, useState } from 'react';
import { AppState, Image, StyleSheet, View, type AppStateStatus } from 'react-native';
import Video from 'react-native-video';
import { useTheme } from '@/theme';
import { useReducedMotion } from '@/theme/motion';
import { useWallpaper } from '@/hooks/useWallpaper';
import { solveWallpaper } from '@/lib/wallpaper';

/**
 * Draws the chosen photo or video behind a screen's content.
 *
 * Three things this has to get right, none of them about drawing the picture.
 *
 * **Readability.** A scrim of the theme's own background colour sits between
 * the media and the content. Without it the app is unreadable over roughly
 * half of all photographs, and which half is not knowable in advance. See
 * lib/wallpaper.ts for why the strength lives on the wallpaper itself.
 *
 * **Battery.** A looping video is the single most expensive thing this app
 * could put on screen, on phones chosen for being cheap. It is muted, it
 * pauses the moment the app leaves the foreground, and it stops entirely under
 * reduced motion — where a moving background is also exactly what the setting
 * is asking not to see. The poster frame stays, so the screen still looks
 * like the thing the user chose.
 *
 * **Failing quietly.** The picker returns a URI into the app's cache, and
 * Android may evict that under storage pressure. A wallpaper that has gone
 * missing must leave a normal, working screen rather than a black hole — so a
 * load error clears the media and the theme's own background shows through.
 */
/**
 * The text colour to use over the current wallpaper, or the theme's own when
 * there is none. Content drawn directly on the background — headings, the
 * brand mark — reads this instead of `colors.text`; anything inside a card is
 * on the card, not the wallpaper, and keeps the palette's colour.
 */
export function useWallpaperText(): string {
  const { colors } = useTheme();
  const { wallpaper } = useWallpaper();
  if (!wallpaper) {
    return colors.text;
  }
  return solveWallpaper(wallpaper, colors.background, colors.text).text;
}

export function WallpaperBackground({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { wallpaper, clear } = useWallpaper();
  const reduceMotion = useReducedMotion();
  const [foreground, setForeground] = useState(true);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) =>
      setForeground(state === 'active'),
    );
    return () => sub.remove();
  }, []);

  // A new pick deserves a fresh attempt at loading it.
  useEffect(() => setBroken(false), [wallpaper?.uri]);

  if (!wallpaper || broken) {
    return <View style={styles.root}>{children}</View>;
  }

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {wallpaper.kind === 'video' ? (
          <Video
            source={{ uri: wallpaper.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            repeat
            muted
            // Not just quiet — a background that plays audio is never what
            // anyone meant by "set a wallpaper".
            paused={!foreground || reduceMotion}
            disableFocus
            playInBackground={false}
            onError={() => {
              setBroken(true);
              clear();
            }}
          />
        ) : (
          <Image
            source={{ uri: wallpaper.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => {
              setBroken(true);
              clear();
            }}
          />
        )}
        {/* The scrim. Drawn in the theme's background colour rather than plain
            black, so a light theme dims towards white and its dark text keeps
            working — a black scrim under a light theme would invert the
            relationship the palette was built on. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.background,
              // Re-solved against the live theme rather than using the stored
              // value: the same photograph needs a different scrim under a
              // light theme than a dark one, and switching theme must not
              // leave the app unreadable until the wallpaper is re-picked.
              opacity: solveWallpaper(wallpaper, colors.background, colors.text).dim,
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
