import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CepPrompt } from '../components/CepPrompt';
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
  onRefresh: () => void;
  onRetry: () => void;
  onChangeUf: () => void;
  onSubmitCep: (cep: string) => void;
  cepBusy: boolean;
  cepError: string | null;
};

type EmptyState = {
  title: string;
  body: string;
};

const emptyStates: Record<string, EmptyState> = {
  'permission-denied': {
    title: 'Localização desativada',
    body: 'Ative a localização ou escolha um estado para continuar.',
  },
  'location-unavailable': {
    title: 'Localização indisponível',
    body: 'Verifique o GPS ou escolha um estado para consultar as unidades.',
  },
  'uf-unknown': {
    title: 'Escolha seu estado',
    body: 'Encontramos sua posição, mas ainda precisamos saber a UF.',
  },
  'cep-not-found': {
    title: 'CEP não encontrado',
    body: 'Confira os oito dígitos ou escolha um estado para continuar.',
  },
  offline: {
    title: 'Servidor indisponível',
    body: 'Não foi possível consultar o CNES agora.',
  },
};

export function HomeScreen({
  upas,
  status,
  uf,
  city,
  refreshing,
  theme,
  onRefresh,
  onRetry,
  onChangeUf,
  onSubmitCep,
  cepBusy,
  cepError,
}: HomeScreenProps) {
  const styles = createStyles(theme);
  const busy = status.state === 'locating' || status.state === 'loading';
  const empty = emptyStates[status.state];
  // O CEP substitui a localização; não tem o que resolver quando o problema
  // é o servidor fora do ar.
  const offersCep =
    status.state === 'permission-denied' ||
    status.state === 'location-unavailable' ||
    status.state === 'uf-unknown' ||
    status.state === 'cep-not-found';
  const visibleUpas = busy ? [] : upas;
  const hasDistances = visibleUpas.some(
    (upa) => upa.distanceKm !== null && upa.distanceKm !== undefined,
  );

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={visibleUpas}
      keyExtractor={(item) => item.id}
      ListFooterComponent={<View style={styles.footer} />}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.brand}>UPA Agora</Text>
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

          <View style={styles.intro}>
            <Text style={styles.heading}>Pronto atendimento perto de você</Text>
            <Text style={styles.description}>
              {city
                ? `${city} · distância em linha reta`
                : 'Unidades oficiais do cadastro CNES'}
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Ligar 192 para o SAMU"
            accessibilityRole="button"
            onPress={() => Linking.openURL('tel:192').catch(() => undefined)}
            style={({ pressed }) => [styles.emergency, pressed && styles.pressedSurface]}
          >
            <Ionicons name="call-outline" size={19} color={theme.colors.danger} />
            <Text style={styles.emergencyText}>Risco de vida? Ligue 192</Text>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.danger} />
          </Pressable>

          {busy && (
            <View style={styles.statePanel} accessibilityLiveRegion="polite">
              <ActivityIndicator color={theme.colors.accent} />
              <View style={styles.stateCopy}>
                <Text style={styles.stateTitle}>
                  {status.state === 'locating' ? 'Obtendo localização' : 'Carregando unidades'}
                </Text>
                <Text style={styles.stateBody}>Aguarde um instante.</Text>
              </View>
            </View>
          )}

          {!busy && empty && (
            <View style={styles.statePanelColumn}>
              <Text style={styles.stateTitle}>{empty.title}</Text>
              <Text style={styles.stateBody}>{empty.body}</Text>
              <View style={styles.stateActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onRetry}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryButtonText}>Tentar novamente</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={onChangeUf}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressedSurface,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Escolher estado</Text>
                </Pressable>
              </View>

              {offersCep && (
                <CepPrompt
                  busy={cepBusy}
                  error={cepError}
                  onSubmit={onSubmitCep}
                  theme={theme}
                />
              )}
            </View>
          )}

          {!busy && status.state === 'error' && (
            <View style={styles.statePanelColumn}>
              <Text style={styles.stateTitle}>Não foi possível carregar</Text>
              <Text style={styles.stateBody}>{status.message}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Tentar novamente</Text>
              </Pressable>
            </View>
          )}

          {!busy && status.state === 'ready' && visibleUpas.length === 0 && (
            <View style={styles.statePanelColumn}>
              <Text style={styles.stateTitle}>Nenhuma unidade encontrada</Text>
              <Text style={styles.stateBody}>Confira o estado selecionado ou tente novamente.</Text>
            </View>
          )}

          {!busy && visibleUpas.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {hasDistances ? 'Unidades próximas' : `Unidades em ${uf?.sigla ?? 'seu estado'}`}
              </Text>
              <Text style={styles.sectionMeta}>
                {visibleUpas.length} {visibleUpas.length === 1 ? 'resultado' : 'resultados'} · fila
                não informada
              </Text>
            </View>
          )}
        </View>
      }
      refreshControl={
        <RefreshControl
          colors={[theme.colors.accent]}
          onRefresh={onRefresh}
          refreshing={refreshing}
          tintColor={theme.colors.accent}
        />
      }
      renderItem={({ item, index }) => (
        <UpaCard
          first={index === 0}
          last={index === visibleUpas.length - 1}
          theme={theme}
          upa={item}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: {
      alignSelf: 'center',
      maxWidth: 600,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    footer: { height: spacing.lg },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 64,
    },
    brand: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 19,
      letterSpacing: -0.3,
    },
    ufButton: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 48,
      paddingHorizontal: 12,
    },
    ufText: {
      color: theme.colors.text,
      fontFamily: typography.medium,
      fontSize: 13,
    },
    intro: { paddingBottom: spacing.lg, paddingTop: spacing.lg },
    heading: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 27,
      letterSpacing: -0.7,
      lineHeight: 33,
      maxWidth: 430,
    },
    description: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 7,
    },
    emergency: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderTopColor: theme.colors.border,
      borderBottomWidth: 1,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 10,
      minHeight: 54,
      paddingHorizontal: 4,
    },
    emergencyText: {
      color: theme.colors.danger,
      flex: 1,
      fontFamily: typography.bold,
      fontSize: 14,
    },
    statePanel: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      marginTop: spacing.lg,
      padding: spacing.md,
    },
    statePanelColumn: {
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      gap: 7,
      marginTop: spacing.lg,
      padding: spacing.md,
    },
    stateCopy: { flex: 1 },
    stateTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 16,
      lineHeight: 21,
    },
    stateBody: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 20,
    },
    stateActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 5 },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.md,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 15,
    },
    primaryButtonText: {
      color: theme.isDark ? theme.colors.background : '#FFFFFF',
      fontFamily: typography.bold,
      fontSize: 14,
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 15,
    },
    secondaryButtonText: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 14,
    },
    sectionHeader: { paddingBottom: 12, paddingTop: spacing.lg },
    sectionTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 18,
      lineHeight: 24,
    },
    sectionMeta: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 2,
    },
    pressed: { opacity: 0.58 },
    pressedSurface: { backgroundColor: theme.colors.surfaceRaised },
  });
