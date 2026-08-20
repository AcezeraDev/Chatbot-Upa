import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { radii, spacing, typography } from '../theme';

type AboutScreenProps = {
  theme: AppTheme;
};

const CNES_URL = 'https://apidadosabertos.saude.gov.br/v1/';

export function AboutScreen({ theme }: AboutScreenProps) {
  const styles = createStyles(theme);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Ionicons
              name="information-outline"
              size={20}
              color={theme.isDark ? theme.colors.background : '#FFFFFF'}
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>Projeto</Text>
            <Text style={styles.headerSubtitle}>Como o UPA Agora funciona</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>SOBRE O APP</Text>
          <Text style={styles.heading}>Dados reais. Sem promessas vazias.</Text>
          <Text style={styles.lead}>
            O UPA Agora encontra pronto atendimento com informação oficial e deixa claro tudo o
            que não pode confirmar.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionNumber}>01</Text>
          <Text style={styles.sectionTitle}>Fonte oficial</Text>
          <Text style={styles.paragraph}>
            Nome, endereço, telefone, horário e coordenadas vêm do CNES, o Cadastro Nacional de
            Estabelecimentos de Saúde.
          </Text>
          <Pressable
            accessibilityHint="Abre o portal de dados do Ministério da Saúde"
            accessibilityLabel="Ver a fonte oficial do CNES"
            accessibilityRole="link"
            onPress={() => Linking.openURL(CNES_URL).catch(() => undefined)}
            style={({ pressed }) => [styles.link, pressed && styles.pressedSurface]}
          >
            <Text style={styles.linkText}>Abrir fonte oficial</Text>
            <Ionicons name="open-outline" size={17} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionNumber}>02</Text>
          <Text style={styles.sectionTitle}>Escolhas responsáveis</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>
                Tempo de fila não é mostrado porque não existe uma fonte pública nacional em tempo
                real.
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>
                A distância é em linha reta e pode ser diferente do trajeto pelas ruas.
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>
                Coordenadas suspeitas recebem um aviso para você conferir o endereço.
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>
                Horários estimados são apresentados como estimativa, nunca como certeza.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionNumber}>03</Text>
          <Text style={styles.sectionTitle}>Assistente com limites</Text>
          <Text style={styles.paragraph}>
            A triagem de emergência é sempre determinística. Quando a IA generativa está ativada,
            ela só pode citar unidades recuperadas do CNES; se falhar, o app volta para regras
            fixas.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionNumber}>04</Text>
          <Text style={styles.sectionTitle}>Privacidade simples</Text>
          <Text style={styles.paragraph}>
            A localização serve apenas para calcular distâncias. Ela não é armazenada, e o estado
            é identificado pelo próprio aparelho.
          </Text>
        </View>

        <View style={styles.technology}>
          <Text style={styles.technologyLabel}>CONSTRUÍDO COM</Text>
          <Text style={styles.technologyText}>React Native · Expo · TypeScript · FastAPI · CNES</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollContent: { paddingBottom: spacing.xl },
    content: {
      alignSelf: 'center',
      maxWidth: 600,
      paddingHorizontal: spacing.md,
      width: '100%',
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      minHeight: 72,
    },
    brandMark: {
      alignItems: 'center',
      backgroundColor: theme.colors.primaryStrong,
      borderRadius: radii.md,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    headerTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 15,
      lineHeight: 18,
    },
    headerSubtitle: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 11,
      lineHeight: 14,
    },
    hero: { paddingBottom: spacing.xl, paddingTop: spacing.xl },
    eyebrow: {
      color: theme.colors.accent,
      fontFamily: typography.bold,
      fontSize: 11,
      letterSpacing: 1.5,
    },
    heading: {
      color: theme.colors.text,
      fontFamily: typography.display,
      fontSize: 38,
      letterSpacing: -1,
      lineHeight: 44,
      marginTop: 10,
      maxWidth: 500,
    },
    lead: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 14,
      maxWidth: 500,
    },
    section: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingVertical: spacing.lg,
    },
    sectionNumber: {
      color: theme.colors.accent,
      fontFamily: typography.bold,
      fontSize: 11,
      letterSpacing: 1,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontFamily: typography.display,
      fontSize: 25,
      lineHeight: 31,
      marginTop: 6,
    },
    paragraph: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 10,
      maxWidth: 520,
    },
    link: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      marginTop: spacing.md,
      minHeight: 48,
      paddingHorizontal: 14,
    },
    linkText: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 14,
    },
    bulletList: { gap: 12, marginTop: spacing.md },
    bulletRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
    bullet: {
      backgroundColor: theme.colors.accent,
      borderRadius: radii.pill,
      height: 6,
      marginTop: 8,
      width: 6,
    },
    bulletText: {
      color: theme.colors.textMuted,
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 22,
    },
    technology: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      marginTop: spacing.md,
      padding: spacing.lg,
    },
    technologyLabel: {
      color: theme.colors.accent,
      fontFamily: typography.bold,
      fontSize: 10,
      letterSpacing: 1.4,
    },
    technologyText: {
      color: theme.colors.text,
      fontFamily: typography.medium,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
    },
    pressedSurface: { backgroundColor: theme.colors.surfaceRaised },
  });
