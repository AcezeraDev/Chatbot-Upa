import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav, type AppTab } from './src/components/BottomNav';
import { AboutScreen } from './src/screens/AboutScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { getUpas } from './src/services/api';
import { getTheme } from './src/theme';
import type { DataSource, Upa } from './src/types';

function AppContent() {
  const colorScheme = useColorScheme();
  const theme = useMemo(() => getTheme(colorScheme === 'dark'), [colorScheme]);
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [upas, setUpas] = useState<Upa[]>([]);
  const [source, setSource] = useState<DataSource>('demo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const result = await getUpas();
    setUpas(result.data);
    setSource(result.source);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']} style={styles.screenArea}>
        {activeTab === 'home' && (
          <HomeScreen
            loading={loading}
            onOpenChat={() => setActiveTab('chat')}
            onRefresh={() => loadData(true)}
            refreshing={refreshing}
            source={source}
            theme={theme}
            upas={upas}
          />
        )}
        {activeTab === 'chat' && <ChatScreen initialSource={source} theme={theme} />}
        {activeTab === 'about' && <AboutScreen theme={theme} />}
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.tabBar }}>
        <BottomNav activeTab={activeTab} onChange={setActiveTab} theme={theme} />
      </SafeAreaView>
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
});
