
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, TextInput, Dimensions, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameState } from '../../types';
import { Target, Zap, Play, ChevronDown, Check, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface FloatingNumber {
  id: string;
  val: number;
  x: number; // 0-100
  y: number; // 0-100
  vx: number;
  vy: number;
  color: string;
}

interface Props {
  onComplete: (reps: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (lock: boolean) => void;
}

const COLORS = ['#06b6d4', '#f59e0b', '#6366f1', '#ec4899', '#10b981', '#ef4444'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOX_SIZE = Math.min(SCREEN_WIDTH - 48, 320);

const NumberHuntGame: React.FC<Props> = ({ onComplete, isActive, theme = 'dark', onLockScroll }) => {
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [numbers, setNumbers] = useState<FloatingNumber[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const requestRef = useRef<number>(null);
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';

  const generateLevel = useCallback((lvl: number) => {
    const numCount = lvl + 2; // Start with 3 numbers at level 1
    const newNumbers: FloatingNumber[] = [];
    
    for (let i = 0; i < numCount; i++) {
      newNumbers.push({
        id: `num-${lvl}-${i}`,
        val: Math.floor(Math.random() * 9) + 1,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 1.5, // Slightly faster for more challenge
        vy: (Math.random() - 0.5) * 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    setNumbers(newNumbers);
    setInputValue('');
    setFeedback(null);
    setGameState(GameState.PLAYING);
  }, []);

  const animate = useCallback(() => {
    setNumbers(prev => {
      return prev.map(n => {
        let nx = n.x + n.vx;
        let ny = n.y + n.vy;
        let nvx = n.vx;
        let nvy = n.vy;

        // Bounce boundaries (assuming 0-100 scale)
        if (nx < 5 || nx > 95) nvx *= -1;
        if (ny < 5 || ny > 95) nvy *= -1;

        return { ...n, x: nx, y: ny, vx: nvx, vy: nvy };
      });
    });
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, animate]);

  const startGame = () => {
    setLevel(1);
    generateLevel(1);
  };

  const handleSubmit = () => {
    if (gameState !== GameState.PLAYING) return;

    const sum = numbers.reduce((acc, curr) => acc + curr.val, 0);
    const userSum = parseInt(inputValue);

    if (userSum === sum) {
      setFeedback('correct');
      setTimeout(() => {
        const nextLevel = level + 1;
        setLevel(nextLevel);
        generateLevel(nextLevel);
      }, 600);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setGameState(GameState.FINISHED);
        onComplete(level * 10, true); // Level * 10 reps as requested
      }, 600);
    }
  };

  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-500' : 'text-slate-400';
  const boxBg = isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-inner';

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
    }
  }, [isActive]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View className={`flex-1 w-full ${isDark ? 'bg-black' : 'bg-slate-50'} relative overflow-hidden`}>
        <AnimatePresence exitBeforeEnter>
          {gameState === GameState.IDLE ? (
            <MotiView 
              key="instructions" 
              from={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              className="flex-1 items-center justify-center px-6"
            >
              <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-white border-indigo-100 shadow-sm'} rounded-3xl items-center justify-center mb-6 border`}>
                <Target color="#6366f1" size={40} />
              </View>
              <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase text-center ${textColor}`}>Number Hunt</Text>
              <Text className={`${subTextColor} text-xs uppercase tracking-[0.2em] mb-10 max-w-[240px] text-center leading-relaxed`}>
                Sum up all the floating nodes. Precision is key to the flow.
              </Text>
              <Pressable 
                onPress={startGame} 
                className="bg-indigo-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl active:scale-95"
              >
                <Play color="white" size={20} fill="white" />
                <Text weight="black" className="text-white uppercase">INITIATE HUNT</Text>
              </Pressable>
            </MotiView>
          ) : gameState === GameState.PLAYING ? (
            <MotiView 
              key="play" 
              from={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              className="flex-1 items-center"
              style={{ paddingTop: insets.top + 60 }}
            >
              <View className="w-full flex-row justify-between px-2 mb-8">
                <View className={`flex-row items-center gap-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} px-4 py-1.5 rounded-full border`}>
                  <Zap size={14} color="#6366f1" fill="#6366f1" />
                  <Text variant="mono" weight="bold" className="text-indigo-500 text-sm uppercase tracking-widest">LVL {level}</Text>
                </View>
                <View className={`flex-row items-center gap-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} px-4 py-1.5 rounded-full border`}>
                  <Target size={14} color="#eab308" />
                  <Text variant="mono" className="text-yellow-500 text-sm">{level * 10} REPS</Text>
                </View>
              </View>

              <View className="flex-1 w-full items-center justify-center mb-8">
                <View 
                  style={{ width: BOX_SIZE, height: BOX_SIZE }}
                  className={`relative rounded-[2.5rem] border-2 overflow-hidden ${boxBg} ${feedback === 'correct' ? 'border-emerald-500' : feedback === 'wrong' ? 'border-rose-500' : 'border-slate-800'}`}
                >
                  <View className="absolute inset-0 opacity-10 pointer-events-none">
                    <View className="w-full h-full border-[0.5px] border-indigo-500/20 flex-row flex-wrap">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <View key={i} style={{ width: '16.66%', height: '16.66%', borderBottomWidth: 0.5, borderRightWidth: 0.5, borderColor: 'rgba(99,102,241,0.1)' }} />
                      ))}
                    </View>
                  </View>

                  {numbers.map(n => (
                    <View 
                      key={n.id}
                      className="absolute items-center justify-center"
                      style={{ 
                        left: `${n.x}%`, 
                        top: `${n.y}%`, 
                        width: 40, 
                        height: 40, 
                        marginLeft: -20, 
                        marginTop: -20 
                      }}
                    >
                      <Text weight="black" style={{ color: n.color, fontSize: 32 }}>{n.val}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="w-full mt-4 mb-8 items-center">
                <TextInput 
                  keyboardType="numeric"
                  placeholder="TOTAL SUM"
                  placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                  value={inputValue}
                  onChangeText={setInputValue}
                  className={`w-full ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-2 rounded-2xl py-5 px-6 text-center text-3xl font-black tracking-widest ${feedback === 'correct' ? 'border-emerald-500 text-emerald-500' : feedback === 'wrong' ? 'border-rose-500 text-rose-500' : (isDark ? 'text-white' : 'text-slate-900')}`}
                  style={{ fontFamily: 'JetBrainsMono_500Medium' }}
                  autoFocus
                />
                <Pressable 
                  onPress={handleSubmit}
                  className="w-full bg-indigo-500 mt-4 py-5 rounded-2xl flex-row items-center justify-center gap-3 shadow-lg active:scale-95"
                >
                  <Text weight="black" className="text-white uppercase tracking-widest text-sm">Submit Calc</Text>
                  <Check color="white" size={18} strokeWidth={3} />
                </Pressable>
              </View>
            </MotiView>
          ) : (
            <MotiView 
              key="finished" 
              from={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              className="flex-1 items-center justify-center px-6"
            >
              <View className="w-20 h-20 rounded-full bg-emerald-500/20 items-center justify-center mb-8 border border-emerald-500/40">
                <AlertTriangle color="#10b981" size={40} />
              </View>
              <Text weight="black" className={`text-4xl italic mb-3 uppercase tracking-tighter text-center ${textColor}`}>REP LOGGED</Text>
              
              <View className="bg-indigo-500/10 border border-indigo-500/20 px-10 py-6 rounded-[2.5rem] items-center mb-12">
                <Text variant="mono" className="text-indigo-400 text-6xl mb-1 tracking-widest text-center">{level * 10}</Text>
                <Text weight="bold" className="text-indigo-500/60 text-[10px] uppercase tracking-[0.3em]">HUNT SCORE</Text>
              </View>

              <View className="items-center gap-6">
                 <Pressable 
                    onPress={startGame}
                    className="bg-white/5 px-8 py-4 rounded-2xl flex-row items-center gap-3 active:scale-95 border border-white/10"
                 >
                    <Text weight="black" className="text-emerald-500 uppercase tracking-widest text-xs">RESTART HUNT</Text>
                    <ArrowRight color="#10b981" size={18} />
                 </Pressable>
                 
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
          )}
        </AnimatePresence>
      </View>
    </KeyboardAvoidingView>
  );
};

export default React.memo(NumberHuntGame);
