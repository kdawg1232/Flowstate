import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Calculator, Timer, Zap, Play, ChevronDown, Check, ArrowRight } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (score: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

function MentalMathGame({ onComplete, isActive, theme = 'dark' }: Props) {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [trial, setTrial] = useState<{ equation: string; answer: number; options: number[] } | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const generateTrial = useCallback(() => {
    const ops = ['+', '-', '*', '/'];
    const complexity = Math.random();
    let equation = "";
    let answer = 0;

    if (complexity > 0.8) {
      const n1 = Math.floor(Math.random() * 20) + 1;
      const n2 = Math.floor(Math.random() * 20) + 1;
      const n3 = Math.floor(Math.random() * 10) + 1;
      const op1 = Math.random() > 0.5 ? '+' : '-';
      equation = `(${n1} ${op1} ${n2}) * ${n3}`;
      answer = op1 === '+' ? (n1 + n2) * n3 : (n1 - n2) * n3;
    } else {
      const op = ops[Math.floor(Math.random() * ops.length)];
      if (op === '*') {
        const n1 = Math.floor(Math.random() * 12) + 2;
        const n2 = Math.floor(Math.random() * 12) + 2;
        equation = `${n1} × ${n2}`;
        answer = n1 * n2;
      } else if (op === '/') {
        const n2 = Math.floor(Math.random() * 12) + 2;
        const n1 = n2 * (Math.floor(Math.random() * 10) + 1);
        equation = `${n1} ÷ ${n2}`;
        answer = n1 / n2;
      } else if (op === '+') {
        const n1 = Math.floor(Math.random() * 900) + 10;
        const n2 = Math.floor(Math.random() * 900) + 10;
        equation = `${n1} + ${n2}`;
        answer = n1 + n2;
      } else {
        const n1 = Math.floor(Math.random() * 900) + 100;
        const n2 = Math.floor(Math.random() * n1);
        equation = `${n1} - ${n2}`;
        answer = n1 - n2;
      }
    }

    const options = [answer];
    while (options.length < 4) {
      const offset = Math.floor(Math.random() * 20) - 10;
      const wrong = answer + (offset === 0 ? 5 : offset);
      if (!options.includes(wrong)) options.push(wrong);
    }
    options.sort(() => Math.random() - 0.5);
    setTrial({ equation, answer, options });
    setFeedback(null);
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(20);
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
      setTimeout(() => onComplete(score, true), 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timeLeft, score, onComplete]);

  const handleAnswer = (val: number) => {
    if (gameState !== GameState.PLAYING || !trial) return;
    if (val === trial.answer) {
      setScore(s => s + 1);
      setFeedback('correct');
      setTimeout(generateTrial, 150);
    } else {
      setFeedback('wrong');
      setTimeout(generateTrial, 400);
    }
  };

  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <View className={`flex-1 items-center justify-center ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="items-center px-6">
            <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-blue-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Calculator color="#3b82f6" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase ${textColorClass}`}>Math Dash</Text>
            <Text className={`${subTextColorClass} text-[10px] uppercase tracking-[0.2em] mb-10 text-center max-w-[280px]`}>
              Computational Speed Task: Solve the equations before the buffer clears.
            </Text>
            <Pressable onPress={startGame} className="bg-blue-600 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">START COMPUTE</Text>
            </Pressable>
          </MotiView>
        ) : gameState === GameState.FINISHED ? (
          <MotiView key="finished" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="items-center px-6">
            <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-6 border border-emerald-500/40">
              <Check color="#10b981" size={32} />
            </View>
            <Text weight="black" className={`text-3xl italic mb-2 uppercase tracking-tighter ${textColorClass}`}>COMPUTE SUCCESS</Text>
            
            <View className="bg-blue-600/10 border border-blue-500/20 px-8 py-4 rounded-3xl items-center mb-10">
              <Text variant="mono" className="text-blue-500 text-4xl mb-1 tracking-widest">{score}</Text>
              <Text weight="bold" className="text-blue-500/60 text-[10px] uppercase tracking-[0.2em]">MATH SCORE</Text>
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
          <MotiView key="play" from={{ opacity: 1 }} className="w-full items-center">
             <View style={{ marginTop: insets.top + 80 }} className="w-full flex-row justify-between mb-8">
                <View className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}><Timer size={14} color="#3b82f6" /><Text variant="mono" className="text-blue-500 text-sm">{timeLeft}s</Text></View>
                <View className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}><Zap size={14} color="#eab308" /><Text variant="mono" className="text-yellow-500 text-sm">{score}</Text></View>
              </View>
              
              <View className="mb-10 items-center">
                <MotiView key={trial?.equation} from={{ translateY: 10, opacity: 0 }} animate={{ translateY: 0, opacity: 1 }} className="items-center">
                  <Text weight="black" className={`text-5xl italic tracking-tighter text-center ${textColorClass}`}>
                    {trial?.equation}
                  </Text>
                </MotiView>
              </View>

              <View className="flex-row flex-wrap gap-4 w-full justify-center max-w-[320px]">
                {trial?.options.map((opt, i) => (
                  <Pressable 
                    key={i} 
                    onPress={() => handleAnswer(opt)} 
                    className={`w-[46%] py-7 rounded-2xl border items-center ${cardBgClass} ${feedback === 'correct' && opt === trial.answer ? 'border-emerald-500' : feedback === 'wrong' && opt !== trial.answer ? 'opacity-50' : ''}`}
                  >
                    <Text weight="black" className={`text-2xl ${feedback === 'correct' && opt === trial.answer ? 'text-emerald-500' : textColorClass}`}>
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

export default React.memo(MentalMathGame);
