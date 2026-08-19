import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { UpaCard } from '../components/UpaCard';
import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';
import type { LoadStatus, UF, Upa } from '../types';

type HomeScreenProps = {
  upas: Upa[];
  status: LoadStatus;
  uf: UF | null;
  city: string | null;
  refreshing: boolean;
  theme: AppTheme;
  onOpenChat: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onChangeUf: () => void;
};

type EmptyState = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

const emptyStates: Record<string, EmptyState> = {
  'permission-denied': {
    icon: 'location-outline',
    title: 'Permissão de localização negada',
    body: 'Sem a localização não dá para calcular qual unidade está mais perto. Você pode liberar o acesso ou escolher o estado manualmente.',
  },
  'location-unavailable': {
    icon: 'compass-outline',
    title: 'Não consegui obter sua localização',
    body: 'Verifique se o GPS está ligado. Você também pode escolher o estado manualmente e ver as unidades cadastradas.',
  },
  'uf-unknown': {
    icon: 'map-outline',
    title: 'Escolha o seu estado',
    body: 'Consegui a sua posição, mas não o estado correspondente — isso acontece no navegador. Escolha o estado e a distância até cada unidade será calculada normalmente.',
  },
  offline: {
    icon: 'cloud-offline-outline',
    title: 'Servidor indisponível',
    body: 'Não foi possível consultar o cadastro do Ministério da Saúde. Os dados são reais e vêm do CNES, por isso o app não inventa unidades quando está sem conexão.',
  },
};

export function HomeScreen({
  upas,
  status,
  uf,
  city,
  refreshing,
  theme,
  onOpenChat,
  onRefresh,
  onRetry,
  onChangeUf,
}: HomeScreenProps) {
  const styles = createStyles(theme);
  const busy = status.state === 'locating' || status.state === 'loading';
  const empty = emptyStates[status.state];

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
          <Pressable
            accessibilityLabel="Trocar estado"
            accessibilityRole="button"
            onPress={onChangeUf}
            style={({ pressed }) => [styles.ufButton, pressed && styles.pressed]}
          >
            <Ionicons name="location-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.ufText}>{uf?.sigla ?? 'Estado'}</Text>
          </Pressable>
        </View>

        <Text style={styles.heading}>Pronto atendimento perto de você</Text>
        <Text style={styles.description}>
          {city
            ? `Unidades reais cadastradas no CNES, ordenadas a partir de ${city}.`
            : 'Unidades reais cadastradas no CNES (Ministério da Saúde).'}
        </Text>

        {busy && (
          <View style={styles.center}>
            <ActivityIndicator
              accessibilityLabel={
                status.state === 'locating' ? 'Obtendo localização' : 'Carregando unidades'
              }
              color={theme.colors.primary}
            />
            <Text style={styles.centerText}>
              {status.state === 'locating' ? 'Obtendo sua localização...' : 'Consultando o CNES...'}
            </Text>
          </View>
        )}

        {!busy && empty && (
          <View style={styles.empty}>
            <Ionicons name={empty.icon} size={26} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>{empty.title}</Text>
            <Text style={styles.emptyBody}>{empty.body}</Text>
            <View style={styles.emptyActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
              >
                <Text style={styles.buttonText}>Tentar novamente</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onChangeUf}
                style={({ pressed }) => [styles.inlineSecondary, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryButtonText}>Escolher estado</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!busy && status.state === 'error' && (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={26} color={theme.colors.danger} />
            <Text style={styles.emptyTitle}>Algo deu errado</Text>
            <Text style={styles.emptyBody}>{status.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
            >
              <Text style={styles.buttonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}

        {!busy && status.state === 'ready' && upas.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={26} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma unidade num raio de 60 km</Text>
            <Text style={styles.emptyBody}>
              Confirme se o estado selecionado corresponde a onde você está.
            </Text>
          </View>
        )}

        {!busy && upas.length > 0 && (
          <>
            <View style={styles.waitNotice}>
              <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.waitNoticeText}>
                Tempo de fila não é exibido: não existe fonte pública nacional em tempo real. As
                distâncias são em linha reta, não pelo trajeto de carro.
              </Text>
            </View>

            <View style={styles.list}>
              {upas.map((upa) => (
                <UpaCard key={upa.id} upa={upa} theme={theme} />
              ))}
            </View>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir o assistente"
          onPress={onOpenChat}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Abrir o assistente</Text>
        </Pressable>

        <Text style={styles.notice}>
          Em caso de emergência com risco de vida, ligue 192 (SAMU) e não escolha a unidade pela
          distância.
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
    ufButton: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 5,
      minHeight: 40,
      paddingHorizontal: 12,
    },
    ufText: {
      color: theme.colors.primary,
      fontFamily: typography.bold,
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
    center: { alignItems: 'center', gap: spacing.sm, marginVertical: 48 },
    centerText: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
    },
    empty: {
      alignItems: 'flex-start',
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: spacing.sm,
      marginTop: spacing.lg,
      padding: spacing.md,
    },
    emptyTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 16,
    },
    emptyBody: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 21,
    },
    emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    waitNotice: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 6,
      marginTop: spacing.lg,
    },
    waitNoticeText: {
      color: theme.colors.textMuted,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 18,
    },
    list: { marginTop: spacing.md },
    button: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: 8,
      justifyContent: 'center',
      marginTop: spacing.lg,
      minHeight: 50,
      paddingHorizontal: spacing.md,
    },
    inlineButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: 8,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.md,
    },
    inlineSecondary: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.md,
    },
    buttonText: {
      color: theme.isDark ? '#102018' : '#FFFFFF',
      fontFamily: typography.bold,
      fontSize: 15,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontFamily: typography.bold,
      fontSize: 15,
    },
    pressed: { opacity: 0.7 },
    notice: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 18,
      marginTop: spacing.md,
    },
  });
