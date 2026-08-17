import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';
import type { QueueStatus, Upa } from '../types';

type UpaCardProps = {
  upa: Upa;
  theme: AppTheme;
};

const statusLabels: Record<QueueStatus, string> = {
  low: 'Baixa espera',
  moderate: 'Espera moderada',
  high: 'Espera elevada',
};

export function UpaCard({ upa, theme }: UpaCardProps) {
  const styles = createStyles(theme);
  const statusColor = theme.colors[upa.status];

  return (
    <View
      style={styles.row}
      accessibilityLabel={`${upa.name}, ${upa.waitMinutes} minutos de espera estimada, ${statusLabels[upa.status]}`}
    >
      <View style={styles.copy}>
        <Text style={styles.name}>{upa.name}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{statusLabels[upa.status]}</Text>
      </View>
      <View style={styles.wait}>
        <Text style={styles.waitNumber}>{upa.waitMinutes}</Text>
        <Text style={styles.waitUnit}>min</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      minHeight: 74,
      paddingHorizontal: spacing.md,
    },
    copy: { flex: 1 },
    name: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 16,
    },
    status: {
      fontFamily: typography.regular,
      fontSize: 13,
      marginTop: 4,
    },
    wait: {
      alignItems: 'baseline',
      flexDirection: 'row',
      gap: 4,
    },
    waitNumber: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 24,
    },
    waitUnit: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
    },
  });
