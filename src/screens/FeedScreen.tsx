import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GameType } from '../types';

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
  const dragStartIndexRef = useRef(0);
  const isUserDraggingRef = useRef(false);
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

  const bg = isDark ? '#000000' : '#f8fafc';

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

  const onScrollBeginDrag = React.useCallback(() => {
    isUserDraggingRef.current = true;
    dragStartIndexRef.current = currentIndexRef.current;
  }, []);

  const onScrollEndDrag = React.useCallback(() => {
    isUserDraggingRef.current = false;
  }, []);

  const onMomentumScrollEnd = React.useCallback(() => {
    dragStartIndexRef.current = currentIndexRef.current;
  }, []);

  const onScroll = React.useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isUserDraggingRef.current) return;

    const minOffset = dragStartIndexRef.current * flatListHeight;
    const y = e.nativeEvent.contentOffset.y;

    // Hard-stop any backward movement before a previous card becomes visible.
    if (y < minOffset) {
      flatListRef.current?.scrollToOffset({ offset: minOffset, animated: false });
    }
  }, [flatListHeight]);

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
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onLayout={(e) => setFlatListHeight(e.nativeEvent.layout.height)}
        getItemLayout={(_, index) => ({ 
          length: flatListHeight, 
          offset: flatListHeight * index, 
          index 
        })}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={onScroll}
        scrollEventThrottle={16}
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
    transform: [{ translateY: 10 }],
  },
  numberHuntOffset: {
    flex: 1,
    transform: [{ translateY: 10 }],
  },
});
