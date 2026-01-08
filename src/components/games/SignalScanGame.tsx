import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Activity, Binary, Cpu, Network, Zap, Check, X, Timer, Play, ChevronDown, ArrowRight } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (score: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

const SYMBOLS = [Zap, Activity, Binary, Cpu, Network];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_SIZE = Math.min(SCREEN_WIDTH * 0.4, 150);

function SignalScanGame({ onComplete, isActive, theme = 'dark' }: Props) {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [currentSymbolIdx, setCurrentSymbolIdx] = useState<number | null>(null);
  const [prevSymbolIdx, setPrevSymbolIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const startGame = () => { 
    setScore(0); 
    setTimeLeft(15); 
    setGameState(GameState.OBSERVATION);
    const initialIdx = Math.floor(Math.random() * SYMBOLS.length);
    setCurrentSymbolIdx(initialIdx);
    setPrevSymbolIdx(null);

    setTimeout(() => {
      setGameState(GameState.PLAYING);
      nextRound(initialIdx);
    }, 800);
  };

  const nextRound = (currentIdx?: number) => { 
    setPrevSymbolIdx(currentIdx !== undefined ? currentIdx : currentSymbolIdx); 
    setCurrentSymbolIdx(Math.floor(Math.random() * SYMBOLS.length)); 
    setFeedback(null); 
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
      setTimeout(() => onComplete(score, true), 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timeLeft, score, onComplete]);

  const handleDecision = (isMatchRequest: boolean) => {
    if (gameState !== GameState.PLAYING || prevSymbolIdx === null) return;
    if (isMatchRequest === (currentSymbolIdx === prevSymbolIdx)) { 
      setScore(s => s + 1); 
      setFeedback('correct'); 
    } else {
      setFeedback('wrong');
    }
    setTimeout(() => nextRound(), 150);
  };

  const ActiveIcon = currentSymbolIdx !== null ? SYMBOLS[currentSymbolIdx] : Zap;
  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const controlBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  return (
    <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center justify-center px-6">
            <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-amber-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Activity color="#f59e0b" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase ${textColorClass}`}>Signal Scan</Text>
            <Text className={`${subTextColorClass} text-xs uppercase tracking-[0.2em] mb-10 text-center max-w-[240px]`}>
              Discrimination Task: Does the current signal match the previous one?
            </Text>
            <Pressable onPress={startGame} className="bg-amber-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">INITIALIZE</Text>
            </Pressable>
          </MotiView>
        ) : (gameState === GameState.PLAYING || gameState === GameState.OBSERVATION) ? (
          <MotiView key="play" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center">
             <View style={{ marginTop: insets.top + 80 }} className="w-full flex-row justify-between mb-8">
                <View className={`flex-row items-center gap-2 ${controlBgClass} px-4 py-2 rounded-full border`}>
                  <Timer size={14} color="#f59e0b" />
                  <Text variant="mono" className="text-amber-500 text-sm">{timeLeft}s</Text>
                </View>
                <View className={`flex-row items-center gap-2 ${controlBgClass} px-4 py-2 rounded-full border`}>
                  <Zap size={14} color="#eab308" />
                  <Text variant="mono" className="text-yellow-500 text-sm">{score}</Text>
                </View>
              </View>
              
              <View className="flex-1 items-center justify-center w-full">
                <MotiView 
                  key={currentSymbolIdx} 
                  from={{ scale: 0.8, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className={`w-48 h-48 rounded-[2.5rem] border-2 items-center justify-center shadow-xl ${
                    feedback === 'correct' ? 'border-emerald-500 bg-emerald-500/10' : 
                    feedback === 'wrong' ? 'border-rose-500 bg-rose-500/10' : 
                    (isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white')
                  }`}
                >
                  <ActiveIcon size={80} color={feedback === 'correct' ? '#10b981' : feedback === 'wrong' ? '#f43f5e' : '#f59e0b'} />
                </MotiView>
                <Text weight="bold" className={`mt-10 ${subTextColorClass} text-[10px] uppercase tracking-[0.4em]`}>
                  {gameState === GameState.OBSERVATION ? "Readying Pulse..." : "Scanning sequence"}
                </Text>
              </View>

              <View className="w-full flex-row gap-4 mt-8 mb-10">
                <Pressable onPress={() => handleDecision(false)} disabled={gameState === GameState.OBSERVATION} className={`flex-1 ${controlBgClass} py-5 rounded-[2rem] border-2 items-center gap-1 ${gameState === GameState.OBSERVATION ? 'opacity-30' : ''}`}>
                  <X color="#f43f5e" size={24} strokeWidth={3} />
                  <Text weight="black" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>NO MATCH</Text>
                </Pressable>
                <Pressable onPress={() => handleDecision(true)} disabled={gameState === GameState.OBSERVATION} className={`flex-1 ${controlBgClass} py-5 rounded-[2rem] border-2 items-center gap-1 ${gameState === GameState.OBSERVATION ? 'opacity-30' : ''}`}>
                  <Check color="#10b981" size={24} strokeWidth={3} />
                  <Text weight="black" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>MATCH</Text>
                </Pressable>
              </View>
          </MotiView>
        ) : (
          <MotiView key="finished" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-6 border border-emerald-500/40">
              <Check color="#10b981" size={32} />
            </View>
            <Text weight="black" className={`text-3xl italic mb-2 uppercase tracking-tighter ${textColorClass}`}>SEQUENCE VERIFIED</Text>
            
            <View className="bg-amber-500/10 border border-amber-500/20 px-8 py-4 rounded-3xl items-center mb-10">
              <Text variant="mono" className="text-amber-500 text-4xl mb-1 tracking-widest">{score}</Text>
              <Text weight="bold" className="text-amber-500/60 text-[10px] uppercase tracking-[0.2em]">SCAN SCORE</Text>
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
        )}
      </AnimatePresence>
    </View>
  );
}

export default React.memo(SignalScanGame);
