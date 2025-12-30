import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { GameType, Tab, UserStats } from './src/types';
import { LoginScreen } from './src/screens/LoginScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { defaultStats, FLOWSTATE_AUTH_KEY, FLOWSTATE_LAST_LOGIN_KEY, FLOWSTATE_STATS_KEY } from './src/initialState';
import { getJson, getString, remove, setJson, setString } from './src/storage';
import { useFlowstateFonts } from './src/ui/Fonts';
import { LayoutGrid, BarChart3, User as UserIcon } from 'lucide-react-native';
import { Text } from './src/ui/Text';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function calculateLevel(xp: number) {
  const l = Math.floor((-5 + Math.sqrt(25 + 20 * xp)) / 10);
  return Math.max(1, l + 1);
}

export default function App() {
  const fontsLoaded = useFlowstateFonts();
  const [isBooting, setIsBooting] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('scroll');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [stats, setStats] = useState<UserStats>(() => defaultStats());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = await getString(FLOWSTATE_AUTH_KEY);
      const savedStats = await getJson<UserStats>(FLOWSTATE_STATS_KEY);
      if (cancelled) return;

      setIsLoggedIn(auth === 'true');
      if (savedStats) setStats(savedStats);
      setIsBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isBooting) return;
    void setJson(FLOWSTATE_STATS_KEY, stats);
  }, [stats, isBooting]);

  useEffect(() => {
    if (isBooting) return;
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = await getString(FLOWSTATE_LAST_LOGIN_KEY);
      if (lastLogin !== today) {
        await setString(FLOWSTATE_LAST_LOGIN_KEY, today);
        setStats((prev) => {
          const newXp = prev.xp + 5;
          return { ...prev, xp: newXp, dailyReps: 0, level: calculateLevel(newXp) };
        });
      }
    })();
  }, [isBooting]);

  const handleLoginSuccess = async () => {
    await setString(FLOWSTATE_AUTH_KEY, 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await remove(FLOWSTATE_AUTH_KEY);
    setIsLoggedIn(false);
  };

  const handleScrollXp = React.useCallback(() => {}, []);

  const handleRepComplete = React.useCallback((type: GameType, score: number) => {
    const today = new Date().toISOString().split('T')[0];
    setStats((prev) => {
      const isPhysical = ['pushups', 'situps', 'planks'].includes(type);
      const gameKey = type as string;
      const currentStats = prev.gameStats[gameKey] || { bestScore: 0, timesPlayed: 0, category: 'MEMORY' as const };
      const newGameStats = {
        ...prev.gameStats,
        [gameKey]: {
          ...currentStats,
          bestScore: Math.max(currentStats.bestScore, score),
          timesPlayed: currentStats.timesPlayed + 1,
        },
      };
      const newActivity = { ...prev.activityHistory };
      newActivity[today] = (newActivity[today] || 0) + score;
      return {
        ...prev,
        totalReps: prev.totalReps + score,
        dailyReps: prev.dailyReps + score,
        mentalReps: prev.mentalReps + (isPhysical ? 0 : score),
        physicalReps: prev.physicalReps + (isPhysical ? score : 0),
        activityHistory: newActivity,
        gameStats: newGameStats,
      };
    });
  }, []);

  const isDark = theme === 'dark';
  const bg = isDark ? '#000' : '#f8fafc';
  const navBg = isDark ? '#020617' : '#ffffff';
  const navBorder = isDark ? '#0f172a' : '#e2e8f0';
  const navIconInactive = isDark ? '#475569' : '#94a3b8';

  const tabs = useMemo(
    () => [
      { id: 'scroll' as const, label: 'Stream', icon: LayoutGrid },
      { id: 'progress' as const, label: 'Metrics', icon: BarChart3 },
      { id: 'profile' as const, label: 'Account', icon: UserIcon },
    ],
    [],
  );

  if (!fontsLoaded || isBooting) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator color="#06b6d4" />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: bg }]}>
          <View style={{ flex: 1 }}>
            {activeTab === 'scroll' && <FeedScreen theme={theme} onCompleteRep={handleRepComplete} onScrollXp={handleScrollXp} />}
            {activeTab === 'progress' && <ProgressScreen theme={theme} stats={stats} />}
            {activeTab === 'profile' && <ProfileScreen theme={theme} onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')} onLogout={handleLogout} />}
          </View>

          <View style={[styles.nav, { backgroundColor: navBg, borderTopColor: navBorder }]}>
            {tabs.map((t) => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setActiveTab(t.id)}
                  className="items-center justify-center gap-1 flex-1 h-full"
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <Icon size={22} color={active ? '#06b6d4' : navIconInactive} />
                  <Text weight="black" className="text-[9px] uppercase tracking-widest" style={{ color: active ? '#06b6d4' : navIconInactive }}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    height: 84,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 24,
  },
});
