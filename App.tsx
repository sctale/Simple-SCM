import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/constants';
import { initDatabase } from './src/database/scmDB';
import TabBar, { type TabKey } from './src/components/TabBar';
import HomeScreen from './src/screens/HomeScreen';
import SupplierScreen from './src/screens/SupplierScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import ResearchScreen from './src/screens/ResearchScreen';
import MineScreen from './src/screens/MineScreen';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [tab, setTab] = useState<TabKey>('home');

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
      } catch {
        // 初始化失败也放行
      }
      setDbReady(true);
    })();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.screen}>
          <View style={[styles.page, tab !== 'home' && styles.pageHidden]}>
            <HomeScreen
              onGoSupplier={() => setTab('supplier')}
              onGoCategory={() => setTab('category')}
              onGoResearch={() => setTab('research')}
            />
          </View>
          <View style={[styles.page, tab !== 'supplier' && styles.pageHidden]}>
            <SupplierScreen />
          </View>
          <View style={[styles.page, tab !== 'category' && styles.pageHidden]}>
            <CategoryScreen />
          </View>
          <View style={[styles.page, tab !== 'research' && styles.pageHidden]}>
            <ResearchScreen />
          </View>
          <View style={[styles.page, tab !== 'mine' && styles.pageHidden]}>
            <MineScreen />
          </View>
        </View>
        <TabBar current={tab} onChange={setTab} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background,
  },
  container: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1 },
  page: { flex: 1 },
  pageHidden: { display: 'none' },
});
