import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav, type AppTab } from './src/components/BottomNav';
import { UfPicker } from './src/components/UfPicker';
import { AboutScreen } from './src/screens/AboutScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import {
  ApiUnavailableError,
  CepNotFoundError,
  getNearbyUpas,
  getUfs,
  getUpasByUf,
  lookupCep,
} from './src/services/api';
import { getCurrentLocation } from './src/services/location';
import { getTheme } from './src/theme';
import type { ChatMessage, Coordinates, LoadStatus, UF, Upa } from './src/types';

const welcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  text: 'Olá. Posso indicar as unidades de pronto atendimento mais próximas de você, com endereço e telefone.',
  createdAt: new Date().toISOString(),
});

function AppContent() {
  const colorScheme = useColorScheme();
  const theme = useMemo(() => getTheme(colorScheme === 'dark'), [colorScheme]);

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [upas, setUpas] = useState<Upa[]>([]);
  const [status, setStatus] = useState<LoadStatus>({ state: 'idle' });
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [uf, setUf] = useState<UF | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [ufs, setUfs] = useState<UF[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cepBusy, setCepBusy] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // O histórico do chat vive aqui para não ser perdido ao trocar de aba.
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);

  useEffect(() => {
    getUfs()
      .then(setUfs)
      .catch(() => setUfs([]));
  }, []);

  /** Carrega unidades de um estado já conhecido, com ou sem coordenadas. */
  const loadUnits = useCallback(
    async (targetUf: UF, position: Coordinates | null) => {
      setStatus({ state: 'loading' });
      try {
        let data = position
          ? await getNearbyUpas(position, targetUf.sigla)
          : await getUpasByUf(targetUf.sigla);

        // Estado escolhido longe de onde o usuário está: em vez de uma tela
        // vazia, mostramos as unidades daquele estado sem afirmar distância.
        if (position && data.length === 0) {
          data = await getUpasByUf(targetUf.sigla);
          setCity(null);
        }

        setUpas(data);
        setStatus({ state: 'ready' });
      } catch (error) {
        setUpas([]);
        setStatus(
          error instanceof ApiUnavailableError
            ? { state: 'offline' }
            : { state: 'error', message: 'Não foi possível carregar as unidades.' },
        );
      }
    },
    [],
  );

  /** Fluxo completo: pede localização, descobre a UF e busca as unidades. */
  const locateAndLoad = useCallback(async () => {
    setStatus({ state: 'locating' });

    const result = await getCurrentLocation();

    if (!result.ok) {
      setCoords(null);
      setUpas([]);
      setStatus({
        state: result.reason === 'permission-denied' ? 'permission-denied' : 'location-unavailable',
      });
      return;
    }

    setCoords(result.coords);
    setCity(result.city);

    // O backend aceita sigla ou nome por extenso, que é o que o geocoding
    // reverso do aparelho devolve. Sem UF, o usuário escolhe no seletor.
    const detected = result.uf
      ? ufs.find(
          (item) =>
            item.name.toLowerCase() === result.uf?.toLowerCase() ||
            item.sigla.toLowerCase() === result.uf?.toLowerCase(),
        ) ?? null
      : null;

    if (!detected) {
      // A posição é válida; só não sabemos a UF (acontece na web, onde o
      // geocoding reverso não existe). As coordenadas ficam guardadas e
      // passam a valer assim que o usuário escolher o estado.
      setStatus({ state: 'uf-unknown' });
      return;
    }

    setUf(detected);
    await loadUnits(detected, result.coords);
  }, [loadUnits, ufs]);

  useEffect(() => {
    if (ufs.length > 0) {
      locateAndLoad();
    }
    // Roda quando a lista de UFs chega; locateAndLoad depende dela.
  }, [ufs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (uf) {
      await loadUnits(uf, coords);
    } else {
      await locateAndLoad();
    }
    setRefreshing(false);
  }, [coords, loadUnits, locateAndLoad, uf]);

  /**
   * Caminho de quem está sem localização.
   *
   * O CEP resolve as duas coisas que faltavam de uma vez: a UF, que evita o
   * seletor manual, e um ponto bom o bastante para ordenar por proximidade.
   * Quando o CEP não tem coordenada na base, ainda sobra a UF — a lista vem
   * sem distância, que é exatamente o comportamento anterior.
   */
  const handleSubmitCep = useCallback(
    async (cep: string) => {
      setCepBusy(true);
      setCepError(null);
      try {
        const found = await lookupCep(cep);
        const matched =
          ufs.find((item) => item.sigla.toLowerCase() === found.uf.toLowerCase()) ?? null;

        if (!matched) {
          setCepError('Não reconhecemos o estado desse CEP.');
          return;
        }

        const position =
          typeof found.latitude === 'number' && typeof found.longitude === 'number'
            ? { latitude: found.latitude, longitude: found.longitude }
            : null;

        setCoords(position);
        setCity(found.city);
        setUf(matched);
        await loadUnits(matched, position);
      } catch (error) {
        if (error instanceof CepNotFoundError) {
          setCepError(error.message);
        } else if (error instanceof ApiUnavailableError) {
          setCepError('Não foi possível consultar o CEP agora.');
        } else {
          setCepError('Não foi possível usar esse CEP.');
        }
      } finally {
        setCepBusy(false);
      }
    },
    [loadUnits, ufs],
  );

  const handleSelectUf = useCallback(
    (selected: UF) => {
      setPickerVisible(false);
      setUf(selected);
      // A posição do aparelho continua válida qualquer que seja o estado
      // escolhido. Se o usuário selecionar um estado distante, loadUnits
      // percebe a lista vazia e refaz a busca sem distâncias.
      loadUnits(selected, coords);
    },
    [coords, loadUnits],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']} style={styles.screenArea}>
        <View style={[styles.screenArea, activeTab !== 'home' && styles.hidden]}>
          <HomeScreen
            cepBusy={cepBusy}
            cepError={cepError}
            city={city}
            onChangeUf={() => setPickerVisible(true)}
            onRefresh={handleRefresh}
            onRetry={locateAndLoad}
            onSubmitCep={handleSubmitCep}
            refreshing={refreshing}
            status={status}
            theme={theme}
            uf={uf}
            upas={upas}
          />
        </View>

        <View style={[styles.screenArea, activeTab !== 'chat' && styles.hidden]}>
          <ChatScreen
            coords={coords}
            messages={messages}
            onChangeMessages={setMessages}
            theme={theme}
            uf={uf}
          />
        </View>

        <View style={[styles.screenArea, activeTab !== 'about' && styles.hidden]}>
          <AboutScreen theme={theme} />
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.background }}>
        <BottomNav activeTab={activeTab} onChange={setActiveTab} theme={theme} />
      </SafeAreaView>

      <UfPicker
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectUf}
        selected={uf?.sigla ?? null}
        theme={theme}
        ufs={ufs}
        visible={pickerVisible}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenArea: { flex: 1 },
  // display:'none' mantém a tela montada e preserva o estado dela.
  hidden: { display: 'none' },
});
