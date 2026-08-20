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
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>LOCALIZAÇÃO</Text>
                <Text style={styles.title}>Escolha o estado</Text>
                <Text style={styles.subtitle}>Usaremos a UF para consultar o cadastro correto.</Text>
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
                    <View style={styles.ufBadge}>
                      <Text style={styles.ufBadgeText}>{item.sigla}</Text>
                    </View>
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
      padding: 8,
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderRadius: radii.xl,
      maxHeight: '82%',
      overflow: 'hidden',
    },
    modalContent: { paddingTop: 8 },
    handle: {
      alignSelf: 'center',
      backgroundColor: theme.colors.border,
      borderRadius: radii.pill,
      height: 4,
      width: 40,
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerCopy: { flex: 1 },
    eyebrow: {
      color: theme.colors.accent,
      fontFamily: typography.bold,
      fontSize: 10,
      letterSpacing: 1.4,
    },
    title: {
      color: theme.colors.text,
      fontFamily: typography.display,
      fontSize: 28,
      lineHeight: 34,
      marginTop: 5,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    list: { flexGrow: 0 },
    listContent: { paddingBottom: spacing.md, paddingHorizontal: spacing.md },
    row: {
      alignItems: 'center',
      borderRadius: radii.md,
      flexDirection: 'row',
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 10,
    },
    rowActive: { backgroundColor: theme.colors.accentSoft },
    ufBadge: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.sm,
      borderWidth: 1,
      height: 36,
      justifyContent: 'center',
      width: 42,
    },
    ufBadgeText: {
      color: theme.colors.textMuted,
      fontFamily: typography.bold,
      fontSize: 11,
      letterSpacing: 0.5,
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
