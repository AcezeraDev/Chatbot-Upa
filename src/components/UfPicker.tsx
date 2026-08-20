import { Ionicons } from '@expo/vector-icons';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { radii, spacing, typography } from '../theme';
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
          <View accessibilityViewIsModal style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Escolha o estado</Text>
              </View>
              <Pressable
                accessibilityLabel="Fechar"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={21} color={theme.colors.text} />
              </Pressable>
            </View>

            <FlatList
              contentContainerStyle={styles.listContent}
              data={ufs}
              keyExtractor={(item) => item.sigla}
              renderItem={({ item }) => {
                const active = item.sigla === selected;
                return (
                  <Pressable
                    accessibilityLabel={`${item.name}, ${item.sigla}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => onSelect(item)}
                    style={({ pressed }) => [
                      styles.row,
                      active && styles.rowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.ufCode}>{item.sigla}</Text>
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.name}</Text>
                    {active && <Ionicons name="checkmark" size={20} color={theme.colors.accent} />}
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            />
          </View>
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
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '84%',
      overflow: 'hidden',
    },
    modalContent: {},
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      padding: spacing.md,
    },
    headerCopy: { flex: 1 },
    title: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 20,
      lineHeight: 27,
    },
    closeButton: {
      alignItems: 'center',
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    list: { flexGrow: 0 },
    listContent: { paddingBottom: spacing.md, paddingHorizontal: spacing.md },
    row: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: 12,
      minHeight: 52,
      paddingHorizontal: 4,
    },
    rowActive: { backgroundColor: theme.colors.accentSoft },
    ufCode: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 12,
      letterSpacing: 0.5,
      width: 32,
    },
    rowText: {
      color: theme.colors.text,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 15,
    },
    rowTextActive: { color: theme.colors.accent, fontFamily: typography.bold },
    pressed: { opacity: 0.58 },
  });
