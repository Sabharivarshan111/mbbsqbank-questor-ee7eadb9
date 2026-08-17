import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { error as logError } from '@/lib/log';
import { FONT_FAMILY } from '@/theme/typography';

/**
 * Catches render and lifecycle errors so one bad component cannot take the
 * whole app down.
 *
 * Without this, React unmounts the entire tree when a render throws. In a
 * release build that means a blank screen with no explanation and no way out
 * except force-quitting — the worst failure mode a React Native app has, and
 * silent, because nothing is logged to a user-visible place.
 *
 * Deliberately self-contained:
 *
 *   • It sits OUTSIDE the providers, so it still works when the thing that
 *     crashed *is* a provider. That rules out reading the theme, so the colours
 *     here are the app's dark palette written literally. This is the one file
 *     allowed to hardcode them.
 *   • Plain `Text` and `TouchableOpacity` from React Native, not the app's own
 *     primitives. A fallback that depends on the code that just failed is not
 *     a fallback. The single exception is FONT_FAMILY, a static constant with
 *     no state, context or side effects — it cannot be what broke, and the
 *     alternative was hardcoding 'Roboto' and rendering in a serif face
 *     anywhere that name does not resolve exactly.
 *   • No hooks, no context, no async. Only a class component can be an error
 *     boundary, and this one does the minimum.
 *
 * "Try again" clears the error and remounts the children. If the fault is
 * deterministic it will simply reappear, which is honest — it does not pretend
 * to have fixed anything. Most real cases are transient: a bad response, a
 * missing field, a race on a slow device.
 */

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Development only — see src/lib/log.ts. If a crash reporter is ever added,
    // this is where it goes.
    logError('Unhandled render error:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Orbit hit an unexpected problem and stopped that screen before it could
          do any damage. Your progress is saved.
        </Text>

        {__DEV__ ? (
          <Text style={styles.detail} numberOfLines={8}>
            {error.message}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={this.reset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          If it keeps happening, closing and reopening the app usually clears it.
        </Text>
      </View>
    );
  }
}

// The dark palette, written out. See the note above on why this cannot read
// from the theme.
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.37,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONT_FAMILY,
    color: '#A8A8B3',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  detail: {
    fontFamily: FONT_FAMILY,
    color: '#F87171',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 16,
  },
  button: {
    marginTop: 24,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  buttonText: {
    fontFamily: FONT_FAMILY,
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    fontFamily: FONT_FAMILY,
    color: '#6B6B78',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
