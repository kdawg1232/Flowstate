import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Layers, Timer, Zap, Check, X, Play, ChevronDown, ArrowRight } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (score: number) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'GREEN', hex: '#22c55e' },
  { name: 'YELLOW', hex: '#eab308' },
  { name: 'PURPLE', hex: '#a855f7' },
];

function LogicLinkGame({ onComplete, isActive, theme = 'dark' }: Props) {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [trial, setTrial] = useState<{ topWord: string; bottomWord: string; bottomColorHex: string; isMatch: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const generateTrial = useCallback(() => {
    const topIdx = Math.floor(Math.random() * COLORS.length);
    const topWord = COLORS[topIdx].name;
    const isMatch = Math.random() > 0.5;
    let bottomColorHex: string;
    let bottomWord: string;

    if (isMatch) {
      bottomColorHex = COLORS[topIdx].hex;
    } else {
      let differentIdx;
      do { differentIdx = Math.floor(Math.random() * COLORS.length); } while (differentIdx === topIdx);
      bottomColorHex = COLORS[differentIdx].hex;
    }

    bottomWord = COLORS[Math.floor(Math.random() * COLORS.length)].name;
    setTrial({ topWord, bottomWord, bottomColorHex, isMatch });
    setFeedback(null);
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(15);
    setGameState(GameState.PLAYING);
    generateTrial();
  };

  useEffect(() => {
    if (!isActive) setGameState(GameState.IDLE);
  }, [isActive]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft <= 0 && gameState === GameState.PLAYING) {
      setGameState(GameState.FINISHED);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => onComplete(score), 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timeLeft, score, onComplete]);

  const handleDecision = (choice: boolean) => {
    if (gameState !== GameState.PLAYING || !trial) return;
    if (choice === trial.isMatch) {
      setScore(s => s + 1);
      setFeedback('correct');
      setTimeout(generateTrial, 100);
    } else {
      setFeedback('wrong');
      setTimeout(generateTrial, 300);
    }
  };

  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const cardBgClass = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <View className={`flex-1 px-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center justify-center">
            <View className={`w-20 h-20 ${isDark ? 'bg-rose-500/20 border-rose-500/40' : 'bg-white border-rose-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Layers color="#f43f5e" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase ${textColorClass}`}>Logic Link</Text>
            <Text className={`${subTextColorClass} text-[10px] uppercase tracking-[0.2em] mb-10 text-center max-w-[280px]`}>
              Does the meaning of the top word match the text color of the bottom word?
            </Text>
            <Pressable onPress={startGame} className="bg-rose-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">INITIATE SYNC</Text>
            </Pressable>
          </MotiView>
        ) : gameState === GameState.FINISHED ? (
          <MotiView key="finished" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-6 border border-emerald-500/40">
              <Check color="#10b981" size={32} />
            </View>
            <Text weight="black" className={`text-3xl italic mb-2 uppercase tracking-tighter ${textColorClass}`}>SYNC COMPLETE</Text>
            
            <View className="bg-rose-500/10 border border-rose-500/20 px-8 py-4 rounded-3xl items-center mb-10">
              <Text variant="mono" className="text-rose-500 text-4xl mb-1 tracking-widest">{score}</Text>
              <Text weight="bold" className="text-rose-500/60 text-[10px] uppercase tracking-[0.2em]">LOGIC SCORE</Text>
            </View>

            <View className="items-center gap-6">
               <View className="bg-white/5 px-6 py-4 rounded-2xl flex-row items-center gap-3">
                  <Text weight="black" className="text-emerald-500 uppercase">NEXT GAME READY</Text>
                  <ArrowRight color="#10b981" size={18} />
               </View>
               
               <View className="items-center gap-2 opacity-40">
                 <Text weight="bold" className={`${subTextColorClass} text-[10px] uppercase tracking-[0.4em]`}>Scroll to continue</Text>
                 <ChevronDown color={isDark ? "#94a3b8" : "#64748b"} size={20} />
               </View>
            </View>
          </MotiView>
        ) : (
          <MotiView key="play" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center">
             <View style={{ marginTop: insets.top + 80 }} className="w-full flex-row justify-between mb-8">
                <View className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                  <Timer size={14} color="#f43f5e" />
                  <Text variant="mono" className="text-rose-500 text-sm">{timeLeft}s</Text>
                </View>
                <View className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                  <Zap size={14} color="#eab308" />
                  <Text variant="mono" className="text-yellow-500 text-sm">{score}</Text>
                </View>
              </View>
              
              <View className="flex-1 items-center justify-center w-full gap-6 max-w-[280px]">
                <MotiView 
                  animate={feedback === 'wrong' ? { translateX: [0, -10, 10, -10, 10, 0] } : {}} 
                  className={`w-full py-8 rounded-[2rem] ${cardBgClass} border-2 items-center justify-center shadow-lg`}
                >
                  <Text weight="black" className={`text-3xl tracking-widest ${textColorClass}`}>{trial?.topWord}</Text>
                </MotiView>
                <View className={`h-1.5 w-16 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <MotiView 
                  animate={feedback === 'wrong' ? { translateX: [0, -10, 10, -10, 10, 0] } : {}} 
                  className={`w-full py-8 rounded-[2rem] ${cardBgClass} border-2 items-center justify-center shadow-lg`}
                >
                  <Text weight="black" className="text-3xl tracking-widest" style={{ color: trial?.bottomColorHex }}>{trial?.bottomWord}</Text>
                </MotiView>
              </View>

              <View className="w-full flex-row gap-4 mt-8 mb-10">
                <Pressable onPress={() => handleDecision(false)} className={`flex-1 ${cardBgClass} py-5 rounded-[2rem] border-2 items-center gap-1`}>
                  <X color="#f43f5e" size={24} strokeWidth={3} />
                  <Text weight="black" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>NO</Text>
                </Pressable>
                <Pressable onPress={() => handleDecision(true)} className={`flex-1 ${cardBgClass} py-5 rounded-[2rem] border-2 items-center gap-1`}>
                  <Check color="#10b981" size={24} strokeWidth={3} />
                  <Text weight="black" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>YES</Text>
                </Pressable>
              </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

export default React.memo(LogicLinkGame);
