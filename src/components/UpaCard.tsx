import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { radii, spacing, typography } from '../theme';
import type { Upa } from '../types';

type UpaCardProps = {
  upa: Upa;
  theme: AppTheme;
  first?: boolean;
  last?: boolean;
};

const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

const openRoute = (upa: Upa) => {
  const label = encodeURIComponent(upa.name);
  const url = Platform.select({
    ios: `maps://?daddr=${upa.latitude},${upa.longitude}&q=${label}`,
    android: `geo:${upa.latitude},${upa.longitude}?q=${upa.latitude},${upa.longitude}(${label})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${upa.latitude},${upa.longitude}`,
  });

  Linking.openURL(url).catch(() => {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${upa.latitude},${upa.longitude}`,
    ).catch(() => undefined);
  });
};

const callUnit = (phone: string) => {
  Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => undefined);
};

const formatOpeningHours = (openingHours: string): string =>
  openingHours.toLocaleLowerCase('pt-BR').includes('24 horas')
    ? 'Atendimento 24 horas'
    : openingHours;

const getOpeningLabel = (upa: Upa): { text: string; tone: 'open' | 'closed' | 'unknown' } => {
  if (upa.openNow === true) {
    return {
      text: upa.openingPrecision === 'estimada' ? 'Provavelmente aberta' : 'Aberta agora',
      tone: 'open',
    };
  }
  if (upa.openNow === false) return { text: 'Fechada agora', tone: 'closed' };
  return { text: 'Horário a confirmar', tone: 'unknown' };
};

export function UpaCard({ upa, theme, first = false, last = false }: UpaCardProps) {
  const styles = createStyles(theme);
  const approximate = upa.locationPrecision === 'aproximada';
  const opening = getOpeningLabel(upa);
  const distance =
    upa.distanceKm === null || upa.distanceKm === undefined || approximate
      ? null
      : formatDistance(upa.distanceKm);

  return (
    <View style={[styles.row, first && styles.firstRow, last && styles.lastRow]}>
      <View style={styles.header}>
        <Text style={styles.name}>{upa.name}</Text>
        {distance && <Text style={styles.distance}>{distance}</Text>}
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            opening.tone === 'open' && styles.statusDotOpen,
            opening.tone === 'closed' && styles.statusDotClosed,
          ]}
        />
        <Text
          style={[
            styles.statusText,
            opening.tone === 'open' && styles.statusTextOpen,
            opening.tone === 'closed' && styles.statusTextClosed,
          ]}
        >
          {opening.text}
        </Text>
        {distance && <Text style={styles.lineDistance}>· {distance} em linha reta</Text>}
      </View>

      <Text style={styles.address}>
        {upa.address} — {upa.neighborhood}
      </Text>

      {upa.openingHours && (
        <Text style={styles.detail}>
          {formatOpeningHours(upa.openingHours)}
        </Text>
      )}
      {upa.phone && <Text style={styles.detail}>{upa.phone}</Text>}

      {approximate && (
        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={15} color={theme.colors.warning} />
          <Text style={styles.warningText}>Localização imprecisa. Confira o endereço.</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Traçar rota até ${upa.name}`}
          accessibilityRole="button"
          onPress={() => openRoute(upa)}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
        >
          <Ionicons
            name="navigate-outline"
            size={17}
            color={theme.isDark ? theme.colors.background : '#FFFFFF'}
          />
          <Text style={styles.primaryActionText}>Rota</Text>
        </Pressable>

        {upa.phone && (
          <Pressable
            accessibilityLabel={`Ligar para ${upa.name}`}
            accessibilityRole="button"
            onPress={() => callUnit(upa.phone!)}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressedSurface]}
          >
            <Ionicons name="call-outline" size={17} color={theme.colors.text} />
            <Text style={styles.secondaryActionText}>Ligar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderTopWidth: 1,
      padding: spacing.md,
    },
    firstRow: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
    },
    lastRow: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      borderBottomLeftRadius: radii.lg,
      borderBottomRightRadius: radii.lg,
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    name: {
      color: theme.colors.text,
      flex: 1,
      fontFamily: typography.bold,
      fontSize: 16,
      lineHeight: 22,
    },
    distance: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 13,
      lineHeight: 20,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 7,
    },
    statusDot: {
      backgroundColor: theme.colors.textMuted,
      borderRadius: 4,
      height: 7,
      width: 7,
    },
    statusDotOpen: { backgroundColor: theme.colors.low },
    statusDotClosed: { backgroundColor: theme.colors.danger },
    statusText: {
      color: theme.colors.textMuted,
      fontFamily: typography.medium,
      fontSize: 12,
    },
    statusTextOpen: { color: theme.colors.low },
    statusTextClosed: { color: theme.colors.danger },
    lineDistance: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
    },
    address: {
      color: theme.colors.text,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    detail: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
    },
    warning: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      marginTop: 9,
    },
    warningText: {
      color: theme.colors.warning,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 12,
      lineHeight: 17,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 14,
    },
    primaryAction: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.md,
      flex: 1,
      flexDirection: 'row',
      gap: 7,
      justifyContent: 'center',
      minHeight: 48,
    },
    primaryActionText: {
      color: theme.isDark ? theme.colors.background : '#FFFFFF',
      fontFamily: typography.bold,
      fontSize: 14,
    },
    secondaryAction: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flex: 1,
      flexDirection: 'row',
      gap: 7,
      justifyContent: 'center',
      minHeight: 48,
    },
    secondaryActionText: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 14,
    },
    pressed: { opacity: 0.58 },
    pressedSurface: { backgroundColor: theme.colors.surfaceRaised },
  });
