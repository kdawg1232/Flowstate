import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, BarChart3, User as UserIcon } from 'lucide-react-native';
import type { Tab } from '../types';
import { Text } from '../ui/Text';
import { TAB_ACCENTS } from '../constants/gameNavAccent';

const SPRING = { damping: 20, stiffness: 220, mass: 0.8 };

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  /** Accent while Stream tab is selected (updates with current game). */
  streamAccent: string;
  theme: 'light' | 'dark';
};

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'scroll', label: 'Stream', icon: LayoutGrid },
  { id: 'progress', label: 'Metrics', icon: BarChart3 },
  { id: 'profile', label: 'Account', icon: UserIcon },
];

export function BottomPillNav({ activeTab, onTabChange, streamAccent, theme }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const [barInnerWidth, setBarInnerWidth] = useState(0);

  const activeIndex = useMemo(() => {
    const i = TABS.findIndex((t) => t.id === activeTab);
    return i >= 0 ? i : 0;
  }, [activeTab]);

  const highlightAccent =
    activeTab === 'scroll'
      ? streamAccent
      : activeTab === 'progress'
        ? TAB_ACCENTS.progress
        : TAB_ACCENTS.profile;

  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);

  const layoutPill = useCallback((width: number, index: number) => {
    if (width <= 0) return;
    const pad = 4;
    const gap = 6;
    const inner = width - pad * 2;
    const slot = inner / 3;
    const w = Math.max(0, slot - gap);
    const x = pad + index * slot + gap / 2;
    pillX.value = withSpring(x, SPRING);
    pillW.value = withSpring(w, SPRING);
  }, []);

  const onBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      setBarInnerWidth(w);
      layoutPill(w, activeIndex);
    },
    [activeIndex, layoutPill],
  );

  useEffect(() => {
    if (barInnerWidth > 0) {
      layoutPill(barInnerWidth, activeIndex);
    }
  }, [activeIndex, barInnerWidth, layoutPill]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillW.value,
  }));

  const barBg = isDark ? '#0a0a0a' : '#f1f5f9';
  const inactiveIcon = isDark ? 'rgba(255,255,255,0.45)' : '#94a3b8';
  const activeIcon = isDark ? '#ffffff' : '#0f172a';
  const inactiveLabel = isDark ? 'rgba(255,255,255,0.55)' : '#64748b';
  const pillBg = hexToRgba(highlightAccent, isDark ? 0.32 : 0.22);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
      <View style={[styles.bar, { backgroundColor: barBg }]} onLayout={onBarLayout}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            pillStyle,
            {
              backgroundColor: pillBg,
            },
          ]}
        />
        {TABS.map((t) => {
          const active = activeTab === t.id;
          const Icon = t.icon;
          return (
            <View key={t.id} style={styles.tabSlot}>
              <Pressable
                onPress={() => onTabChange(t.id)}
                style={({ pressed }) => [styles.tabPressable, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.tabInner}>
                  <Icon size={18} color={active ? activeIcon : inactiveIcon} strokeWidth={active ? 2.5 : 2} />
                  <Text
                    weight="black"
                    className="text-[8px] uppercase tracking-widest"
                    style={{
                      color: active ? activeIcon : inactiveLabel,
                      lineHeight: 10,
                      includeFontPadding: false,
                      textAlign: 'center',
                    }}
                  >
                    {t.label}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 20,
    alignItems: 'stretch',
  },
  bar: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    borderRadius: 22,
  },
  tabSlot: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
    justifyContent: 'center',
  },
  tabPressable: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
    paddingBottom: 3,
  },
  tabInner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    maxWidth: '100%',
  },
});
