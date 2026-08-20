import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { radii, spacing, typography } from '../theme';
import type { Upa } from '../types';

type UpaCardProps = {
  upa: Upa;
  theme: AppTheme;
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
  if (upa.openNow === false) {
    return { text: 'Fechada agora', tone: 'closed' };
  }
  return { text: 'Horário a confirmar', tone: 'unknown' };
};

export function UpaCard({ upa, theme }: UpaCardProps) {
  const styles = createStyles(theme);
  const approximate = upa.locationPrecision === 'aproximada';
  const opening = getOpeningLabel(upa);

  const distanceLabel =
    upa.distanceKm === null || upa.distanceKm === undefined
      ? null
      : approximate
        ? 'Local impreciso'
        : formatDistance(upa.distanceKm);

  return (
    <View
      accessible
      accessibilityLabel={[
        upa.name,
        opening.text,
        `${upa.address}, ${upa.neighborhood}`,
        distanceLabel && !approximate ? `a ${distanceLabel} em linha reta` : null,
        approximate ? 'endereço cadastrado de forma imprecisa no CNES' : null,
      ]
        .filter(Boolean)
        .join('. ')}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name}>{upa.name}</Text>
        {distanceLabel && (
          <View style={[styles.distanceBadge, approximate && styles.distanceBadgeWarning]}>
            <Text style={[styles.distance, approximate && styles.distanceWarning]}>
              {distanceLabel}
            </Text>
          </View>
        )}
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
      </View>

      <Text style={styles.address}>
        {upa.address} — {upa.neighborhood}
      </Text>

      {upa.openingHours && (
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
          <Text numberOfLines={2} style={styles.detailText}>
            {formatOpeningHours(upa.openingHours)}
          </Text>
        </View>
      )}

      {upa.phone && (
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.detailText}>{upa.phone}</Text>
        </View>
      )}

      {approximate && (
        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
          <Text style={styles.warningText}>
            Coordenada imprecisa no CNES. Confira o endereço antes de ir.
          </Text>
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
            size={18}
            color={theme.isDark ? theme.colors.background : '#FFFFFF'}
          />
          <Text style={styles.primaryActionText}>Ver rota</Text>
        </Pressable>

        {upa.phone && (
          <Pressable
            accessibilityLabel={`Ligar para ${upa.name}`}
            accessibilityRole="button"
            onPress={() => callUnit(upa.phone!)}
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
          >
            <Ionicons name="call-outline" size={18} color={theme.colors.text} />
            <Text style={styles.secondaryActionText}>Ligar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginBottom: 12,
      padding: spacing.md,
    },
    headerRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    name: {
      color: theme.colors.text,
      flex: 1,
      fontFamily: typography.bold,
      fontSize: 17,
      lineHeight: 23,
    },
    distanceBadge: {
      backgroundColor: theme.colors.surfaceRaised,
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    distanceBadgeWarning: { backgroundColor: theme.colors.warningSoft },
    distance: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 12,
    },
    distanceWarning: { color: theme.colors.warning },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
    },
    statusDot: {
      backgroundColor: theme.colors.textMuted,
      borderRadius: radii.pill,
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
    address: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 12,
    },
    detailRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    detailText: {
      color: theme.colors.textMuted,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 13,
      lineHeight: 18,
    },
    warning: {
      alignItems: 'flex-start',
      backgroundColor: theme.colors.warningSoft,
      borderRadius: radii.md,
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      padding: 10,
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
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    primaryAction: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.md,
      flexDirection: 'row',
      gap: 7,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 16,
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
      flexDirection: 'row',
      gap: 7,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 16,
    },
    secondaryActionText: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 14,
    },
    pressed: { opacity: 0.62 },
  });
