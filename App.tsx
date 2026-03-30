import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View, Modal, AppState, Platform, Linking } from 'react-native';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Disable Reanimated strict mode to silence "Reading from value during component render" warnings 
// which often trigger from third-party libraries like Moti or NativeWind.
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

import type { GameType, Tab, UserStats } from './src/types';
import { FeedScreen } from './src/screens/FeedScreen';
import { ProgressScreen } from './src/screens/ProgressScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { calculateLevel, defaultStats, FLOWSTATE_AUTH_KEY, FLOWSTATE_LAST_LOGIN_KEY, FLOWSTATE_STATS_KEY, FLOWSTATE_CURRENT_USER_KEY, FLOWSTATE_USERS_KEY } from './src/initialState';
import { getJson, getString, remove, setJson, setString } from './src/storage';
import { useFlowstateFonts } from './src/ui/Fonts';
import { BottomPillNav } from './src/components/BottomPillNav';
import { GAME_NAV_ACCENTS } from './src/constants/gameNavAccent';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { calculateAllocatedMinutes } from './src/screentime';
import ScreenTime from './src/native/ScreenTime';
import { formatLocalDateKey } from './src/date';

import OnboardingFlow from './src/screens/onboarding/OnboardingFlow';
import { DismissScreen } from './src/screens/DismissScreen';
import { HoldToDismissModal } from './src/components/HoldToDismissModal';

const FLOWSTATE_LAST_CALIBRATION_RESET_KEY = 'flowstate_last_calibration_reset';

export default function App() {
  const fontsLoaded = useFlowstateFonts();
  const [isBooting, setIsBooting] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [activeTab, setActiveTab] = useState<Tab>('scroll');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [stats, setStats] = useState<UserStats>(() => defaultStats());
  const [showDismissScreen, setShowDismissScreen] = useState(false);
  const [showHoldToDismiss, setShowHoldToDismiss] = useState(false);
  const [streamNavAccent, setStreamNavAccent] = useState(() => GAME_NAV_ACCENTS.pulse);

  // Handle deep links from shield buttons
  const handleDeepLink = useCallback((url: string | null) => {
    if (!url) return;
    
    if (url.includes('profile-dismiss')) {
      setActiveTab('profile');
      setShowHoldToDismiss(true);
    } else if (url.includes('dismiss')) {
      setShowDismissScreen(true);
    }
  }, []);

  const checkPendingDeepLink = useCallback(async () => {
    if (Platform.OS !== 'ios') return;
    
    try {
      const initialUrl = await Linking.getInitialURL();
      handleDeepLink(initialUrl);
      
      // Also check shared UserDefaults for deep links stored by shield extensions
      const pending = await ScreenTime.getPendingDeepLink();
      if (pending) {
        handleDeepLink(`flowstate://${pending}`);
      }
    } catch (e) {
      console.error('Error checking deep link:', e);
    }
  }, [handleDeepLink]);

  // Listen for deep links
  useEffect(() => {
    // Check initial URL
    checkPendingDeepLink();

    // Listen for URL events
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [checkPendingDeepLink, handleDeepLink]);

  // Check for pending deep link when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPendingDeepLink();
        setTimeout(() => checkPendingDeepLink(), 400);
        setTimeout(() => checkPendingDeepLink(), 1500);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkPendingDeepLink]);

  // After login + boot, poll shared defaults in case the user opened the app from the shield URL late
  useEffect(() => {
    if (isBooting || !isLoggedIn || Platform.OS !== 'ios') return;
    const delays = [300, 1200, 3500];
    const timers = delays.map((ms) => setTimeout(() => void checkPendingDeepLink(), ms));
    return () => timers.forEach(clearTimeout);
  }, [isBooting, isLoggedIn, checkPendingDeepLink]);

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
        const defaults = defaultStats();
        setStats({
          ...defaults,
          ...savedStats,
          gameStats: {
            ...defaults.gameStats,
            ...(savedStats.gameStats || {}),
          },
          screenTime: {
            ...defaults.screenTime,
            ...(savedStats.screenTime || {}),
          },
          habits: savedStats.habits || [],
          habitHistory: savedStats.habitHistory || {},
          sealedDays: savedStats.sealedDays || {},
          isDaySealed: savedStats.isDaySealed || false,
        });
      }
      setIsBooting(false);
      
      // Restore Screen Time budget on startup if enabled
      if (savedStats?.screenTime?.isTrackingEnabled) {
        const allocatedMinutes = savedStats.screenTime.allocatedMinutes || 0;
        ScreenTime.setScreenTimeBudget(allocatedMinutes).catch(console.error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isBooting || !isLoggedIn) return;

    // Neural Decay: -1 rep per minute
    const decayInterval = setInterval(() => {
      setStats(prev => {
        const now = Date.now();
        const lastUpdate = prev.screenTime?.lastUpdateTimestamp || now;
        const minutesElapsed = Math.floor((now - lastUpdate) / 60000);

        if (minutesElapsed >= 1) {
          const decayAmount = minutesElapsed;
          const newDailyReps = Math.max(0, prev.dailyReps - decayAmount);
          
          return {
            ...prev,
            dailyReps: newDailyReps,
            screenTime: {
              ...prev.screenTime,
              lastUpdateTimestamp: now,
            }
          };
        }
        return prev;
      });
    }, 30000); // Check every 30s

    return () => clearInterval(decayInterval);
  }, [isBooting, isLoggedIn]);

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

  const runDailyResetIfNeeded = useCallback(async () => {
    const today = formatLocalDateKey();
    const [lastLogin, lastCalibrationReset] = await Promise.all([
      getString(FLOWSTATE_LAST_LOGIN_KEY),
      getString(FLOWSTATE_LAST_CALIBRATION_RESET_KEY),
    ]);
    const shouldRunLoginReset = lastLogin !== today;
    const shouldRunCalibrationReset = lastCalibrationReset !== today;
    if (!shouldRunLoginReset && !shouldRunCalibrationReset) return;

    const writes: Promise<void>[] = [];
    if (shouldRunLoginReset) {
      writes.push(setString(FLOWSTATE_LAST_LOGIN_KEY, today));
    }
    if (shouldRunCalibrationReset) {
      writes.push(setString(FLOWSTATE_LAST_CALIBRATION_RESET_KEY, today));
    }
    await Promise.all(writes);

    setStats((prev) => {
      let nextStats: UserStats = prev;

      if (shouldRunLoginReset) {
        const newXp = prev.xp + 5;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalDateKey(yesterday);

        // Reset habits for the new day
        const updatedHabits = (prev.habits || []).map((h) => {
          // If the habit was NOT completed yesterday, reset streak to 0.
          const wasCompletedYesterday = h.lastCompletedDate === yesterdayStr;
          return {
            ...h,
            completedToday: false,
            streak: wasCompletedYesterday ? h.streak : 0,
          };
        });

        nextStats = {
          ...nextStats,
          xp: newXp,
          dailyReps: 0,
          maxDailyReps: 0, // Reset milestone progress for the new day
          level: calculateLevel(newXp),
          habits: updatedHabits,
          isDaySealed: false,
          screenTime: {
            ...nextStats.screenTime,
            allocatedMinutes: 0,
            usedMinutes: 0,
            maxMilestoneReached: 0, // Reset milestone tracker
            lastUpdateTimestamp: Date.now(),
          },
        };
      }

      if (shouldRunCalibrationReset) {
        // Neural Calibration is daily, so clear clean finishes at day rollover.
        const dailyCalibrationStats: UserStats['gameStats'] = Object.keys(nextStats.gameStats).reduce(
          (acc, key) => {
            const game = nextStats.gameStats[key];
            acc[key] = { ...game, cleanFinishes: 0 };
            return acc;
          },
          {} as UserStats['gameStats'],
        );
        nextStats = {
          ...nextStats,
          gameStats: dailyCalibrationStats,
        };
      }

      return nextStats;
    });
  }, []);

  useEffect(() => {
    if (isBooting || !isLoggedIn) return;

    let cancelled = false;
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextMidnightReset = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const msUntilNextMidnight = nextMidnight.getTime() - now.getTime() + 250;

      midnightTimer = setTimeout(async () => {
        if (cancelled) return;
        await runDailyResetIfNeeded();
        scheduleNextMidnightReset();
      }, msUntilNextMidnight);
    };

    void runDailyResetIfNeeded();
    scheduleNextMidnightReset();

    return () => {
      cancelled = true;
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [isBooting, isLoggedIn, runDailyResetIfNeeded]);

  const handleLoginSuccess = async (username: string, screenTimeEnabled?: boolean, restrictedAppCount?: number) => {
    await setString(FLOWSTATE_AUTH_KEY, 'true');
    await setString(FLOWSTATE_CURRENT_USER_KEY, username);
    setUsername(username);
    setIsLoggedIn(true);
    
    if (screenTimeEnabled) {
      setStats(prev => ({
        ...prev,
        screenTime: {
          ...prev.screenTime,
          isTrackingEnabled: true,
          restrictedAppCount: restrictedAppCount || 0,
        }
      }));
    }
  };

  const handleLogout = async () => {
    await remove(FLOWSTATE_AUTH_KEY);
    await remove(FLOWSTATE_CURRENT_USER_KEY);
    setIsLoggedIn(false);
  };

  const handleDeleteAccount = async () => {
    // App Store Review Guideline 5.1.1(v): delete all associated data
    await remove(FLOWSTATE_AUTH_KEY);
    await remove(FLOWSTATE_STATS_KEY);
    await remove(FLOWSTATE_LAST_LOGIN_KEY);
    await remove(FLOWSTATE_CURRENT_USER_KEY);
    await remove(FLOWSTATE_USERS_KEY);
    await remove(FLOWSTATE_LAST_CALIBRATION_RESET_KEY);
    setStats(defaultStats());
    setIsLoggedIn(false);
  };

  const handleScrollXp = React.useCallback(() => {}, []);

  const handleActiveGameChange = React.useCallback((gameType: GameType) => {
    setStreamNavAccent(GAME_NAV_ACCENTS[gameType] ?? GAME_NAV_ACCENTS.pulse);
  }, []);

  const handleRepComplete = React.useCallback((type: GameType, score: number, isClean: boolean = true) => {
    const today = formatLocalDateKey();
    setStats((prev) => {
      const isPhysical = ['pushups', 'situps', 'planks'].includes(type);
      const gameKey = type as string;
      const currentStats = prev.gameStats[gameKey] || { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'MEMORY' as const };
      const newGameStats = {
        ...prev.gameStats,
        [gameKey]: {
          ...currentStats,
          bestScore: Math.max(currentStats.bestScore, score),
          timesPlayed: currentStats.timesPlayed + 1,
          cleanFinishes: currentStats.cleanFinishes + (isClean ? 1 : 0),
        },
      };
      const newActivity = { ...prev.activityHistory };
      newActivity[today] = (newActivity[today] || 0) + score;
      
      const newDailyReps = prev.dailyReps + score;
      const newMaxDailyReps = Math.max(prev.maxDailyReps || 0, newDailyReps);
      const newAllocatedMinutes = calculateAllocatedMinutes(newMaxDailyReps);

      // Sync with Native Screen Time
      if (prev.screenTime?.isTrackingEnabled) {
        ScreenTime.setScreenTimeBudget(newAllocatedMinutes).catch(console.error);
      }

      return {
        ...prev,
        totalReps: prev.totalReps + score,
        dailyReps: newDailyReps,
        maxDailyReps: newMaxDailyReps,
        mentalReps: prev.mentalReps + (isPhysical ? 0 : score),
        physicalReps: prev.physicalReps + (isPhysical ? score : 0),
        activityHistory: newActivity,
        gameStats: newGameStats,
        screenTime: {
          ...(prev.screenTime || defaultStats().screenTime),
          allocatedMinutes: newAllocatedMinutes,
          maxMilestoneReached: Math.max(prev.screenTime?.maxMilestoneReached || 0, newMaxDailyReps),
          lastUpdateTimestamp: Date.now(),
        }
      };
    });
  }, []);

  const isDark = theme === 'dark';
  const bg = isDark ? '#000' : '#f8fafc';

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
            onComplete={(screenTimeEnabled, restrictedAppCount) => handleLoginSuccess('FlowState User', screenTimeEnabled, restrictedAppCount)}
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
            {activeTab === 'scroll' && (
              <FeedScreen
                theme={theme}
                onCompleteRep={handleRepComplete}
                onScrollXp={handleScrollXp}
                onActiveGameChange={handleActiveGameChange}
              />
            )}
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
                onRequestHoldToDismiss={() => setShowHoldToDismiss(true)}
              />
            )}
          </View>

          <BottomPillNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            streamAccent={streamNavAccent}
            theme={theme}
          />

          <StatusBar style={isDark ? 'light' : 'dark'} />

          {/* Legacy Dismiss Screen Modal */}
          <Modal
            visible={showDismissScreen}
            animationType="slide"
            presentationStyle="fullScreen"
          >
            <DismissScreen
              onDismissComplete={() => {
                setShowDismissScreen(false);
              }}
              onCancel={() => {
                setShowDismissScreen(false);
              }}
            />
          </Modal>

          {/* Hold-to-Dismiss Modal (triggered from shield "Enter FlowState" or enforcement toggle) */}
          <HoldToDismissModal
            visible={showHoldToDismiss}
            onDismissComplete={() => {
              setShowHoldToDismiss(false);
              setStats(prev => ({
                ...prev,
                screenTime: {
                  ...prev.screenTime,
                  isTrackingEnabled: false,
                },
              }));
            }}
            onCancel={() => setShowHoldToDismiss(false)}
          />
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
});
