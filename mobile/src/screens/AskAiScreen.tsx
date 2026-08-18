import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Maximize2, RefreshCw, Send, Sparkles } from 'lucide-react-native';
import { typeScale } from '@/theme/typography';
import { DURATION, EASE, useReducedMotion } from '@/theme/motion';
import { useTheme, withAlpha } from '@/theme';
import { GradientFill } from '@/components/Gradient';
import { McqCard } from '@/components/McqCard';
import { MessageEntrance } from '@/components/MessageEntrance';
import { ThinkingDots } from '@/components/ThinkingDots';
import { RevealText } from '@/components/RevealText';
import { AnswerActions, followUpsFor } from '@/components/AnswerActions';
import {
  askAi,
  displayText,
  MAX_HISTORY,
  MAX_HISTORY_CONTENT,
  MAX_PROMPT,
  type Mcq,
} from '@/lib/askAi';
import type { RootTabParamList } from '@/navigation/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Present when this turn produced answerable practice questions. */
  mcqs?: Mcq[];
  /** The question this answer replies to — what the follow-ups refer to. */
  about?: string;
  /** Reveal only on arrival, never again on a later re-render. */
  fresh?: boolean;
  /** The request threw; offer "Ask again" rather than follow-ups. */
  failed?: boolean;
}

let messageSeq = 0;
function nextId() {
  messageSeq += 1;
  return `${Date.now()}-${messageSeq}`;
}

export default function AskAiScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootTabParamList, 'AskAI'>>();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  /**
   * Which assistant messages have finished revealing.
   *
   * The follow-ups wait for this. Offering "Test me on this" while the answer
   * is still being written invites a tap that would throw away the thing the
   * user is waiting for, and a row that appears mid-reveal gets pushed down the
   * screen by every line that follows it — motion dragging the eye away from
   * the text it is trying to read.
   */
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const markRevealed = useCallback((id: string) => {
    setRevealed(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const prompt = raw.trim();
      if (!prompt || loading) {
        return;
      }
      if (prompt.length > MAX_PROMPT) {
        // Caught here rather than as a server 400, so the user gets a sentence
        // they can act on instead of a validation failure.
        setMessages(prev => [
          ...prev,
          { id: nextId(), role: 'user', text: prompt },
          {
            id: nextId(),
            role: 'assistant',
            text: `That question is a bit long — please shorten it to under ${MAX_PROMPT.toLocaleString()} characters and send again.`,
          },
        ]);
        setInput('');
        return;
      }
      setInput('');
      // A tap-triggered prompt carries a "Triple-tapped:"/"Double-tapped:"
      // marker the function needs but the user should never see, and an MCQ
      // request is rewritten into a page of JSON instructions before it is
      // sent. The bubble shows the question, not the machinery.
      const shown = displayText(prompt);
      /**
       * Only the tail of the conversation goes to the server.
       *
       * The deployed ask-gemini function (checked against v110, not just the
       * copy in supabase/functions) validates `conversationHistory` with
       * `z.array(...).max(20)` and each `content` with `.max(15000)`. This was
       * sending the whole transcript, so from the 21st message on, every
       * request failed validation and the chat stayed broken for the rest of
       * the session.
       *
       * The function answers validation failures with HTTP 200 and an `error`
       * field rather than a 4xx, so this surfaced as a generic failure message
       * instead of anything diagnosable.
       *
       * The most recent turns are the ones that carry the context anyway, and
       * the function itself only ever uses the last 10.
       */
      const history = messages
        .slice(-MAX_HISTORY)
        .map(message => ({
          role: message.role,
          content:
            message.text.length > MAX_HISTORY_CONTENT
              ? message.text.slice(0, MAX_HISTORY_CONTENT)
              : message.text,
        }));
      setMessages(prev => [...prev, { id: nextId(), role: 'user', text: shown }]);
      setLoading(true);

      try {
        // src/lib/askAi.ts owns the request shape — which intent flags the
        // function needs, and how an MCQ response is parsed back into cards.
        const result = await askAi(prompt, history);
        setMessages(prev => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            text: result.text,
            mcqs: result.mcqs,
            about: shown,
            fresh: true,
          },
        ]);
      } catch (err) {
        setMessages(prev => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            text: err instanceof Error ? err.message : String(err),
            about: shown,
            failed: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages],
  );

  // A question sent over from a browse screen.
  const handledNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    const { question, nonce } = route.params ?? {};
    if (question && nonce && nonce !== handledNonce.current) {
      handledNonce.current = nonce;
      send(question);
    }
  }, [route.params, send]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, loading]);

  const canSend = input.trim().length > 0 && !loading;

  // 160ms: the send button's state changes as often as the first character of
  // a message, which is the tens-of-times-a-day tier — near-imperceptible or
  // nothing. A crossfade at press-feedback speed is the former.
  const sendReady = useRef(new Animated.Value(0)).current;
  const sendIdle = sendReady.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) {
      sendReady.setValue(canSend ? 1 : 0);
      return;
    }
    Animated.timing(sendReady, {
      toValue: canSend ? 1 : 0,
      duration: DURATION.fast,
      easing: EASE.out,
      useNativeDriver: true,
    }).start();
  }, [canSend, reduceMotion, sendReady]);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={[styles.title, { color: colors.text }]}>Ask AI</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Your instant medical study companion
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Assistant header */}
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <View
            style={[styles.avatar, { backgroundColor: withAlpha(colors.fuchsia, 0.18) }]}>
            <Text style={styles.avatarEmoji}>🧠</Text>
          </View>
          <Text style={[styles.assistantName, { color: colors.text }]}>
            Medical <Text style={{ color: colors.fuchsia }}>Assistant</Text>
          </Text>
          <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />
          <View style={styles.headerSpacer} />
          <View style={[styles.expandButton, { borderColor: colors.border }]}>
            <Maximize2 size={16} color={colors.textMuted} />
          </View>
        </View>

        {/* Conversation */}
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <RefreshCw size={28} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
              Ask me any medical question!
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              I'm ACEV, your personal medical assistant
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const mine = item.role === 'user';
              // A quiz is not a chat bubble. Cards get the full width, because
              // four tappable options squeezed into 88% of it would either wrap
              // badly or drop below the 44dp touch minimum.
              if (item.mcqs) {
                return (
                  <MessageEntrance>
                    <View style={styles.mcqGroup}>
                      <Text style={[styles.mcqHeading, { color: colors.textMuted }]}>
                        {item.text}
                      </Text>
                      {item.mcqs.map((mcq, i) => (
                        <McqCard key={`${item.id}-${i}`} item={mcq} index={i} />
                      ))}
                    </View>
                  </MessageEntrance>
                );
              }
              return (
                <MessageEntrance>
                  <View
                    style={[
                      styles.bubble,
                      mine
                        ? { backgroundColor: colors.cardElevated, alignSelf: 'flex-end' }
                        : {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            borderWidth: StyleSheet.hairlineWidth,
                            alignSelf: 'flex-start',
                          },
                    ]}>
                    {mine ? (
                      <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                    ) : (
                      <RevealText
                        text={item.text}
                        animate={item.fresh}
                        onDone={() => markRevealed(item.id)}
                        style={[styles.bubbleText, { color: colors.text }]}
                      />
                    )}
                  </View>
                  {!mine && item.about && revealed.has(item.id) ? (
                    <AnswerActions
                      followUps={item.failed ? [] : followUpsFor(item.about)}
                      onPick={send}
                      onRetry={() => send(item.about!)}
                      disabled={loading}
                    />
                  ) : null}
                </MessageEntrance>
              );
            }}
            ListFooterComponent={
              loading ? <ThinkingDots label="Thinking…" /> : undefined
            }
          />
        )}

        {/* Composer */}
        <View style={[styles.composerWrap, { borderTopColor: colors.border }]}>
          <View
            style={[
              styles.composer,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}>
            <View
              style={[styles.sparkAvatar, { backgroundColor: withAlpha(colors.fuchsia, 0.18) }]}>
              <Sparkles size={16} color={colors.fuchsia} />
            </View>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask a medical question…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text }]}
              multiline
            />
            {/*
              * The send button crossfades between its two states rather than
              * snapping. Touchable applies a flat 0.45 opacity to a disabled
              * target, which made the button pop the moment the first
              * character landed — a hard change on the control you are
              * actively typing into.
              *
              * Opacity only, on the native driver: the gradient fill cannot be
              * interpolated, and animating a background colour would be a JS
              * animation on the thread that is already handling keystrokes.
              * Two stacked layers, one fading over the other, gets there with
              * transform-and-opacity work only.
              */}
            <View style={styles.sendWrap}>
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.sendLayer,
                  { backgroundColor: colors.cardElevated, opacity: sendIdle },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.sendLayer, { opacity: sendReady }]}>
                <GradientFill from="#F5D0FE" to={colors.fuchsia} borderRadius={12} />
              </Animated.View>
              <Touchable
                onPress={() => send(input)}
                disabled={!canSend}
                label="Send"
                scaleTo={0.9}
                style={styles.sendButton}>
                <Send
                  size={18}
                  color={canSend ? '#3B0764' : colors.textMuted}
                  style={styles.sendIcon}
                />
              </Touchable>
            </View>
          </View>
          <View style={styles.disclaimer}>
            <Sparkles size={12} color={colors.textMuted} />
            <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
              AI-generated content
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: typeScale.title1,
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  assistantName: {
    fontSize: 17,
    fontWeight: '700',
  },
  onlineDot: {
    height: 9,
    width: 9,
    borderRadius: 5,
  },
  headerSpacer: {
    flex: 1,
  },
  expandButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
  },
  emptySub: {
    fontSize: 15,
    textAlign: 'center',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 14,
    gap: 10,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  mcqGroup: {
    gap: 10,
  },
  mcqHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  sparkAvatar: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    fontSize: 15,
    paddingVertical: 6,
  },
  sendWrap: {
    height: 44,
    width: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendLayer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButton: {
    height: 44,
    width: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    // Keeps the glyph above the absolutely-positioned gradient.
    zIndex: 1,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 12,
  },
});
