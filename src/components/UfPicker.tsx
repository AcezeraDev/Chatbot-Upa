import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';
import type { UF } from '../types';

type UfPickerProps = {
  visible: boolean;
  ufs: UF[];
  selected: string | null;
  theme: AppTheme;
  onSelect: (uf: UF) => void;
  onClose: () => void;
};

export function UfPicker({ visible, ufs, selected, theme, onSelect, onClose }: UfPickerProps) {
  const styles = createStyles(theme);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Fechar seleção de estado" onPress={onClose} style={styles.scrim}>
        <Pressable onPress={() => undefined} style={styles.sheet}>
          <Text style={styles.title}>Escolha o estado</Text>
          <Text style={styles.subtitle}>
            Usado para buscar as unidades no cadastro do Ministério da Saúde.
          </Text>

          <FlatList
            data={ufs}
            keyExtractor={(item) => item.sigla}
            renderItem={({ item }) => {
              const active = item.sigla === selected;
              return (
                <Pressable
                  accessibilityLabel={item.name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>
                    {item.name} ({item.sigla})
                  </Text>
                </Pressable>
              );
            }}
            style={styles.list}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrim: {
      backgroundColor: theme.colors.scrim,
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      maxHeight: '75%',
      paddingTop: spacing.md,
    },
    title: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 18,
      paddingHorizontal: spacing.md,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
      lineHeight: 19,
      paddingBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: 4,
    },
    list: { flexGrow: 0 },
    row: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: spacing.md,
    },
    rowText: {
      color: theme.colors.text,
      fontFamily: typography.regular,
      fontSize: 15,
    },
    rowTextActive: {
      color: theme.colors.primary,
      fontFamily: typography.bold,
    },
    pressed: { opacity: 0.6 },
  });
