import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme';
import { spacing, typography } from '../theme';

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
          <Text style={styles.headerTitle}>Sobre</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.heading}>Informação simples e responsável.</Text>
          <Text style={styles.lead}>
            O UPA Agora encontra unidades reais e mostra claramente o que não pode confirmar.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados</Text>
          <Text style={styles.paragraph}>
            Nome, endereço, telefone, horário e coordenadas vêm do Cadastro Nacional de
            Estabelecimentos de Saúde (CNES).
          </Text>
          <Pressable
            accessibilityHint="Abre o portal de dados do Ministério da Saúde"
            accessibilityLabel="Ver a fonte oficial do CNES"
            accessibilityRole="link"
            onPress={() => Linking.openURL(CNES_URL).catch(() => undefined)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>Abrir fonte oficial</Text>
            <Ionicons name="open-outline" size={16} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limites</Text>
          <Text style={styles.paragraph}>
            Não exibimos tempo de fila. A lista usa distância em linha reta; o assistente só
            informa trajeto quando consegue consultá-lo. Alguns horários e endereços precisam de
            confirmação.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança</Text>
          <Text style={styles.paragraph}>
            Emergências são tratadas por regras fixas. A IA só pode citar unidades recuperadas do
            CNES e o aplicativo continua funcionando se ela falhar.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidade</Text>
          <Text style={styles.paragraph}>
            Sua localização não é armazenada. Ela é usada para encontrar unidades e, quando você
            pede tempo de trajeto, é enviada ao OpenRouteService para calcular a rota. O Google
            Maps só recebe a origem e o destino se você tocar em “Abrir no Google Maps”.
          </Text>
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
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      justifyContent: 'center',
      minHeight: 64,
    },
    headerTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 19,
    },
    intro: { paddingBottom: spacing.xl, paddingTop: spacing.xl },
    heading: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 27,
      letterSpacing: -0.6,
      lineHeight: 34,
      maxWidth: 440,
    },
    lead: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 9,
      maxWidth: 470,
    },
    section: {
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingVertical: spacing.lg,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 17,
      lineHeight: 23,
    },
    paragraph: {
      color: theme.colors.textMuted,
      fontFamily: typography.regular,
      fontSize: 14,
      lineHeight: 22,
      marginTop: 7,
      maxWidth: 520,
    },
    link: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 48,
      marginTop: 8,
    },
    linkText: {
      color: theme.colors.text,
      fontFamily: typography.bold,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
    pressed: { opacity: 0.55 },
  });
