import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { warn } from '@/lib/log';

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
}

const KEY = 'orbit:wallpaper';

export const DEFAULT_DIM = 0.55;
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
    return {
      uri: asset.uri,
      kind: asset.type?.startsWith('video') ? 'video' : 'image',
      dim: DEFAULT_DIM,
    };
  } catch (error) {
    warn('wallpaper picker threw:', error);
    return null;
  }
}
