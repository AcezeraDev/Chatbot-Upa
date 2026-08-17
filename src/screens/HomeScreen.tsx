import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UpaCard } from '../components/UpaCard';
import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';
import type { DataSource, Upa } from '../types';

type HomeScreenProps = {
  upas: Upa[];
  source: DataSource;
  loading: boolean;
  refreshing: boolean;
  theme: AppTheme;
  onOpenChat: () => void;
  onRefresh: () => void;
};

export function HomeScreen({
  upas,
  source,
  loading,
  refreshing,
  theme,
  onOpenChat,
  onRefresh,
}: HomeScreenProps) {
  const styles = createStyles(theme);
  const orderedUpas = [...upas].sort((a, b) => a.waitMinutes - b.waitMinutes);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>UPA Agora</Text>
          <Text style={styles.mode}>{source === 'api' ? 'API ativa' : 'Demonstração'}</Text>
        </View>

        <Text style={styles.heading}>Tempo de espera</Text>
        <Text style={styles.description}>Valores fictícios para apresentação do projeto.</Text>

        {loading ? (
          <ActivityIndicator accessibilityLabel="Carregando unidades" color={theme.colors.primary} style={styles.loading} />
        ) : (
          <View style={styles.list}>
            {orderedUpas.map((upa) => (
              <UpaCard key={upa.id} upa={upa} theme={theme} />
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir o assistente"
          onPress={onOpenChat}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Abrir o assistente</Text>
        </Pressable>

        <Text style={styles.notice}>
          Em uma emergência grave, procure atendimento imediato pelos canais oficiais.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollContent: { paddingBottom: spacing.lg },
    content: {
      alignSelf: 'center',
      maxWidth: 560,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    header: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 64,
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
    heading: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 24,
      marginTop: spacing.lg,
    },
    description: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 4,
    },
    loading: { marginVertical: 48 },
    list: { marginTop: spacing.lg },
    button: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: 8,
      justifyContent: 'center',
      marginTop: spacing.lg,
      minHeight: 50,
      paddingHorizontal: spacing.md,
    },
    buttonPressed: { opacity: 0.7 },
    buttonText: {
      color: theme.isDark ? '#102018' : '#FFFFFF',
      fontFamily: typography.bold,
      fontSize: 15,
    },
    notice: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 18,
      marginTop: spacing.md,
    },
  });
