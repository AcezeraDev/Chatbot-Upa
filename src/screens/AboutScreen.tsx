import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';

type AboutScreenProps = {
  theme: AppTheme;
};

export function AboutScreen({ theme }: AboutScreenProps) {
  const styles = createStyles(theme);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Projeto</Text>
        </View>

        <Text style={styles.heading}>UPA Agora</Text>
        <Text style={styles.paragraph}>
          Protótipo acadêmico para consultar tempos fictícios de espera em UPAs.
        </Text>

        <Text style={styles.sectionTitle}>Como funciona</Text>
        <Text style={styles.item}>1. O aplicativo mostra as unidades.</Text>
        <Text style={styles.item}>2. O usuário faz uma pergunta no chat.</Text>
        <Text style={styles.item}>3. O backend devolve uma resposta demonstrativa.</Text>

        <Text style={styles.sectionTitle}>Tecnologias</Text>
        <Text style={styles.paragraph}>React Native, Expo, TypeScript, Python e FastAPI.</Text>

        <Text style={styles.sectionTitle}>Limites desta versão</Text>
        <Text style={styles.paragraph}>
          Não utiliza dados reais, geolocalização, PostgreSQL ou inteligência artificial.
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollContent: { paddingBottom: spacing.lg },
    content: {
      alignSelf: 'center',
      maxWidth: 560,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    header: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      justifyContent: 'center',
      minHeight: 64,
    },
    title: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 21,
    },
    heading: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 24,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 16,
      marginTop: spacing.lg,
    },
    paragraph: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 23,
      marginTop: spacing.sm,
    },
    item: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 23,
      marginTop: spacing.sm,
    },
  });
