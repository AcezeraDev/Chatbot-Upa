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
          <Text style={styles.title}>Projeto</Text>
        </View>

        <Text style={styles.heading}>UPA Agora</Text>
        <Text style={styles.paragraph}>
          Localiza unidades de pronto atendimento reais e as ordena pela distância até você.
        </Text>

        <Text style={styles.sectionTitle}>De onde vêm os dados</Text>
        <Text style={styles.paragraph}>
          Do CNES (Cadastro Nacional de Estabelecimentos de Saúde), pela API pública de dados
          abertos do Ministério da Saúde. Nome, endereço, bairro, telefone e coordenadas são os
          cadastrados oficialmente.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(CNES_URL).catch(() => undefined)}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>Ver a fonte oficial</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Por que não mostramos tempo de fila</Text>
        <Text style={styles.paragraph}>
          Não existe fonte pública nacional de fila em tempo real. Algumas prefeituras publicam
          painéis próprios, mas não há um padrão que cubra o país. Preferimos não exibir um número
          a exibir um número errado: numa urgência, isso levaria alguém à unidade errada.
        </Text>

        <Text style={styles.sectionTitle}>Limites conhecidos</Text>
        <Text style={styles.item}>
          1. A distância é em linha reta, não pelo trajeto de carro.
        </Text>
        <Text style={styles.item}>
          2. Cerca de 5% das unidades não têm coordenada no CNES e ficam fora da lista.
        </Text>
        <Text style={styles.item}>
          3. Algumas unidades foram cadastradas com a coordenada do centro da cidade. O app detecta
          esses casos e marca a unidade com um aviso, em vez de afirmar uma distância errada.
        </Text>
        <Text style={styles.item}>
          4. O assistente responde por regras determinísticas, sem IA generativa.
        </Text>

        <Text style={styles.sectionTitle}>Privacidade</Text>
        <Text style={styles.paragraph}>
          Sua localização é usada apenas para calcular distâncias e não é armazenada. O estado é
          identificado pelo próprio aparelho.
        </Text>

        <Text style={styles.sectionTitle}>Tecnologias</Text>
        <Text style={styles.paragraph}>React Native, Expo, TypeScript, Python e FastAPI.</Text>
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
    link: {
      justifyContent: 'center',
      marginTop: spacing.sm,
      minHeight: 44,
    },
    linkText: {
      color: theme.colors.primary,
      fontFamily: typography.bold,
      fontSize: 15,
    },
    pressed: { opacity: 0.6 },
  });
