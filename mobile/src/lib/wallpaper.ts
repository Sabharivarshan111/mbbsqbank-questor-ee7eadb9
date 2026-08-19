import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
// v1.x on purpose: 2.x is an Expo module and pulls in expo-modules-core,
// which a bare React Native app cannot resolve — Metro fails the whole
// bundle. 1.5.2 is the last pure-RN release and has the API this needs.
import ImageColors from 'react-native-image-colors';
import { warn } from '@/lib/log';
import { readabilityFor } from '@/lib/wallpaperReadability';

/**
 * A photo or video from the phone, shown behind the Home screen.
 *
 * The hard part is not showing it — it is that text has to stay readable on
 * top of an image nobody has seen. A photograph has no contrast guarantee: the
 * same white heading is perfect over a night sky and invisible over a beach.
 * So a wallpaper always carries a **scrim**, a wash of the theme's background
 * colour between the media and the content, and the scrim's strength is part
 * of the wallpaper rather than a setting hidden elsewhere.
 *
 * `dim` defaults to 0.55, which is enough to hold AA for the app's text over
 * most photographs while leaving the picture clearly visible. It is adjustable
 * because the right value genuinely depends on the image.
 */
export interface Wallpaper {
  uri: string;
  kind: 'image' | 'video';
  /** 0 = no scrim, 1 = the theme background entirely. */
  dim: number;
  /**
   * The wallpaper's representative colour, sampled once when it was chosen.
   *
   * Kept so the scrim can be re-solved when the *theme* changes without
   * re-reading the file — the picture has not moved, but what it has to be
   * readable against has.
   */
  media?: string;
  /**
   * Text colour over the wallpaper. Absent means "whatever the solver
   * decided"; set means the user overrode it and their choice stands.
   */
  textColor?: string;
}

const KEY = 'orbit:wallpaper';

export const DEFAULT_DIM = 0.55;

/**
 * Solve the scrim and text colour for a wallpaper against a theme.
 *
 * Called when a wallpaper is picked and again whenever the theme changes,
 * because the same photograph needs a different scrim under a light theme than
 * a dark one. A user-set `textColor` is never overridden — the solver moves the
 * scrim to fit their choice instead.
 */
export function solveWallpaper(
  wallpaper: Wallpaper,
  themeBackground: string,
  themeText: string,
): { dim: number; text: string } {
  if (!wallpaper.media) {
    // Nothing sampled — a video, or a sampling failure. Keep the default
    // scrim, which is heavy enough to hold most photographs, and the theme's
    // own text. Guessing from no information is worse than a safe default.
    return { dim: wallpaper.dim, text: wallpaper.textColor ?? themeText };
  }
  const solved = readabilityFor(wallpaper.media, themeBackground, wallpaper.textColor ?? themeText);
  return { dim: solved.dim, text: wallpaper.textColor ?? solved.text };
}
/**
 * Below this the app stops being reliably readable over a bright photo. The
 * slider stops here rather than at 0: an unreadable app is not a preference.
 */
export const MIN_DIM = 0.2;

export async function readWallpaper(): Promise<Wallpaper | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<Wallpaper>;
    if (typeof parsed.uri !== 'string' || !parsed.uri) {
      return null;
    }
    return {
      uri: parsed.uri,
      kind: parsed.kind === 'video' ? 'video' : 'image',
      dim: typeof parsed.dim === 'number' ? parsed.dim : DEFAULT_DIM,
    };
  } catch {
    return null;
  }
}

export async function writeWallpaper(wallpaper: Wallpaper | null): Promise<void> {
  try {
    if (wallpaper) {
      await AsyncStorage.setItem(KEY, JSON.stringify(wallpaper));
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  } catch (error) {
    warn('wallpaper persist failed:', error);
  }
}

/**
 * The wallpaper's representative colour.
 *
 * Android's Palette API, through react-native-image-colors. `average` rather
 * than `dominant` or `vibrant`: text has to survive the *whole* picture, not
 * its most interesting part. A photo that is mostly dark sky with one bright
 * sun has a vibrant colour of yellow and an average close to the sky, and the
 * sky is what most of the text will be sitting on.
 *
 * Video cannot be sampled — there is no frame to read without decoding one,
 * which needs a native thumbnail API this app does not have. Returns null, and
 * the caller falls back to a scrim heavy enough for an unknown picture.
 */
async function sampleColor(uri: string, kind: 'image' | 'video'): Promise<string | null> {
  if (kind === 'video') {
    return null;
  }
  try {
    const result = await ImageColors.getColors(uri, {
      fallback: '#808080',
      cache: false,
      quality: 'low',
    });
    if (result.platform === 'android') {
      return result.average ?? result.dominant ?? null;
    }
    return null;
  } catch (error) {
    warn('wallpaper colour sampling failed:', error);
    return null;
  }
}

/**
 * Open the phone's gallery and return what was chosen.
 *
 * Photos and videos in one picker, because "set a wallpaper" is one intent and
 * making the user pick the *kind* first is a question the app can answer
 * itself from what comes back.
 *
 * No permission is requested. Android's photo picker runs in a separate
 * process and hands back only the item chosen, so the app never needs access
 * to the gallery at all — asking for READ_MEDIA_IMAGES to do this would be
 * requesting far more than the feature needs.
 */
export async function pickWallpaper(): Promise<Wallpaper | null> {
  try {
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: 1,
      // Downscale on the way in. A 108-megapixel photo as a full-screen
      // background is tens of megabytes of bitmap held for the life of the
      // app, on phones that do not have it to spare.
      maxWidth: 1440,
      maxHeight: 2880,
      quality: 0.9,
    });

    if (result.didCancel || result.errorCode) {
      if (result.errorCode) {
        warn('wallpaper picker error:', result.errorMessage);
      }
      return null;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return null;
    }
    const kind = asset.type?.startsWith('video') ? 'video' : 'image';
    return { uri: asset.uri, kind, dim: DEFAULT_DIM, media: (await sampleColor(asset.uri, kind)) ?? undefined };
  } catch (error) {
    warn('wallpaper picker threw:', error);
    return null;
  }
}
