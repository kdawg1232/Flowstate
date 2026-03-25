import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Timer, Play, CheckCircle2, ChevronDown, Activity, ShieldCheck, Square, ArrowRight } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (reps: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

function PlankTracker({ onComplete, isActive, theme = 'dark' }: Props) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const hasReportedCompletionRef = React.useRef(false);
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isActive) {
      hasReportedCompletionRef.current = false;
      setIsStarted(false);
      setIsFinished(false);
      setTimeLeft(30);
    }
  }, [isActive]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isStarted && !isFinished && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isStarted && !isFinished && timeLeft === 0) {
      setIsFinished(true);
    }
    return () => clearInterval(interval);
  }, [isStarted, isFinished, timeLeft]);

  useEffect(() => {
    if (!isFinished || hasReportedCompletionRef.current) return;
    hasReportedCompletionRef.current = true;
    const timer = setTimeout(() => onComplete(30 - timeLeft, true), 900);
    return () => clearTimeout(timer);
  }, [isFinished, onComplete, timeLeft]);

  const handleEndPlank = () => {
    setIsFinished(true);
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-slate-50'} items-center justify-center relative overflow-hidden`}>
      <View className="absolute inset-0 z-20">
        <AnimatePresence>
          {isStarted && !isFinished && (
            <MotiView 
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -20 }}
              style={{ marginTop: insets.top + 80 }} 
              className="flex-row justify-between w-full px-6"
            >
               <View className={`${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200'} px-4 py-2 rounded-full border flex-row items-center gap-2`}>
                 <Timer size={16} color="#34d399" />
                 <Text weight="black" variant="mono" className="text-emerald-400">
                   0:{(timeLeft).toString().padStart(2, '0')}
                 </Text>
               </View>
               <View className={`${isDark ? 'bg-black/40 border-white/10' : 'bg-white border-slate-200'} px-4 py-2 rounded-full border flex-row items-center gap-2`}>
                 <Activity size={16} color={isDark ? 'white' : '#0f172a'} />
                 <Text weight="black" variant="mono" className={`${isDark ? 'text-white' : 'text-slate-900'} text-[10px] uppercase`}>Plank</Text>
               </View>
            </MotiView>
          )}
        </AnimatePresence>

        <View className="flex-1 items-center justify-center px-6">
          {isFinished ? (
            <MotiView key="finish" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="items-center">
              <View className="w-20 h-20 rounded-full bg-emerald-500/20 items-center justify-center mb-6 border border-emerald-500/40">
                <CheckCircle2 color="#34d399" size={40} />
              </View>
              <Text weight="black" className={`text-3xl ${isDark ? 'text-white' : 'text-slate-900'} italic mb-2 uppercase tracking-tighter`}>PROTOCOL COMPLETE</Text>
              
              <View className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-3xl items-center mb-10">
                <Text variant="mono" className="text-emerald-400 text-4xl mb-1 tracking-widest">{30 - timeLeft}</Text>
                <Text weight="bold" className="text-emerald-400/60 text-[10px] uppercase tracking-[0.2em]">SECONDS LOGGED</Text>
              </View>

              <View className="items-center gap-6">
                 <View className={`${isDark ? 'bg-white/5' : 'bg-emerald-50 border border-emerald-200'} px-6 py-4 rounded-2xl flex-row items-center gap-3`}>
                    <Text weight="black" className="text-emerald-500 uppercase">NEXT TASK READY</Text>
                    <ArrowRight color="#10b981" size={18} />
                 </View>
                 
                 <View className="items-center gap-2 opacity-40">
                   <Text weight="bold" className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-[10px] uppercase tracking-[0.4em]`}>Scroll to continue</Text>
                   <ChevronDown color={isDark ? "#94a3b8" : "#64748b"} size={20} />
                 </View>
              </View>
            </MotiView>
          ) : (
            <AnimatePresence exitBeforeEnter>
              {!isStarted ? (
                <MotiView key="intro" from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="items-center">
                 <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-emerald-100 shadow-sm'} rounded-3xl items-center justify-center mb-8 border`}>
                    <ShieldCheck color="#10b981" size={48} />
                 </View>
                 <Text weight="black" className={`${isDark ? 'text-white' : 'text-slate-900'} text-3xl italic uppercase tracking-tighter mb-4 text-center`}>Plank</Text>
                 <Text className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs uppercase tracking-widest mb-10 text-center max-w-[240px]`}>Maintain a straight line. Gravity protocol active.</Text>
                 <Pressable onPress={() => { hasReportedCompletionRef.current = false; setIsStarted(true); }} className="bg-emerald-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
                    <Play color="black" size={20} fill="black" />
                    <Text weight="black" className="text-black uppercase">INITIATE</Text>
                 </Pressable>
                </MotiView>
              ) : (
                <MotiView key="action" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full items-center justify-center">
                <View className="relative w-72 h-72 items-center justify-center">
                  <MotiView from={{ rotate: '0deg' }} animate={{ rotate: '360deg' }} transition={{ loop: true, duration: 10000, type: 'timing' }} className={`absolute inset-0 rounded-full border ${isDark ? 'border-emerald-500/20' : 'border-emerald-200'}`}>
                    <View className="w-full h-full border-t-2 border-emerald-500 rounded-full" />
                  </MotiView>
                  <View className="items-center justify-center">
                    <Text weight="black" variant="mono" className="text-7xl text-emerald-400">{timeLeft}s</Text>
                    <Text weight="black" className={`${isDark ? 'text-emerald-500/40' : 'text-emerald-600/50'} text-[10px] uppercase tracking-[0.3em] mt-2`}>Remaining</Text>
                  </View>
                </View>

                <Pressable onPress={handleEndPlank} className="mt-20 bg-rose-500 px-10 py-5 rounded-3xl flex-row items-center gap-3 shadow-xl active:scale-95">
                  <Square color="white" size={16} fill="white" />
                  <Text weight="black" className="text-white uppercase tracking-widest text-xs">End Plank</Text>
                </Pressable>
                </MotiView>
              )}
            </AnimatePresence>
          )}
        </View>
      </View>
    </View>
  );
}

export default React.memo(PlankTracker);
