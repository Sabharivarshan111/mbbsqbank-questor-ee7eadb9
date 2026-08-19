import React from 'react';
import { View, type ViewProps } from 'react-native';

/**
 * Dev-only stand-in for react-native-video.
 *
 * Renders nothing but keeps the layout, so a screen that composes a video
 * background still lays out correctly in the preview. Playback, and the
 * battery cost that makes it worth pausing, are device concerns the harness
 * cannot report on either way.
 */
export default function Video(props: ViewProps) {
  return <View {...props} />;
}
