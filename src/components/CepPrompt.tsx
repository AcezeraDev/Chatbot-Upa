import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AppTheme } from '../theme';
import { radii, spacing, typography } from '../theme';

type CepPromptProps = {
  theme: AppTheme;
  busy: boolean;
  error: string | null;
  onSubmit: (cep: string) => void;
};

/** Formata enquanto se digita, sem impedir a digitação: 01310100 → 01310-100. */
const format = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
};

/**
 * Alternativa ao GPS na tela inicial.
 *
 * Sem localização, a única saída era escolher o estado e receber a lista do
 * cadastro sem nenhuma ordenação — em São Paulo, centenas de unidades numa
 * ordem que não ajuda ninguém. Um CEP devolve um ponto bom o bastante para
 * ordenar por proximidade, e quem nega a localização quase sempre sabe o seu.
 */
export function CepPrompt({ theme, busy, error, onSubmit }: CepPromptProps) {
  const styles = createStyles(theme);
  const [value, setValue] = useState('');
  const digits = value.replace(/\D/g, '');
  const ready = digits.length === 8 && !busy;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ou informe seu CEP</Text>

      <View style={styles.row}>
        <TextInput
          accessibilityLabel="CEP"
          autoComplete="postal-code"
          editable={!busy}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={9}
          onChangeText={(text) => setValue(format(text))}
          onSubmitEditing={() => ready && onSubmit(digits)}
          placeholder="00000-000"
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="search"
          style={styles.input}
          value={value}
        />

        <Pressable
          accessibilityLabel="Buscar unidades pelo CEP"
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={() => onSubmit(digits)}
          style={({ pressed }) => [
            styles.button,
            !ready && styles.buttonDisabled,
            pressed && ready && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.background} size="small" />
          ) : (
            <Ionicons name="search" size={18} color={theme.colors.background} />
          )}
        </Pressable>
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : (
        <Text style={styles.hint}>A distância fica aproximada pelo CEP.</Text>
      )}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { gap: 8, marginTop: spacing.md, width: '100%' },
    label: {
      color: theme.colors.text,
      fontFamily: typography.medium,
      fontSize: 14,
    },
    row: { flexDirection: 'row', gap: 8 },
    input: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      color: theme.colors.text,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 16,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      borderRadius: radii.md,
      justifyContent: 'center',
      minHeight: 48,
      width: 52,
    },
    buttonDisabled: { opacity: 0.45 },
    pressed: { opacity: 0.85 },
    hint: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 17,
    },
    error: {
      color: theme.colors.danger,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 17,
    },
  });
