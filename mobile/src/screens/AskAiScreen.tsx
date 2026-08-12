import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Maximize2, RefreshCw, Send, Sparkles } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { GradientFill } from '@/components/Gradient';
import { supabase } from '@/lib/supabase';
import type { RootTabParamList } from '@/navigation/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
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

  const send = useCallback(
    async (raw: string) => {
      const prompt = raw.trim();
      if (!prompt || loading) {
        return;
      }
      setInput('');
      const history = messages.map(message => ({ role: message.role, content: message.text }));
      setMessages(prev => [...prev, { id: nextId(), role: 'user', text: prompt }]);
      setLoading(true);

      try {
        // Same edge function the web app calls.
        const { data, error } = await supabase.functions.invoke('ask-gemini', {
          body: { prompt, conversationHistory: history },
        });
        if (error) {
          throw new Error(error.message);
        }
        if (data?.error) {
          throw new Error(String(data.error));
        }
        setMessages(prev => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            text: data?.response ?? 'No answer came back. Try rephrasing the question.',
          },
        ]);
      } catch (err) {
        setMessages(prev => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            text: `Could not reach the AI service.\n\n${
              err instanceof Error ? err.message : String(err)
            }`,
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
              return (
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
                  <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                </View>
              );
            }}
            ListFooterComponent={
              loading ? (
                <View style={styles.typing}>
                  <ActivityIndicator size="small" color={colors.fuchsia} />
                  <Text style={[styles.typingText, { color: colors.textMuted }]}>Thinking…</Text>
                </View>
              ) : undefined
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
            <Pressable
              onPress={() => send(input)}
              disabled={!canSend}
              style={[
                styles.sendButton,
                { backgroundColor: colors.fuchsia, opacity: canSend ? 1 : 0.45 },
              ]}>
              <GradientFill from="#F5D0FE" to={colors.fuchsia} borderRadius={12} />
              <Send size={18} color="#3B0764" style={styles.sendIcon} />
            </Pressable>
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
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
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
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 13,
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
  sendButton: {
    height: 44,
    width: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
