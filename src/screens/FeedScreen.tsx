import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View, ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GameType, UserStats } from '../types';
import { Brain } from 'lucide-react-native';
import { Text } from '../ui/Text';

// Ported Games
import PulsePatternGame from '../components/games/PulsePatternGame';
import SignalScanGame from '../components/games/SignalScanGame';
import LogicLinkGame from '../components/games/LogicLinkGame';
import MentalMathGame from '../components/games/MentalMathGame';
import UntangleGame from '../components/games/UntangleGame';
import BridgesGame from '../components/games/BridgesGame';
import KeenGame from '../components/games/KeenGame';
import ColorMemoryGame from '../components/games/ColorMemoryGame';
import NumberHuntGame from '../components/games/NumberHuntGame';
import MapGame from '../components/games/MapGame';
import PushupTracker from '../components/games/PushupTracker';
import SitupTracker from '../components/games/SitupTracker';
import PlankTracker from '../components/games/PlankTracker';

type Rep = { id: string; type: GameType };

type Props = {
  theme: 'light' | 'dark';
  onCompleteRep: (type: GameType, score: number, isClean?: boolean) => void;
  onScrollXp: () => void;
};

const FeedItem = React.memo(({ 
  item, 
  index, 
  currentIndex, 
  flatListHeight, 
  onCompleteRep, 
  theme, 
  setScrollEnabled 
}: {
  item: Rep;
  index: number;
  currentIndex: number;
  flatListHeight: number;
  onCompleteRep: (type: GameType, score: number, isClean?: boolean) => void;
  theme: 'light' | 'dark';
  setScrollEnabled: (enabled: boolean) => void;
}) => {
  const isActive = index === currentIndex;
  
  return (
    <View style={{ height: flatListHeight, width: '100%' }}>
      <View style={styles.feedItemFrame}>
        {item.type === 'pulse' && <PulsePatternGame onComplete={(lvl, clean) => onCompleteRep('pulse', lvl, clean)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />}
        {item.type === 'signal' && <SignalScanGame onComplete={(scr, clean) => onCompleteRep('signal', scr, clean)} isActive={isActive} theme={theme} />}
        {item.type === 'logic_link' && <LogicLinkGame onComplete={(scr, clean) => onCompleteRep('logic_link', scr, clean)} isActive={isActive} theme={theme} />}
        {item.type === 'math_dash' && <MentalMathGame onComplete={(scr, clean) => onCompleteRep('math_dash', scr, clean)} isActive={isActive} theme={theme} />}
        {item.type === 'untangle' && <UntangleGame onComplete={(scr, clean) => onCompleteRep('untangle', scr, clean)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />}
        {item.type === 'bridges' && (
          <View style={styles.bridgesOffset}>
            <BridgesGame onComplete={(scr, clean) => onCompleteRep('bridges', scr, clean)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />
          </View>
        )}
        {item.type === 'keen' && <KeenGame onComplete={(scr, clean) => onCompleteRep('keen', scr, clean)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />}
        {item.type === 'color_memory' && (
          <View style={styles.colorMemoryOffset}>
            <ColorMemoryGame onComplete={(scr, clean) => onCompleteRep('color_memory', scr, clean)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />
          </View>
        )}
        {item.type === 'number_hunt' && (
          <View style={styles.numberHuntOffset}>
            <NumberHuntGame onComplete={(scr, clean) => onCompleteRep('number_hunt', scr, clean)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />
          </View>
        )}
        {item.type === 'map' && <MapGame onComplete={(scr, clean) => onCompleteRep('map', scr, clean)} isActive={isActive} theme={theme} onLockScroll={setScrollEnabled} />}
        
        {item.type === 'pushups' && <PushupTracker onComplete={(reps, clean) => onCompleteRep('pushups', reps, clean)} isActive={isActive} theme={theme} />}
        {item.type === 'situps' && <SitupTracker onComplete={(reps, clean) => onCompleteRep('situps', reps, clean)} isActive={isActive} theme={theme} />}
        {item.type === 'planks' && <PlankTracker onComplete={(reps, clean) => onCompleteRep('planks', reps, clean)} isActive={isActive} theme={theme} />}
      </View>
    </View>
  );
}, (prev, next) => {
  // Only re-render if this item is entering or leaving the active state,
  // or if global props that affect all items change.
  const wasActive = prev.index === prev.currentIndex;
  const isNowActive = next.index === next.currentIndex;
  
  if (wasActive !== isNowActive) return false; // activation state changed
  if (prev.theme !== next.theme) return false;
  if (prev.flatListHeight !== next.flatListHeight) return false;
  if (prev.item.id !== next.item.id) return false;
  
  return true; // props are effectively the same for this item
});

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const NAV_HEIGHT = 84;

export function FeedScreen({ theme, onCompleteRep, onScrollXp }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const flatListRef = useRef<FlatList<Rep>>(null);
  const currentIndexRef = useRef(0);
  const insets = useSafeAreaInsets();
  const [flatListHeight, setFlatListHeight] = useState(SCREEN_HEIGHT - NAV_HEIGHT - insets.top);

  const isDark = theme === 'dark';

  const reps = useMemo(() => {
    const mentalPool: GameType[] = ['pulse', 'signal', 'logic_link', 'math_dash', 'untangle', 'bridges', 'keen', 'color_memory', 'number_hunt', 'map'];
    const generated: Rep[] = [];
    let lastType: GameType | null = null;

    for (let i = 0; i < 60; i++) {
      const available = mentalPool.filter((t) => t !== lastType);
      const selected = available[Math.floor(Math.random() * available.length)];
      generated.push({ id: `node-${i}-mental`, type: selected });
      lastType = selected;
    }

    return generated;
  }, []);

  const bg = isDark ? '#020617' : '#f8fafc';
  const panelBorder = isDark ? '#0f172a' : '#e2e8f0';
  const text = isDark ? '#ffffff' : '#0f172a';
  const subText = isDark ? '#94a3b8' : '#64748b';

  const ModeButton = ({ label, icon: Icon }: { label: string; icon: any }) => {
    const active = true; // Always active for Mental in V1
    return (
      <Pressable
        style={({ pressed }) => [
          styles.modeButton,
          {
            backgroundColor: active ? (isDark ? '#1e293b' : '#ffffff') : isDark ? '#0f172a66' : '#f1f5f9',
            borderColor: active ? (isDark ? '#334155' : '#cbd5e1') : isDark ? '#1e293b80' : '#e2e8f0',
            opacity: pressed ? 0.7 : active ? 1 : 0.6,
            transform: [{ scale: active ? 1.05 : 1 }],
          },
        ]}
        disabled
      >
        <Icon size={18} color={active ? '#06b6d4' : (isDark ? '#64748b' : '#94a3b8')} />
        <Text weight="black" style={[styles.modeButtonText, { color: active ? text : subText }]}>{label}</Text>
      </Pressable>
    );
  };

  const onScrollXpRef = useRef(onScrollXp);
  onScrollXpRef.current = onScrollXp;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<any> }) => {
    const mostVisible = viewableItems.sort((a, b) => (b.itemVisiblePercent || 0) - (a.itemVisiblePercent || 0))[0];
    
    if (!mostVisible || (!mostVisible.index && mostVisible.index !== 0)) return;
    const newIndex = mostVisible.index;
    const idx = currentIndexRef.current;
    
    if (newIndex < idx) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      return;
    }

    if (newIndex > idx) {
      onScrollXpRef.current();
      currentIndexRef.current = newIndex;
      setCurrentIndex(newIndex);
    }
  }).current;

  const renderItem = React.useCallback(({ item, index }: { item: Rep, index: number }) => (
    <FeedItem 
      item={item}
      index={index}
      currentIndex={currentIndex}
      flatListHeight={flatListHeight}
      onCompleteRep={onCompleteRep}
      theme={theme}
      setScrollEnabled={setScrollEnabled}
    />
  ), [currentIndex, flatListHeight, onCompleteRep, theme, setScrollEnabled]);

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
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
        windowSize={5}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews={false}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
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
  feedItemFrame: {
    flex: 1,
    transform: [{ translateY: -12 }],
  },
  bridgesOffset: {
    flex: 1,
    transform: [{ translateY: 10 }],
  },
  colorMemoryOffset: {
    flex: 1,
    transform: [{ translateY: 80 }],
  },
  numberHuntOffset: {
    flex: 1,
    transform: [{ translateY: 10 }],
  },
});
