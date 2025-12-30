import React, { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Timer, Play, CheckCircle2, ChevronDown, Activity, Layers, Plus, ArrowRight } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (reps: number) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SitupTracker({ onComplete, isActive, theme = 'dark' }: Props) {
  const [reps, setReps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isActive) {
      setIsStarted(false);
      setIsFinished(false);
      setReps(0);
      setTimeLeft(30);
    }
  }, [isActive]);

  useEffect(() => {
    if (isStarted && timeLeft > 0 && !isFinished) {
      const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(t);
    } else if (timeLeft === 0 && !isFinished && isStarted) {
      setIsFinished(true);
    }
  }, [isStarted, timeLeft, isFinished]);

  useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(() => onComplete(reps), 100);
      return () => clearTimeout(timer);
    }
  }, [isFinished, reps, onComplete]);

  const handleManualRep = () => {
    if (!isFinished) {
      setReps(prev => prev + 1);
    }
  };

  return (
    <View className="flex-1 bg-black items-center justify-center relative overflow-hidden">
      <View className="absolute inset-0 items-center justify-center opacity-10">
        <Activity color="#10b981" size={400} />
      </View>

      <View className="absolute inset-0 z-20 p-6">
        <View style={{ marginTop: insets.top + 80 }} className="flex-row justify-between w-full">
           <View className="bg-black/40 px-4 py-2 rounded-full border border-white/10 flex-row items-center gap-2">
             <Timer size={16} color="#34d399" />
             <Text weight="black" variant="mono" className="text-emerald-400">{timeLeft}s</Text>
           </View>
           <View className="bg-black/40 px-4 py-2 rounded-full border border-white/10 flex-row items-center gap-2">
             <Activity size={16} color="white" />
             <Text weight="black" variant="mono" className="text-white text-[10px] uppercase">Situps</Text>
           </View>
        </View>

        <View className="flex-1 items-center justify-center">
          <AnimatePresence exitBeforeEnter>
            {!isStarted && !isFinished ? (
              <MotiView key="intro" from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-black/80 p-8 rounded-[2.5rem] border border-white/10 items-center">
                 <Layers color="#10b981" size={48} className="mb-4" />
                 <Text weight="black" className="text-white text-2xl italic uppercase tracking-tighter mb-2 text-center">Situps</Text>
                 <Text className="text-slate-400 text-xs uppercase tracking-widest mb-8 text-center">Maintain shoulder-to-knee compression.</Text>
                 <Pressable onPress={() => setIsStarted(true)} className="bg-emerald-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
                    <Play color="black" size={20} fill="black" />
                    <Text weight="black" className="text-black uppercase">START SET</Text>
                 </Pressable>
              </MotiView>
            ) : isFinished ? (
              <MotiView key="finish" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="items-center">
                <View className="w-20 h-20 rounded-full bg-emerald-500/20 items-center justify-center mb-6 border border-emerald-500/40">
                  <CheckCircle2 color="#34d399" size={40} />
                </View>
                <Text weight="black" className="text-3xl text-white italic mb-2 uppercase tracking-tighter">PROTOCOL COMPLETE</Text>
                
                <View className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-3xl items-center mb-10">
                  <Text variant="mono" className="text-emerald-400 text-4xl mb-1 tracking-widest">{reps}</Text>
                  <Text weight="bold" className="text-emerald-400/60 text-[10px] uppercase tracking-[0.2em]">REPS LOGGED</Text>
                </View>

                <View className="items-center gap-6">
                   <View className="bg-white/5 px-6 py-4 rounded-2xl flex-row items-center gap-3">
                      <Text weight="black" className="text-emerald-500 uppercase">NEXT TASK READY</Text>
                      <ArrowRight color="#10b981" size={18} />
                   </View>
                   
                   <View className="items-center gap-2 opacity-40">
                     <Text weight="bold" className="text-slate-400 text-[10px] uppercase tracking-[0.4em]">Scroll to continue</Text>
                     <ChevronDown color="#94a3b8" size={20} />
                   </View>
                </View>
              </MotiView>
            ) : (
              <MotiView key="action" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full items-center justify-center">
                <Pressable onPress={handleManualRep} className="w-64 h-64 rounded-[3rem] bg-emerald-500/10 border-4 border-emerald-500/30 items-center justify-center active:scale-90 shadow-xl">
                  <Text weight="black" className="text-8xl text-emerald-400">{reps}</Text>
                  <View className="mt-4 flex-row items-center gap-2">
                    <Plus color="#6ee7b7" size={16} />
                    <Text weight="bold" className="text-emerald-300 uppercase tracking-[0.2em] text-xs">Tap Rep</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => setIsFinished(true)} className="mt-12">
                  <Text weight="black" className="text-emerald-500/40 text-[10px] uppercase tracking-[0.4em]">Terminate Set</Text>
                </Pressable>
              </MotiView>
            )}
          </AnimatePresence>
        </View>
      </View>
    </View>
  );
}
