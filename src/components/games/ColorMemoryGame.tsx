
import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, Dimensions, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameState } from '../../types';
import { Brain, Play, ChevronDown, Check, X, Zap, ArrowRight } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (reps: number) => void;
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

const ColorMemoryGame: React.FC<Props> = ({ onComplete, isActive, theme = 'dark', onLockScroll }) => {
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const startLevel = useCallback(async (lvl: number) => {
    setGameState(GameState.OBSERVATION);
    setShowSuccess(false);
    setUserSequence([]);
    
    // Generate new sequence
    const sequenceLength = lvl + 2; 
    const newSequence = Array.from({ length: sequenceLength }, () => Math.floor(Math.random() * 4));
    setSequence(newSequence);

    // Playback sequence
    for (let i = 0; i < newSequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setActiveColor(newSequence[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
      setActiveColor(null);
    }

    setGameState(GameState.ACTION);
  }, []);

  const handleColorClick = (colorId: number) => {
    if (gameState !== GameState.ACTION) return;

    const nextUserSequence = [...userSequence, colorId];
    setUserSequence(nextUserSequence);
    
    // Visual feedback
    setActiveColor(colorId);
    setTimeout(() => setActiveColor(null), 200);

    const currentIndex = nextUserSequence.length - 1;
    if (nextUserSequence[currentIndex] !== sequence[currentIndex]) {
      setGameState(GameState.FAILURE);
      onComplete((level - 1) * 10);
      return;
    }

    if (nextUserSequence.length === sequence.length) {
      setGameState(GameState.SUCCESS);
      setShowSuccess(true);
      setTimeout(() => {
        setLevel(prev => prev + 1);
        startLevel(level + 1);
      }, 1000);
    }
  };

  const startGame = () => {
    setLevel(1);
    startLevel(1);
  };

  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-500' : 'text-slate-400';

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
    }
  }, [isActive]);

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
    <View className={`flex-1 w-full ${isDark ? 'bg-[#05070a]' : 'bg-slate-50'} px-6 pb-24 relative overflow-hidden`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView 
            key="idle" 
            from={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center"
          >
            <View className={`w-20 h-20 ${isDark ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white border-indigo-100 shadow-sm'} rounded-3xl items-center justify-center mb-6 border`}>
              <Brain color="#6366f1" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase text-center ${textColor}`}>Color Memory</Text>
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
        ) : gameState === GameState.FAILURE ? (
          <MotiView 
            key="fail" 
            from={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center"
          >
            <View className="w-20 h-20 rounded-full bg-rose-500/20 items-center justify-center mb-8 border border-rose-500/40">
              <X color="#f43f5e" size={40} />
            </View>
            <Text weight="black" className={`text-4xl italic mb-3 uppercase tracking-tighter text-center ${textColor}`}>REP LOGGED</Text>
            
            <View className="bg-indigo-500/10 border border-indigo-500/20 px-10 py-6 rounded-[2.5rem] items-center mb-12">
              <Text variant="mono" className="text-indigo-400 text-6xl mb-1 tracking-widest text-center">{(level - 1) * 10}</Text>
              <Text weight="bold" className="text-indigo-500/60 text-[10px] uppercase tracking-[0.3em]">MEMORY SCORE</Text>
            </View>

            <View className="items-center gap-6">
               <View className="bg-white/5 px-6 py-4 rounded-2xl flex-row items-center gap-3">
                  <Text weight="black" className="text-emerald-500 uppercase">NEXT GAME READY</Text>
                  <ArrowRight color="#10b981" size={18} />
               </View>
               
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
            </View>
          </MotiView>
        ) : (
          <MotiView 
            key="play" 
            from={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center"
          >
            {/* Header Pills */}
            <View style={{ position: 'absolute', top: insets.top + 20, left: 0, right: 0 }} className="flex-row justify-between px-2">
              <View className="flex-row items-center gap-2 bg-[#121620] border border-white/5 px-4 py-2 rounded-full">
                <Zap size={14} color="#6366f1" fill="#6366f1" />
                <Text variant="mono" weight="bold" className="text-indigo-400 text-xs uppercase tracking-widest">LVL {level}</Text>
              </View>
              <View className="flex-row items-center gap-2 bg-[#121620] border border-white/5 px-4 py-2 rounded-full">
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
    </View>
  );
};

export default React.memo(ColorMemoryGame);
