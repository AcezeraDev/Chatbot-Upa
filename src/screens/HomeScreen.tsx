import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { UpaCard } from '../components/UpaCard';
import type { AppTheme } from '../theme';
import { radii, spacing, typography } from '../theme';
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
    title: 'Localização desativada',
    body: 'Libere o acesso para ordenar por distância ou escolha um estado para consultar a lista.',
  },
  'location-unavailable': {
    icon: 'compass-outline',
    title: 'Localização indisponível',
    body: 'Verifique se o GPS está ligado ou escolha um estado para continuar sem distância.',
  },
  'uf-unknown': {
    icon: 'map-outline',
    title: 'Escolha seu estado',
    body: 'Sua posição foi encontrada, mas precisamos da UF para consultar o cadastro correto.',
  },
  offline: {
    icon: 'cloud-offline-outline',
    title: 'Servidor indisponível',
    body: 'Não foi possível consultar o CNES agora. O app não cria unidades quando está offline.',
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
  const hasDistances = upas.some(
    (upa) => upa.distanceKm !== null && upa.distanceKm !== undefined,
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          colors={[theme.colors.accent]}
          onRefresh={onRefresh}
          refreshing={refreshing}
          tintColor={theme.colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons
                name="medical-outline"
                size={20}
                color={theme.isDark ? theme.colors.background : '#FFFFFF'}
              />
            </View>
            <View>
              <Text style={styles.brandName}>UPA</Text>
              <Text style={styles.brandSuffix}>agora</Text>
            </View>
          </View>

          <Pressable
            accessibilityHint="Abre a lista de estados"
            accessibilityLabel="Trocar estado"
            accessibilityRole="button"
            onPress={onChangeUf}
            style={({ pressed }) => [styles.ufButton, pressed && styles.pressedSurface]}
          >
            <Ionicons name="location-outline" size={17} color={theme.colors.text} />
            <Text style={styles.ufText}>{uf?.sigla ?? 'Estado'}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PRONTO ATENDIMENTO</Text>
          <Text style={styles.heading}>Cuidado perto de você.</Text>
          <Text style={styles.description}>
            {city
              ? `Unidades oficiais próximas de ${city}, ordenadas em linha reta.`
              : 'Encontre unidades reais do CNES e confirme o atendimento antes de sair.'}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Ligar 192 para o SAMU"
          accessibilityRole="button"
          onPress={() => Linking.openURL('tel:192').catch(() => undefined)}
          style={({ pressed }) => [styles.emergency, pressed && styles.pressedSurface]}
        >
          <View style={styles.emergencyIcon}>
            <Ionicons name="call-outline" size={18} color={theme.colors.danger} />
          </View>
          <View style={styles.emergencyCopy}>
            <Text style={styles.emergencyTitle}>Risco de vida? Ligue 192</Text>
            <Text style={styles.emergencyText}>SAMU — não escolha atendimento pela distância.</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.danger} />
        </Pressable>

        {busy && (
          <View style={styles.statePanel} accessibilityLiveRegion="polite">
            <ActivityIndicator
              accessibilityLabel={
                status.state === 'locating' ? 'Obtendo localização' : 'Carregando unidades'
              }
              color={theme.colors.accent}
            />
            <Text style={styles.stateTitle}>
              {status.state === 'locating' ? 'Encontrando você' : 'Consultando o CNES'}
            </Text>
            <Text style={styles.stateBody}>Isso pode levar alguns segundos.</Text>
          </View>
        )}

        {!busy && empty && (
          <View style={styles.statePanel}>
            <View style={styles.stateIcon}>
              <Ionicons name={empty.icon} size={22} color={theme.colors.text} />
            </View>
            <Text style={styles.stateTitle}>{empty.title}</Text>
            <Text style={styles.stateBody}>{empty.body}</Text>
            <View style={styles.stateActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={({ pressed }) => [styles.darkButton, pressed && styles.pressed]}
              >
                <Text style={styles.darkButtonText}>Tentar novamente</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onChangeUf}
                style={({ pressed }) => [styles.lightButton, pressed && styles.pressedSurface]}
              >
                <Text style={styles.lightButtonText}>Escolher estado</Text>
              </Pressable>
            </View>
          </View>
        )}

        {!busy && status.state === 'error' && (
          <View style={styles.statePanel}>
            <View style={styles.stateIcon}>
              <Ionicons name="alert-circle-outline" size={22} color={theme.colors.danger} />
            </View>
            <Text style={styles.stateTitle}>Não foi possível carregar</Text>
            <Text style={styles.stateBody}>{status.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [styles.darkButton, pressed && styles.pressed]}
            >
              <Text style={styles.darkButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}

        {!busy && status.state === 'ready' && upas.length === 0 && (
          <View style={styles.statePanel}>
            <View style={styles.stateIcon}>
              <Ionicons name="search-outline" size={22} color={theme.colors.text} />
            </View>
            <Text style={styles.stateTitle}>Nada encontrado em 60 km</Text>
            <Text style={styles.stateBody}>Confira o estado selecionado ou tente novamente.</Text>
          </View>
        )}

        {!busy && upas.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionLabel}>{hasDistances ? 'MAIS PRÓXIMAS' : 'NO ESTADO'}</Text>
                <Text style={styles.sectionTitle}>
                  {upas.length} {upas.length === 1 ? 'unidade' : 'unidades'}
                </Text>
              </View>
              <Text style={styles.sectionMeta}>{hasDistances ? 'até 60 km' : uf?.name ?? 'CNES'}</Text>
            </View>

            <View style={styles.dataNotice}>
              <Ionicons name="information-circle-outline" size={17} color={theme.colors.textMuted} />
              <Text style={styles.dataNoticeText}>
                Fila não informada. Distâncias em linha reta; horários podem exigir confirmação.
              </Text>
            </View>

            <View style={styles.list}>
              {upas.map((upa) => (
                <UpaCard key={upa.id} theme={theme} upa={upa} />
              ))}
            </View>
          </>
        )}

        <Pressable
          accessibilityLabel="Abrir o assistente"
          accessibilityRole="button"
          onPress={onOpenChat}
          style={({ pressed }) => [styles.assistantCard, pressed && styles.pressedSurface]}
        >
          <View style={styles.assistantIcon}>
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text} />
          </View>
          <View style={styles.assistantCopy}>
            <Text style={styles.assistantTitle}>Pergunte ao assistente</Text>
            <Text style={styles.assistantText}>Encontre a unidade mais próxima em uma conversa.</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.text} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollContent: { paddingBottom: spacing.xl },
    content: {
      alignSelf: 'center',
      maxWidth: 600,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 72,
    },
    brand: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    brandMark: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.md,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    brandName: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 14,
      letterSpacing: 1.1,
      lineHeight: 16,
    },
    brandSuffix: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 14,
    },
    ufButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 48,
      paddingHorizontal: 13,
    },
    ufText: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 13,
    },
    hero: { paddingBottom: spacing.xl, paddingTop: spacing.xl },
    eyebrow: {
      color: theme.colors.accent,
      fontFamily: typography.bold,
      fontSize: 11,
      letterSpacing: 1.5,
    },
    heading: {
      color: theme.colors.text,
      fontFamily: typography.display,
      fontSize: 40,
      letterSpacing: -1.2,
      lineHeight: 45,
      marginTop: 10,
      maxWidth: 420,
    },
    description: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 12,
      maxWidth: 470,
    },
    emergency: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      minHeight: 76,
      padding: 14,
    },
    emergencyIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.warningSoft,
      borderRadius: radii.md,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    emergencyCopy: { flex: 1 },
    emergencyTitle: {
      color: theme.colors.danger,
      fontFamily: typography.bold,
      fontSize: 14,
    },
    emergencyText: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    statePanel: {
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: 9,
      marginTop: spacing.md,
      padding: spacing.lg,
    },
    stateIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: radii.md,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    stateTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 17,
    },
    stateBody: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 21,
    },
    stateActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
    darkButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.md,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 16,
    },
    darkButtonText: {
      color: theme.isDark ? theme.colors.background : '#FFFFFF',
      fontFamily: typography.bold,
      fontSize: 14,
    },
    lightButton: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 16,
    },
    lightButtonText: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 14,
    },
    sectionHeader: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xl,
    },
    sectionLabel: {
      color: theme.colors.accent,
      fontFamily: typography.bold,
      fontSize: 10,
      letterSpacing: 1.4,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontFamily: typography.display,
      fontSize: 27,
      lineHeight: 33,
      marginTop: 2,
    },
    sectionMeta: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      marginBottom: 4,
    },
    dataNotice: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 7,
      marginTop: spacing.md,
    },
    dataNoticeText: {
      color: theme.colors.textMuted,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 18,
    },
    list: { marginTop: spacing.md },
    assistantCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      marginTop: spacing.md,
      minHeight: 80,
      padding: 14,
    },
    assistantIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: radii.md,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    assistantCopy: { flex: 1 },
    assistantTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 15,
    },
    assistantText: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    pressed: { opacity: 0.62 },
    pressedSurface: { backgroundColor: theme.colors.surfaceRaised },
  });
