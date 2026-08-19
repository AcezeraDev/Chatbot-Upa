import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { sendChatMessage } from '../services/api';
import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';
import type { ChatMessage, Coordinates, UF } from '../types';

type ChatScreenProps = {
  theme: AppTheme;
  coords: Coordinates | null;
  uf: UF | null;
  messages: ChatMessage[];
  onChangeMessages: (updater: (current: ChatMessage[]) => ChatMessage[]) => void;
};

const suggestions = ['Qual a unidade mais perto?', 'Mostrar as unidades próximas'];

export function ChatScreen({ theme, coords, uf, messages, onChangeMessages }: ChatScreenProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const counter = useRef(0);

  const nextId = (role: string) => {
    counter.current += 1;
    return `${role}-${counter.current}`;
  };

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || typing) return;

    setInput('');
    onChangeMessages((current) => [
      ...current,
      { id: nextId('user'), role: 'user', text, createdAt: new Date().toISOString() },
    ]);
    setTyping(true);

    try {
      const result = await sendChatMessage(text, coords, uf?.sigla ?? null);
      onChangeMessages((current) => [
        ...current,
        {
          id: nextId('assistant'),
          role: 'assistant',
          text: result.reply,
          createdAt: new Date().toISOString(),
          kind: result.kind,
        },
      ]);
    } catch {
      onChangeMessages((current) => [
        ...current,
        {
          id: nextId('assistant'),
          role: 'assistant',
          text: 'Não consegui falar com o servidor agora. Em uma emergência, ligue 192 (SAMU).',
          createdAt: new Date().toISOString(),
          kind: 'unavailable',
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: false });
  }, [messages, typing]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Assistente</Text>
        <Text style={styles.mode}>{uf ? uf.sigla : 'sem estado'}</Text>
      </View>

      <FlatList
        ref={listRef}
        contentContainerStyle={styles.messages}
        data={messages}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          const isEmergency = item.kind === 'emergency';

          return (
            <View
              style={[
                styles.message,
                isUser ? styles.userMessage : styles.assistantMessage,
                isEmergency && styles.emergencyMessage,
              ]}
            >
              {isEmergency && (
                <View style={styles.emergencyHeader}>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
                  <Text style={styles.emergencyLabel}>Atenção</Text>
                </View>
              )}
              <Text
                style={[
                  styles.messageText,
                  isUser && styles.userMessageText,
                  isEmergency && styles.emergencyText,
                ]}
              >
                {item.text}
              </Text>
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
    emergencyMessage: {
      backgroundColor: theme.colors.warningSoft,
      borderColor: theme.colors.danger,
      maxWidth: '92%',
    },
    emergencyHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
      marginBottom: 4,
    },
    emergencyLabel: {
      color: theme.colors.danger,
      fontFamily: typography.bold,
      fontSize: 13,
    },
    messageText: {
      color: theme.colors.text,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 21,
    },
    userMessageText: { color: theme.isDark ? '#102018' : '#FFFFFF' },
    emergencyText: { color: theme.isDark ? theme.colors.text : '#7F1D1D' },
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
      minHeight: 48,
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
