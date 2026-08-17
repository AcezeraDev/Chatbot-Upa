import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { typography } from '../theme';

export type AppTab = 'home' | 'chat' | 'about';

type BottomNavProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
  theme: AppTheme;
};

const tabs: Array<{ id: AppTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Início', icon: 'home-outline' },
  { id: 'chat', label: 'Chat', icon: 'chatbubble-outline' },
  { id: 'about', label: 'Projeto', icon: 'information-circle-outline' },
];

export function BottomNav({ activeTab, onChange, theme }: BottomNavProps) {
  const styles = createStyles(theme);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityLabel={`Abrir ${tab.label}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.id)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={active ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.tabBar,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      flexDirection: 'row',
    },
    tab: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      minHeight: 58,
      paddingVertical: 6,
    },
    pressed: { opacity: 0.55 },
    label: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 12,
      marginTop: 3,
    },
    activeLabel: {
      color: theme.colors.primary,
      fontFamily: typography.bold,
    },
  });
