import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Disable Reanimated strict mode to silence "Reading from value during component render" warnings 
// which often trigger from third-party libraries like Moti or NativeWind.
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

import type { GameType, Tab, UserStats } from './src/types';
import { FeedScreen } from './src/screens/FeedScreen';
import { HabitsScreen } from './src/screens/HabitsScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { calculateLevel, defaultStats, FLOWSTATE_AUTH_KEY, FLOWSTATE_LAST_LOGIN_KEY, FLOWSTATE_STATS_KEY, FLOWSTATE_CURRENT_USER_KEY } from './src/initialState';
import { getJson, getString, remove, setJson, setString } from './src/storage';
import { useFlowstateFonts } from './src/ui/Fonts';
import { LayoutGrid, CheckSquare, BarChart3, User as UserIcon } from 'lucide-react-native';
import { Text } from './src/ui/Text';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { calculateAllocatedMinutes } from './src/screentime';
import ScreenTime from './src/native/ScreenTime';

import OnboardingFlow from './src/screens/onboarding/OnboardingFlow';

export default function App() {
  const fontsLoaded = useFlowstateFonts();
  const [isBooting, setIsBooting] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('scroll');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [stats, setStats] = useState<UserStats>(() => defaultStats());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = await getString(FLOWSTATE_AUTH_KEY);
      const savedStats = await getJson<UserStats>(FLOWSTATE_STATS_KEY);
      const savedUsername = await getString(FLOWSTATE_CURRENT_USER_KEY);
      if (cancelled) return;

      if (auth === 'true') {
        setIsLoggedIn(true);
        if (savedUsername) setUsername(savedUsername);
      }
      if (savedStats) {
        setStats({
          ...defaultStats(),
          ...savedStats,
          screenTime: {
            ...defaultStats().screenTime,
            ...(savedStats.screenTime || {}),
          },
          habits: savedStats.habits || [],
          habitHistory: savedStats.habitHistory || {},
          sealedDays: savedStats.sealedDays || {},
          isDaySealed: savedStats.isDaySealed || false,
        });
      }
      setIsBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isBooting || !isLoggedIn || !stats.screenTime?.isTrackingEnabled) return;

    // Poll for used minutes every 30 seconds when in foreground
    const interval = setInterval(async () => {
      try {
        const used = await ScreenTime.getUsedMinutes();
        if (used !== stats.screenTime.usedMinutes) {
          setStats(prev => ({
            ...prev,
            screenTime: {
              ...prev.screenTime,
              usedMinutes: used
            }
          }));
        }
      } catch (e) {
        console.error("Failed to fetch used minutes", e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isBooting, isLoggedIn, stats.screenTime.isTrackingEnabled, stats.screenTime.usedMinutes]);

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
          
          // Yesterday's date string
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          // Reset habits for the new day
          const updatedHabits = (prev.habits || []).map(h => {
            // If the habit was NOT completed yesterday, reset streak to 0
            const wasCompletedYesterday = h.lastCompletedDate === yesterdayStr;
            return {
              ...h,
              completedToday: false,
              streak: wasCompletedYesterday ? h.streak : 0
            };
          });

          return { 
            ...prev, 
            xp: newXp, 
            dailyReps: 0, 
            level: calculateLevel(newXp),
            habits: updatedHabits,
            isDaySealed: false
          };
        });
      }
    })();
  }, [isBooting]);

  const handleLoginSuccess = async (username: string) => {
    await setString(FLOWSTATE_AUTH_KEY, 'true');
    await setString(FLOWSTATE_CURRENT_USER_KEY, username);
    setUsername(username);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await remove(FLOWSTATE_AUTH_KEY);
    await remove(FLOWSTATE_CURRENT_USER_KEY);
    setIsLoggedIn(false);
  };

  const handleDeleteAccount = async () => {
    // According to App Store Review Guideline 5.1.1(v), 
    // we must provide a way to delete the account and all associated data.
    await remove(FLOWSTATE_AUTH_KEY);
    await remove(FLOWSTATE_STATS_KEY);
    await remove(FLOWSTATE_LAST_LOGIN_KEY);
    await remove(FLOWSTATE_CURRENT_USER_KEY);
    setStats(defaultStats());
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
      
      const newDailyReps = prev.dailyReps + score;
      const newAllocatedMinutes = calculateAllocatedMinutes(newDailyReps);

      // Sync with Native Screen Time
      if (prev.screenTime?.isTrackingEnabled) {
        ScreenTime.setScreenTimeBudget(newAllocatedMinutes).catch(console.error);
      }

      return {
        ...prev,
        totalReps: prev.totalReps + (score > 0 ? 1 : 0),
        dailyReps: newDailyReps,
        xp: prev.xp + 10,
        level: calculateLevel(prev.xp + 10),
        mentalReps: prev.mentalReps + (isPhysical ? 0 : 1),
        physicalReps: prev.physicalReps + (isPhysical ? 1 : 0),
        activityHistory: newActivity,
        gameStats: newGameStats,
        screenTime: {
          ...(prev.screenTime || defaultStats().screenTime),
          allocatedMinutes: newAllocatedMinutes,
        }
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
      { id: 'habits' as const, label: 'Habits', icon: CheckSquare },
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
          <OnboardingFlow 
            onComplete={() => handleLoginSuccess('FlowState User')}
          />
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
            {activeTab === 'habits' && <HabitsScreen stats={stats} onUpdateStats={setStats} theme={theme} />}
            {activeTab === 'progress' && <ProgressScreen theme={theme} stats={stats} />}
            {activeTab === 'profile' && (
              <ProfileScreen 
                theme={theme} 
                username={username}
                stats={stats}
                onUpdateStats={setStats}
                onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')} 
                onLogout={handleLogout}
                onDeleteAccount={handleDeleteAccount}
              />
            )}
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
