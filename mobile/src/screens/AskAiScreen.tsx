import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Send, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Muted } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { RootTabParamList } from '@/navigation/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'Explain the pathophysiology of nephrotic syndrome',
  'High-yield topics in Pharmacology paper 1',
  'Give me 10 MCQs on cell injury',
];

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
      const history = messages.map(message => ({
        role: message.role,
        content: message.text,
      }));
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={[styles.title, { color: colors.text }]}>Ask AI</Text>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Sparkles size={34} color={colors.accent} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Your medical study assistant
          </Text>
          <Muted style={styles.emptyText}>
            Ask about any topic, or tap the sparkle on a question to get it explained.
          </Muted>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(suggestion => (
              <Pressable
                key={suggestion}
                onPress={() => send(suggestion)}
                style={({ pressed }) => [
                  styles.suggestion,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { backgroundColor: colors.primary, alignSelf: 'flex-end' }
                    : {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: StyleSheet.hairlineWidth,
                        alignSelf: 'flex-start',
                      },
                ]}>
                <Text
                  style={[styles.bubbleText, { color: mine ? colors.primaryText : colors.text }]}>
                  {item.text}
                </Text>
              </View>
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={[styles.bubble, styles.typing, { backgroundColor: colors.card }]}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Muted>Thinking…</Muted>
              </View>
            ) : undefined
          }
        />
      )}

      <View
        style={[
          styles.composer,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            marginBottom: insets.bottom > 0 ? 4 : 10,
          },
        ]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything medical…"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          multiline
          onSubmitEditing={() => send(input)}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={loading || input.trim().length === 0}
          style={[
            styles.sendButton,
            {
              backgroundColor: colors.primary,
              opacity: loading || input.trim().length === 0 ? 0.4 : 1,
            },
          ]}>
          <Send size={18} color={colors.primaryText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  suggestions: {
    marginTop: 22,
    alignSelf: 'stretch',
    gap: 8,
  },
  suggestion: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: {
    fontSize: 13,
  },
  messages: {
    paddingVertical: 8,
    gap: 10,
  },
  bubble: {
    maxWidth: '86%',
    borderRadius: 16,
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
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
