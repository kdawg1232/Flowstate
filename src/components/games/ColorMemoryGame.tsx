
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, Dimensions, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameState } from '../../types';
import { Brain, Play, ChevronDown, Check, X, Zap, Info } from 'lucide-react-native';
import { Text } from '../../ui/Text';
import GameIconGlow from './GameIconGlow';

interface Props {
  onComplete: (reps: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (lock: boolean) => void;
}

const COLORS = [
  { id: 0, name: 'RED', base: '#b91c1c', active: '#f87171', glow: 'rgba(248, 113, 113, 0.6)' },
  { id: 1, name: 'GREEN', base: '#15803d', active: '#4ade80', glow: 'rgba(74, 222, 128, 0.6)' },
  { id: 2, name: 'BLUE', base: '#1d4ed8', active: '#60a5fa', glow: 'rgba(96, 165, 250, 0.6)' },
  { id: 3, name: 'YELLOW', base: '#a16207', active: '#facc15', glow: 'rgba(250, 204, 21, 0.6)' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = Math.min(SCREEN_WIDTH - 64, 320);
const PADDING = 16;
const GAP = 12;
const BUTTON_SIZE = (GRID_SIZE - PADDING * 2 - GAP) / 2;
const MAX_LEVEL = 10;

const ColorMemoryGame: React.FC<Props> = ({ onComplete, isActive, theme = 'dark', onLockScroll }) => {
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [showInfo, setShowInfo] = useState(false);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [playbackId, setPlaybackId] = useState(0); // Used to cancel stale playbacks
  const [showFailureFeedback, setShowFailureFeedback] = useState(false);
  const [failureReps, setFailureReps] = useState(0);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter(t => t !== id);
      fn();
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const startLevel = useCallback(async (lvl: number, currentPlaybackId: number) => {
    setGameState(GameState.OBSERVATION);
    setShowSuccess(false);
    setUserSequence([]);
    
    // Generate new sequence
    const sequenceLength = lvl + 2; 
    const newSequence = Array.from({ length: sequenceLength }, () => Math.floor(Math.random() * 4));
    setSequence(newSequence);

    // Playback sequence with cancellation check
    for (let i = 0; i < newSequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Check if this playback is still valid (not cancelled by a new game/reset)
      // We use a ref pattern via closure - if playbackId changed, abort
      setPlaybackId(id => {
        if (id !== currentPlaybackId) return id; // Stale playback, don't update
        setActiveColor(newSequence[i]);
        return id;
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setPlaybackId(id => {
        if (id !== currentPlaybackId) return id;
        setActiveColor(null);
        return id;
      });
    }

    // Only transition to ACTION if this playback is still valid
    setPlaybackId(id => {
      if (id !== currentPlaybackId) return id;
      setGameState(GameState.ACTION);
      return id;
    });
  }, []);

  const handleColorClick = (colorId: number) => {
    if (gameState !== GameState.ACTION) return;

    const nextUserSequence = [...userSequence, colorId];
    setUserSequence(nextUserSequence);
    
    setActiveColor(colorId);
    safeTimeout(() => setActiveColor(null), 200);

    const currentIndex = nextUserSequence.length - 1;
    if (nextUserSequence[currentIndex] !== sequence[currentIndex]) {
      const reps = Math.max(0, (level - 1) * 10);
      setFailureReps(reps);
      setShowFailureFeedback(true);
      setGameState(GameState.FAILURE);
      onComplete(reps, false);
      return;
    }

    if (nextUserSequence.length === sequence.length) {
      if (level >= MAX_LEVEL) {
        setGameState(GameState.FINISHED);
        setShowSuccess(true);
        safeTimeout(() => {
          onComplete(level * 10, true);
        }, 1000);
      } else {
        setGameState(GameState.SUCCESS);
        setShowSuccess(true);
        safeTimeout(() => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          setPlaybackId(prev => {
            const newId = prev + 1;
            startLevel(nextLevel, newId);
            return newId;
          });
        }, 1000);
      }
    }
  };

  const startGame = () => {
    setLevel(1);
    setFailureReps(0);
    setShowFailureFeedback(false);
    // Increment playbackId to cancel any stale playbacks and start fresh
    setPlaybackId(prev => {
      const newId = prev + 1;
      startLevel(1, newId);
      return newId;
    });
  };

  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-500' : 'text-slate-400';

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
      setPlaybackId(prev => prev + 1);
      setActiveColor(null);
      setShowFailureFeedback(false);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    }
  }, [isActive]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const sequenceText = sequence.map(idx => COLORS[idx]?.name ?? '?').join(' -> ');

  // Calculate button position based on index
  const getButtonStyle = (index: number, isActive: boolean, color: typeof COLORS[0]) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const left = PADDING + col * (BUTTON_SIZE + GAP);
    const top = PADDING + row * (BUTTON_SIZE + GAP);
    
    return {
      position: 'absolute' as const,
      left,
      top,
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      borderRadius: 24,
      backgroundColor: isActive ? color.active : color.base,
      shadowColor: color.glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isActive ? 1 : 0,
      shadowRadius: 20,
      elevation: isActive ? 10 : 0,
    };
  };

  return (
    <View className={`flex-1 w-full ${isDark ? 'bg-black' : 'bg-slate-50'} relative overflow-hidden`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView 
            key="idle" 
            from={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center px-6"
          >
            <View className="relative mb-6 items-center justify-center">
              <GameIconGlow color="#6366f1" glowId="colorMemoryGlow" />
              <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-indigo-100 shadow-sm'} rounded-3xl items-center justify-center border`}>
                <Brain color="#6366f1" size={40} />
              </View>
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-2 uppercase text-center ${textColor}`}>Color Memory</Text>
            <Pressable onPress={() => setShowInfo(true)} hitSlop={12} className="mb-2 p-2 self-center">
              <Info size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#64748b'} />
            </Pressable>
            <Text className={`${subTextColor} text-xs uppercase tracking-[0.2em] mb-10 max-w-[240px] text-center leading-relaxed`}>
              Memorize the sequence of neural flashes. Replicate the frequency perfectly.
            </Text>
            <Pressable 
              onPress={startGame} 
              className="bg-indigo-600 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl active:scale-95"
            >
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">BEGIN SEQUENCE</Text>
            </Pressable>
          </MotiView>
        ) : gameState === GameState.FINISHED ? (
          <MotiView 
            key="finished" 
            from={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center px-6"
          >
            <View className="w-20 h-20 rounded-full bg-emerald-500/20 items-center justify-center mb-8 border border-emerald-500/40">
              <Check color="#10b981" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic mb-2 uppercase tracking-tighter text-center ${textColor}`}>
              Total reps logged
            </Text>
            <Text variant="mono" className="text-emerald-400 text-2xl tracking-widest uppercase mb-10">
              {level * 10} reps logged
            </Text>

            <View className="items-center gap-2 opacity-40">
              <Text weight="bold" className={`${subTextColor} text-[10px] uppercase tracking-[0.4em]`}>Scroll to continue</Text>
              <MotiView
                from={{ translateY: 0 }}
                animate={{ translateY: 10 }}
                transition={{ loop: true, type: 'timing', duration: 1000 }}
              >
                <ChevronDown color={isDark ? "#94a3b8" : "#64748b"} size={24} />
              </MotiView>
            </View>
          </MotiView>
        ) : gameState === GameState.FAILURE ? (
          showFailureFeedback ? (
            <Pressable
              onPress={() => setShowFailureFeedback(false)}
              className="flex-1 w-full"
            >
              <MotiView
              key="fail-feedback"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 220 }}
              className="flex-1 items-center justify-center px-6"
            >
              <View className="items-center justify-center mb-12">
                <View
                  style={{ width: GRID_SIZE, height: GRID_SIZE }}
                  className="rounded-[2rem] overflow-hidden bg-black/40 border border-white/10 relative"
                >
                  {COLORS.map((color, index) => (
                    <View key={color.id} style={getButtonStyle(index, activeColor === color.id, color)} />
                  ))}
                </View>
              </View>

              <View className="w-full max-w-[340px] items-center">
                <Text weight="black" className="text-rose-400 text-xs uppercase tracking-[0.35em] mb-3 text-center">
                  Wrong color clicked
                </Text>
                <Text className={`${subTextColor} text-[11px] uppercase tracking-[0.2em] text-center mb-2`}>
                  Correct order of the flashes
                </Text>
                <Text variant="mono" className={`text-[12px] tracking-[0.08em] text-center ${textColor}`}>
                  {sequenceText}
                </Text>
                <Text className={`${subTextColor} text-[10px] uppercase tracking-[0.25em] text-center mt-6`}>
                  Tap anywhere to continue
                </Text>
              </View>
              </MotiView>
            </Pressable>
          ) : (
            <MotiView 
              key="fail" 
              from={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              className="flex-1 items-center justify-center px-6"
            >
              <View className="w-20 h-20 rounded-full bg-rose-500/20 items-center justify-center mb-8 border border-rose-500/40">
                <X color="#f43f5e" size={40} />
              </View>
              <Text weight="black" className={`text-3xl italic mb-3 uppercase tracking-tighter text-center ${textColor}`}>
                Total reps logged
              </Text>
              
              <Text variant="mono" className="text-emerald-400 text-4xl tracking-widest mb-10 uppercase">
                +{failureReps}
              </Text>

              <View className="items-center gap-2 opacity-40">
                <Text weight="bold" className={`${subTextColor} text-[10px] uppercase tracking-[0.4em]`}>Scroll to continue</Text>
                <MotiView
                  from={{ translateY: 0 }}
                  animate={{ translateY: 10 }}
                  transition={{ loop: true, type: 'timing', duration: 1000 }}
                >
                  <ChevronDown color={isDark ? "#94a3b8" : "#64748b"} size={24} />
                </MotiView>
              </View>
            </MotiView>
          )
        ) : (
          <MotiView 
            key="play" 
            from={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center"
          >
            {/* Header Pills - positioned below status bar with extra padding */}
            <View style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0 }} className="flex-row justify-between px-4">
              <View className={`flex-row items-center gap-2 ${isDark ? 'bg-[#121620] border-white/5' : 'bg-white border-slate-200'} border px-4 py-2 rounded-full`}>
                <Zap size={14} color="#6366f1" fill="#6366f1" />
                <Text variant="mono" weight="bold" className="text-indigo-400 text-xs uppercase tracking-widest">LVL {level}</Text>
              </View>
              <View className={`flex-row items-center gap-2 ${isDark ? 'bg-[#121620] border-white/5' : 'bg-white border-slate-200'} border px-4 py-2 rounded-full`}>
                <Check size={14} color="#10b981" />
                <Text variant="mono" weight="bold" className="text-emerald-500 text-xs uppercase tracking-widest">{userSequence.length} / {sequence.length}</Text>
              </View>
            </View>

            {/* Game Grid Container */}
            <View className="items-center justify-center mb-12">
              <View 
                style={{ width: GRID_SIZE, height: GRID_SIZE }}
                className="rounded-[2rem] overflow-hidden bg-black/40 border border-white/10 relative"
              >
                {COLORS.map((color, index) => (
                  <Pressable
                    key={color.id}
                    onPress={() => handleColorClick(color.id)}
                    disabled={gameState !== GameState.ACTION}
                    style={getButtonStyle(index, activeColor === color.id, color)}
                  >
                    {activeColor === color.id && (
                      <MotiView 
                        from={{ opacity: 0 }} 
                        animate={{ opacity: 0.4 }} 
                        style={StyleSheet.absoluteFill}
                        className="bg-white rounded-[24px]" 
                      />
                    )}
                  </Pressable>
                ))}
                
                <AnimatePresence>
                  {showSuccess && (
                    <MotiView 
                      from={{ opacity: 0, scale: 0.5 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.5 }}
                      style={StyleSheet.absoluteFill}
                      className="items-center justify-center pointer-events-none z-50 rounded-[2rem]"
                      transition={{ type: 'spring' }}
                    >
                      <View className="bg-emerald-500 p-6 rounded-full">
                        <Check color="white" size={64} strokeWidth={4} />
                      </View>
                    </MotiView>
                  )}
                </AnimatePresence>
              </View>
            </View>

            <Text weight="black" className={`${subTextColor} text-[10px] uppercase tracking-[0.4em] text-center`}>
              {gameState === GameState.OBSERVATION ? "Observe the frequency" : "Replicate the pattern"}
            </Text>
          </MotiView>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfo && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 200 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
            className="items-center justify-center px-8 bg-black/85"
          >
            <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowInfo(false)} />
            <MotiView
              from={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'timing', duration: 200 }}
              style={{ zIndex: 51, width: '100%' }}
              className="bg-slate-900 rounded-3xl p-8 border border-white/10"
            >
              <Text weight="black" className="text-white text-xl uppercase tracking-tighter mb-5">How to Play</Text>
              <Text className="text-slate-400 text-sm leading-relaxed mb-2">
                Four colored buttons will flash one by one in a sequence — watch carefully.
              </Text>
              <Text className="text-slate-400 text-sm leading-relaxed mb-2">
                After the sequence ends, repeat it by tapping the same colors in the same order.
              </Text>
              <Text className="text-slate-400 text-sm leading-relaxed">
                Each level adds one more flash. A wrong tap ends the round.
              </Text>
              <Pressable onPress={() => setShowInfo(false)} className="mt-6 bg-indigo-600/30 border border-indigo-500/40 py-3 rounded-2xl items-center">
                <Text weight="black" className="text-indigo-400 uppercase text-sm tracking-widest">Got It</Text>
              </Pressable>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

export default React.memo(ColorMemoryGame);
