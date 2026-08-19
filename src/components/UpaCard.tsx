import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';
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

export function UpaCard({ upa, theme }: UpaCardProps) {
  const styles = createStyles(theme);
  const approximate = upa.locationPrecision === 'aproximada';

  const distanceLabel =
    upa.distanceKm === null || upa.distanceKm === undefined
      ? null
      : approximate
        ? 'local impreciso'
        : formatDistance(upa.distanceKm);

  return (
    <View
      accessible
      accessibilityLabel={[
        upa.name,
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
          <Text style={[styles.distance, approximate && styles.distanceWarning]}>
            {distanceLabel}
          </Text>
        )}
      </View>

      <Text style={styles.address}>
        {upa.address} — {upa.neighborhood}
      </Text>

      {upa.openingHours && <Text style={styles.hours}>{upa.openingHours}</Text>}

      {approximate && (
        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={14} color={theme.colors.warning} />
          <Text style={styles.warningText}>
            O CNES cadastrou esta unidade sem a coordenada exata. Confira o endereço antes de ir.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Traçar rota até ${upa.name}`}
          accessibilityRole="button"
          onPress={() => openRoute(upa)}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons name="navigate-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.actionText}>Rota</Text>
        </Pressable>

        {upa.phone && (
          <Pressable
            accessibilityLabel={`Ligar para ${upa.name}`}
            accessibilityRole="button"
            onPress={() => callUnit(upa.phone as string)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Ionicons name="call-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>{upa.phone}</Text>
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
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
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
      fontSize: 16,
    },
    distance: {
      color: theme.colors.primary,
      fontFamily: typography.bold,
      fontSize: 15,
    },
    distanceWarning: {
      color: theme.colors.warning,
      fontFamily: typography.regular,
      fontSize: 13,
    },
    address: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 3,
    },
    hours: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      marginTop: 2,
    },
    warning: {
      alignItems: 'flex-start',
      backgroundColor: theme.colors.warningSoft,
      borderRadius: 6,
      flexDirection: 'row',
      gap: 6,
      marginTop: spacing.sm,
      padding: 8,
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
      marginTop: spacing.sm,
    },
    action: {
      alignItems: 'center',
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 12,
    },
    actionText: {
      color: theme.colors.primary,
      fontFamily: typography.regular,
      fontSize: 13,
    },
    pressed: { opacity: 0.6 },
  });
