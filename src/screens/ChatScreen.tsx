import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
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

import { sendChatMessage } from '../services/api';
import type { AppTheme } from '../theme';
import { radii, spacing, typography } from '../theme';
import type { ChatMessage, Coordinates, UF } from '../types';

type ChatScreenProps = {
  theme: AppTheme;
  coords: Coordinates | null;
  uf: UF | null;
  messages: ChatMessage[];
  onChangeMessages: (updater: (current: ChatMessage[]) => ChatMessage[]) => void;
};

const suggestions = ['Qual é a unidade mais perto?', 'Mostrar unidades próximas'];

export function ChatScreen({ theme, coords, uf, messages, onChangeMessages }: ChatScreenProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const counter = useRef(0);
  const isInitial = messages.length === 1;
  const conversationMessages = isInitial ? [] : messages.slice(1);

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
      style={styles.screen}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.brandMark}>
            <Ionicons
              name="medical-outline"
              size={18}
              color={theme.isDark ? theme.colors.background : '#FFFFFF'}
            />
          </View>
          <View>
            <Text style={styles.title}>Assistente</Text>
            <Text style={styles.subtitle}>UPA Agora</Text>
          </View>
        </View>

        <View style={styles.contextBadge}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.contextText}>{uf?.sigla ?? 'sem estado'}</Text>
        </View>
      </View>

      {isInitial ? (
        <View style={styles.initialContent}>
          <View style={styles.initialMark}>
            <Ionicons name="chatbubble-ellipses-outline" size={30} color={theme.colors.text} />
          </View>
          <Text style={styles.initialTitle}>Como posso ajudar?</Text>
          <Text style={styles.initialText}>
            Pergunte pela unidade mais próxima. Endereço, telefone e distância vêm do cadastro
            oficial do CNES.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={styles.messages}
          data={conversationMessages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            const isEmergency = item.kind === 'emergency';

            return (
              <View
                accessibilityLabel={`${isUser ? 'Você' : 'Assistente'}: ${item.text}`}
                style={[
                  styles.message,
                  isUser ? styles.userMessage : styles.assistantMessage,
                  isEmergency && styles.emergencyMessage,
                ]}
              >
                {isEmergency && (
                  <View style={styles.emergencyHeader}>
                    <Ionicons name="alert-circle-outline" size={17} color={theme.colors.danger} />
                    <Text style={styles.emergencyLabel}>Atenção imediata</Text>
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
          ListFooterComponent={
            typing ? (
              <View accessibilityLiveRegion="polite" style={styles.typing}>
                <ActivityIndicator color={theme.colors.accent} size="small" />
                <Text style={styles.typingText}>Consultando...</Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {isInitial && (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityLabel={suggestion}
              accessibilityRole="button"
              disabled={typing}
              onPress={() => send(suggestion)}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressedSurface]}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
              <Ionicons name="arrow-forward" size={17} color={theme.colors.text} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.composerOuter}>
        <View style={styles.composer}>
          <TextInput
            accessibilityHint="Digite uma pergunta sobre unidades de pronto atendimento"
            accessibilityLabel="Mensagem para o assistente"
            editable={!typing}
            maxLength={500}
            multiline
            onChangeText={setInput}
            placeholder="Como posso ajudar você?"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            textAlignVertical="center"
            value={input}
          />
          <Pressable
            accessibilityLabel="Enviar mensagem"
            accessibilityRole="button"
            accessibilityState={{ disabled: !input.trim() || typing }}
            disabled={!input.trim() || typing}
            onPress={() => send()}
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || typing) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={21}
              color={theme.isDark ? theme.colors.background : '#FFFFFF'}
            />
          </Pressable>
        </View>
        <Text style={styles.composerHint}>Em risco de vida, ligue 192.</Text>
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      maxWidth: 600,
      minHeight: 72,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    headerTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    brandMark: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.md,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    title: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 15,
      lineHeight: 18,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 11,
      lineHeight: 14,
    },
    contextBadge: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.pill,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 5,
      minHeight: 40,
      paddingHorizontal: 12,
    },
    contextText: {
      color: theme.colors.textMuted,
      fontFamily: typography.medium,
      fontSize: 12,
    },
    initialContent: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    initialMark: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: radii.lg,
      height: 64,
      justifyContent: 'center',
      marginBottom: spacing.lg,
      width: 64,
    },
    initialTitle: {
      color: theme.colors.text,
      fontFamily: typography.display,
      fontSize: 34,
      letterSpacing: -0.7,
      lineHeight: 41,
      textAlign: 'center',
    },
    initialText: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 22,
      marginTop: 10,
      maxWidth: 420,
      textAlign: 'center',
    },
    messages: {
      alignSelf: 'center',
      flexGrow: 1,
      maxWidth: 600,
      padding: spacing.md,
      width: '100%',
    },
    message: {
      borderRadius: radii.lg,
      marginBottom: 12,
      maxWidth: '88%',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    assistantMessage: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.surfaceRaised,
    },
    emergencyMessage: {
      backgroundColor: theme.colors.warningSoft,
      borderColor: theme.colors.danger,
      maxWidth: '94%',
    },
    emergencyHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      marginBottom: 6,
    },
    emergencyLabel: {
      color: theme.colors.danger,
      fontFamily: typography.bold,
      fontSize: 12,
      letterSpacing: 0.3,
    },
    messageText: {
      color: theme.colors.text,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 22,
    },
    userMessageText: { color: theme.colors.text },
    emergencyText: { color: theme.isDark ? theme.colors.text : '#6F2621' },
    typing: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingVertical: spacing.sm,
    },
    typingText: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
    },
    suggestions: {
      alignSelf: 'center',
      gap: spacing.sm,
      maxWidth: 600,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    suggestion: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 52,
      paddingHorizontal: 14,
    },
    suggestionText: {
      color: theme.colors.text,
      flex: 1,
      fontFamily: typography.medium,
      fontSize: 13,
    },
    composerOuter: {
      alignSelf: 'center',
      maxWidth: 600,
      padding: 12,
      width: '100%',
    },
    composer: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 68,
      padding: 9,
    },
    input: {
      color: theme.colors.text,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 21,
      maxHeight: 112,
      minHeight: 48,
      paddingHorizontal: 7,
      paddingVertical: 9,
    },
    sendButton: {
      alignItems: 'center',
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.pill,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    composerHint: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 11,
      marginTop: 6,
      textAlign: 'center',
    },
    disabled: { opacity: 0.32 },
    pressed: { opacity: 0.62 },
    pressedSurface: { backgroundColor: theme.colors.surfaceRaised },
  });
