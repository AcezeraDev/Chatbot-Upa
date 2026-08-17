import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { sendChatMessage } from '../services/api';
import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';
import type { ChatMessage, DataSource } from '../types';

type ChatScreenProps = {
  theme: AppTheme;
  initialSource: DataSource;
};

const initialMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Olá. Posso comparar os tempos demonstrativos das UPAs.',
  createdAt: new Date().toISOString(),
};

const suggestions = ['Qual UPA tem menor espera?', 'Mostrar todas as unidades'];

export function ChatScreen({ theme, initialSource }: ChatScreenProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [source, setSource] = useState<DataSource>(initialSource);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || typing) return;

    setInput('');
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text, createdAt: new Date().toISOString() },
    ]);
    setTyping(true);

    const result = await sendChatMessage(text);
    setSource(result.source);
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.reply,
        createdAt: new Date().toISOString(),
      },
    ]);
    setTyping(false);
  };

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: false });
  }, [messages, typing]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Assistente</Text>
        <Text style={styles.mode}>{source === 'api' ? 'API ativa' : 'Demonstração'}</Text>
      </View>

      <FlatList
        ref={listRef}
        contentContainerStyle={styles.messages}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={[styles.message, isUser ? styles.userMessage : styles.assistantMessage]}>
              <Text style={[styles.messageText, isUser && styles.userMessageText]}>{item.text}</Text>
            </View>
          );
        }}
        ListFooterComponent={typing ? <Text style={styles.typing}>Respondendo...</Text> : null}
        showsVerticalScrollIndicator={false}
      />

      {messages.length === 1 && (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              disabled={typing}
              onPress={() => send(suggestion)}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Mensagem para o assistente"
          editable={!typing}
          maxLength={500}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          placeholder="Digite uma pergunta"
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="send"
          style={styles.input}
          value={input}
        />
        <Pressable
          accessibilityLabel="Enviar mensagem"
          accessibilityRole="button"
          disabled={!input.trim() || typing}
          onPress={() => send()}
          style={({ pressed }) => [
            styles.sendButton,
            (!input.trim() || typing) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1 },
    header: {
      alignItems: 'center',
      alignSelf: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      maxWidth: 560,
      minHeight: 64,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    title: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 21,
    },
    mode: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
    },
    messages: {
      alignSelf: 'center',
      flexGrow: 1,
      maxWidth: 560,
      padding: spacing.md,
      width: '100%',
    },
    message: {
      borderRadius: 8,
      marginBottom: spacing.sm,
      maxWidth: '84%',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    assistantMessage: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.primaryStrong,
    },
    messageText: {
      color: theme.colors.text,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 21,
    },
    userMessageText: { color: theme.isDark ? '#102018' : '#FFFFFF' },
    typing: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
      paddingVertical: spacing.sm,
    },
    suggestions: {
      alignSelf: 'center',
      maxWidth: 560,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    suggestion: {
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      marginBottom: spacing.sm,
      minHeight: 44,
      paddingHorizontal: 12,
    },
    suggestionText: {
      color: theme.colors.primary,
      fontFamily: typography.regular,
      fontSize: 14,
    },
    composer: {
      alignItems: 'center',
      alignSelf: 'center',
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      maxWidth: 560,
      padding: spacing.md,
      width: '100%',
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.colors.text,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 15,
      minHeight: 48,
      paddingHorizontal: 12,
    },
    sendButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: 8,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 15,
    },
    sendText: {
      color: theme.isDark ? '#102018' : '#FFFFFF',
      fontFamily: typography.bold,
      fontSize: 14,
    },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.65 },
  });
