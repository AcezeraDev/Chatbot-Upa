import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
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

const suggestions = ['Qual UPA eu alcanço mais rápido de carro?'];

export function ChatScreen({ theme, coords, uf, messages, onChangeMessages }: ChatScreenProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [routeErrorFor, setRouteErrorFor] = useState<string | null>(null);
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
          routeUrl: result.routeUrl,
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

  const openRoute = async (messageId: string, routeUrl: string) => {
    setRouteErrorFor(null);
    try {
      const supported = await Linking.canOpenURL(routeUrl);
      if (!supported) throw new Error('link não suportado');
      await Linking.openURL(routeUrl);
    } catch {
      setRouteErrorFor(messageId);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Assistente</Text>
        <Text style={styles.contextText}>{uf?.sigla ?? 'Sem estado'}</Text>
      </View>

      {isInitial ? (
        <View style={styles.initialContent}>
          <Text style={styles.initialTitle}>Como posso ajudar?</Text>
          <Text style={styles.initialText}>
            Pergunte pela unidade mais próxima ou pelo tempo de trajeto.
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
                {!isUser && item.routeUrl && (
                  <Pressable
                    accessibilityHint="Abre a rota recomendada fora do UPA Agora"
                    accessibilityLabel="Abrir rota recomendada no Google Maps"
                    accessibilityRole="link"
                    onPress={() => openRoute(item.id, item.routeUrl!)}
                    style={({ pressed }) => [
                      styles.routeButton,
                      pressed && styles.pressedSurface,
                    ]}
                  >
                    <Ionicons
                      name="navigate-outline"
                      size={17}
                      color={theme.colors.accent}
                    />
                    <Text style={styles.routeButtonText}>Abrir no Google Maps</Text>
                    <Ionicons
                      name="open-outline"
                      size={15}
                      color={theme.colors.textMuted}
                    />
                  </Pressable>
                )}
                {routeErrorFor === item.id && (
                  <Text accessibilityLiveRegion="polite" style={styles.routeError}>
                    Não foi possível abrir o mapa neste dispositivo.
                  </Text>
                )}
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
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
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
            placeholder="Digite sua pergunta"
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
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      maxWidth: 600,
      minHeight: 64,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    title: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 19,
      lineHeight: 24,
    },
    contextText: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
    },
    initialContent: {
      alignItems: 'flex-start',
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    initialTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 26,
      letterSpacing: -0.5,
      lineHeight: 33,
    },
    initialText: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 22,
      marginTop: 10,
      maxWidth: 380,
    },
    messages: {
      alignSelf: 'center',
      flexGrow: 1,
      maxWidth: 600,
      padding: spacing.md,
      width: '100%',
    },
    message: {
      borderRadius: radii.md,
      marginBottom: 12,
      maxWidth: '88%',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    assistantMessage: {
      alignSelf: 'flex-start',
      paddingLeft: 0,
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
    routeButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderColor: theme.colors.border,
      borderRadius: radii.sm,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 7,
      marginTop: 10,
      minHeight: 42,
      paddingHorizontal: 11,
    },
    routeButtonText: {
      color: theme.colors.text,
      fontFamily: typography.medium,
      fontSize: 13,
    },
    routeError: {
      color: theme.colors.danger,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 6,
    },
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
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 48,
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
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      maxWidth: 600,
      padding: 10,
      width: '100%',
    },
    composer: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 56,
      padding: 5,
    },
    input: {
      color: theme.colors.text,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 21,
      maxHeight: 112,
      minHeight: 48,
      paddingHorizontal: 9,
      paddingVertical: 7,
    },
    sendButton: {
      alignItems: 'center',
      alignSelf: 'flex-end',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.md,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    composerHint: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      marginTop: 6,
      textAlign: 'center',
    },
    disabled: { opacity: 0.32 },
    pressed: { opacity: 0.62 },
    pressedSurface: { backgroundColor: theme.colors.surfaceRaised },
  });
