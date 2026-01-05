import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View, ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FlowMode, GameType } from '../types';
import { Brain, Dumbbell, Zap } from 'lucide-react-native';
import { Text } from '../ui/Text';

// Ported Games
import PulsePatternGame from '../components/games/PulsePatternGame';
import SignalScanGame from '../components/games/SignalScanGame';
import ArrowFlankerGame from '../components/games/ArrowFlankerGame';
import LogicLinkGame from '../components/games/LogicLinkGame';
import MentalMathGame from '../components/games/MentalMathGame';
import UntangleGame from '../components/games/UntangleGame';
import BridgesGame from '../components/games/BridgesGame';
import PushupTracker from '../components/games/PushupTracker';
import SitupTracker from '../components/games/SitupTracker';
import PlankTracker from '../components/games/PlankTracker';

type Rep = { id: string; type: GameType };

type Props = {
  theme: 'light' | 'dark';
  onCompleteRep: (type: GameType, score: number) => void;
  onScrollXp: () => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const NAV_HEIGHT = 84;

export function FeedScreen({ theme, onCompleteRep, onScrollXp }: Props) {
  const [mode, setMode] = useState<FlowMode>('mixed');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flatListHeight, setFlatListHeight] = useState(SCREEN_HEIGHT - NAV_HEIGHT);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const flatListRef = useRef<FlatList<Rep>>(null);
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';

  const reps = useMemo(() => {
    const mentalPool: GameType[] = ['pulse', 'signal', 'flanker', 'logic_link', 'math_dash', 'untangle', 'bridges'];
    const physicalPool: GameType[] = ['pushups', 'situps', 'planks'];
    const generated: Rep[] = [];
    let lastType: GameType | null = null;

    for (let i = 0; i < 60; i++) {
      let currentPool: GameType[];
      if (mode === 'physical') currentPool = physicalPool;
      else if (mode === 'mental') currentPool = mentalPool;
      else currentPool = (i + 1) % 6 === 0 ? physicalPool : mentalPool;

      const available = currentPool.filter((t) => t !== lastType);
      const selected = available[Math.floor(Math.random() * available.length)];
      generated.push({ id: `node-${i}-${mode}`, type: selected });
      lastType = selected;
    }

    return generated;
  }, [mode]);

  const bg = isDark ? '#020617' : '#f8fafc';
  const panel = isDark ? '#0b1220' : '#ffffff';
  const panelBorder = isDark ? '#0f172a' : '#e2e8f0';
  const text = isDark ? '#ffffff' : '#0f172a';
  const subText = isDark ? '#94a3b8' : '#64748b';

  const ModeButton = ({ id, label, icon: Icon }: { id: FlowMode; label: string; icon: any }) => {
    const active = mode === id;
    return (
      <Pressable
        onPress={() => {
          setMode(id);
          setCurrentIndex(0);
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }}
        style={({ pressed }) => [
          styles.modeButton,
          {
            backgroundColor: active ? (isDark ? '#1e293b' : '#ffffff') : isDark ? '#0f172a66' : '#f1f5f9',
            borderColor: active ? (isDark ? '#334155' : '#cbd5e1') : isDark ? '#1e293b80' : '#e2e8f0',
            opacity: pressed ? 0.7 : active ? 1 : 0.6,
            transform: [{ scale: active ? 1.05 : 1 }],
          },
        ]}
      >
        <Icon size={18} color={active ? '#06b6d4' : (isDark ? '#64748b' : '#94a3b8')} />
        <Text weight="black" style={[styles.modeButtonText, { color: active ? text : subText }]}>{label}</Text>
      </Pressable>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<any> }) => {
    // Find the item that is most visible
    const mostVisible = viewableItems.sort((a, b) => (b.itemVisiblePercent || 0) - (a.itemVisiblePercent || 0))[0];
    
    if (!mostVisible || (!mostVisible.index && mostVisible.index !== 0)) return;
    const newIndex = mostVisible.index;
    
    if (newIndex < currentIndex) {
      // Block backwards scrolling, matching web behavior.
      flatListRef.current?.scrollToIndex({ index: currentIndex, animated: false });
      return;
    }

    if (newIndex > currentIndex) {
      onScrollXp();
      setCurrentIndex(newIndex);
    }
  }).current;

  const renderItem = React.useCallback(({ item, index }: { item: Rep, index: number }) => {
    const isActive = index === currentIndex;
    
    return (
      <View style={{ height: flatListHeight, width: '100%' }}>
        {item.type === 'pulse' && <PulsePatternGame onComplete={(lvl) => onCompleteRep('pulse', lvl)} isActive={isActive} theme={theme} />}
        {item.type === 'signal' && <SignalScanGame onComplete={(scr) => onCompleteRep('signal', scr)} isActive={isActive} theme={theme} />}
        {item.type === 'flanker' && <ArrowFlankerGame onComplete={(scr) => onCompleteRep('flanker', scr)} isActive={isActive} theme={theme} />}
        {item.type === 'logic_link' && <LogicLinkGame onComplete={(scr) => onCompleteRep('logic_link', scr)} isActive={isActive} theme={theme} />}
        {item.type === 'math_dash' && <MentalMathGame onComplete={(scr) => onCompleteRep('math_dash', scr)} isActive={isActive} theme={theme} />}
        {item.type === 'untangle' && <UntangleGame onComplete={(scr) => onCompleteRep('untangle', scr)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />}
        {item.type === 'bridges' && <BridgesGame onComplete={(scr) => onCompleteRep('bridges', scr)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />}
        
        {item.type === 'pushups' && <PushupTracker onComplete={(reps) => onCompleteRep('pushups', reps)} isActive={isActive} theme={theme} />}
        {item.type === 'situps' && <SitupTracker onComplete={(reps) => onCompleteRep('situps', reps)} isActive={isActive} theme={theme} />}
        {item.type === 'planks' && <PlankTracker onComplete={(reps) => onCompleteRep('planks', reps)} isActive={isActive} theme={theme} />}
      </View>
    );
  }, [currentIndex, flatListHeight, onCompleteRep, theme]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.modeBar, { 
        paddingTop: insets.top + 8,
        borderBottomColor: panelBorder, 
        backgroundColor: isDark ? '#020617cc' : '#ffffffcc' 
      }]}>
        <View style={styles.modeBarInner}>
          <ModeButton id="mental" label="Mental" icon={Brain} />
          <ModeButton id="physical" label="Physical" icon={Dumbbell} />
          <ModeButton id="mixed" label="Mixed" icon={Zap} />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={reps}
        keyExtractor={(item) => item.id}
        pagingEnabled
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onLayout={(e) => setFlatListHeight(e.nativeEvent.layout.height)}
        getItemLayout={(_, index) => ({ 
          length: flatListHeight, 
          offset: flatListHeight * index, 
          index 
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ 
          itemVisiblePercentThreshold: 80, // Be more strict about what's "active"
        }}
        renderItem={renderItem}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        removeClippedSubviews={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeBar: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  modeBarInner: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 6,
  },
  modeButtonText: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
