import React, { useEffect, useState } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Brain } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Text } from '../../ui/Text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const REGIONS = [
  { name: 'ATTENTION', color: '#6366f1' }, // Mid Right (Indigo)
  { name: 'LOGIC', color: '#10b981' },    // Bottom Right (Emerald)
  { name: 'PROBLEM SOLVING', color: '#f43f5e' }, // Bottom Left (Rose)
  { name: 'MATH', color: '#3b82f6' },      // Mid Left (Blue)
  { name: 'MEMORY', color: '#06b6d4' },    // Top Left (Cyan)
  { name: 'SPEED', color: '#f59e0b' }      // Top Right (Amber)
];

const NewStep2Definition: React.FC<Props> = ({ onNext, onBack }) => {
  const [phase, setPhase] = useState<'quote' | 'calibration'>('quote');
  const [barsAnimated, setBarsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('calibration');
    }, 6500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === 'calibration') {
      const timer = setTimeout(() => setBarsAnimated(true), 300);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <View className="flex-1 w-full justify-center px-6 bg-[#0a0a0c]">
      {/* Edge "Current" Animations */}
      <View className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
        <MotiView from={{ translateX: -120 }} animate={{ translateX: SCREEN_WIDTH }} transition={{ type: 'timing', duration: 3500, loop: true, easing: Easing.linear }} className="w-32 h-full bg-cyan-400" />
      </View>
      <View className="absolute top-0 right-0 bottom-0 w-[1px] overflow-hidden">
        <MotiView from={{ translateY: -120 }} animate={{ translateY: SCREEN_HEIGHT }} transition={{ type: 'timing', duration: 4500, loop: true, delay: 500, easing: Easing.linear }} className="h-32 w-full bg-cyan-400" />
      </View>
      <View className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden">
        <MotiView from={{ translateX: SCREEN_WIDTH }} animate={{ translateX: -120 }} transition={{ type: 'timing', duration: 4000, loop: true, delay: 200, easing: Easing.linear }} className="w-32 h-full bg-cyan-400" />
      </View>
      <View className="absolute top-0 left-0 bottom-0 w-[1px] overflow-hidden">
        <MotiView from={{ translateY: SCREEN_HEIGHT }} animate={{ translateY: -120 }} transition={{ type: 'timing', duration: 5000, loop: true, delay: 800, easing: Easing.linear }} className="h-32 w-full bg-cyan-400" />
      </View>

      <View className="mb-8 mt-24">
        <Text weight="black" className="text-[17px] italic tracking-tight uppercase text-center text-white">
          What does <Text weight="black" className="text-[#06b6d4]">Flowstate</Text> mean?
        </Text>
      </View>

      <View className="relative mb-10 h-48 items-center justify-center">
        {/* Diffuse Brain Glow */}
        <MotiView 
          animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.1, 1] }}
          transition={{ type: 'timing', duration: 4000, loop: true, easing: Easing.inOut(Easing.ease) }}
          className="absolute"
        >
          <Svg height="400" width="400" viewBox="0 0 400 400">
            <Defs>
              <RadialGradient id="brainGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <Stop offset="40%" stopColor="#06b6d4" stopOpacity="0.1" />
                <Stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="200" cy="200" r="200" fill="url(#brainGlow)" />
          </Svg>
        </MotiView>

        <Brain size={100} color="white" strokeWidth={1} />
        
        {REGIONS.map((r, i) => {
          const angle = i * 60;
          const rad = (angle * Math.PI) / 180;
          const leftPercent = 50 + 40 * Math.cos(rad);
          const topPercent = 50 + 40 * Math.sin(rad);
          
          return (
            <MotiView
              key={r.name}
              from={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 200 + i * 100, type: 'timing' }}
              className="absolute w-2.5 h-2.5 rounded-full"
              style={{ 
                backgroundColor: r.color,
                left: `${leftPercent}%` as const,
                top: `${topPercent}%` as const,
                marginLeft: -5,
                marginTop: -5,
                shadowColor: r.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 10,
              }}
            />
          );
        })}
      </View>

      <View className="relative h-72 items-center">
        <AnimatePresence exitBeforeEnter>
          {phase === 'quote' ? (
            <MotiView
              key="quote-phase"
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -10 }}
              transition={{ type: 'timing', duration: 800 }}
              className="items-center px-4"
            >
              <Text weight="bold" className="text-slate-200 text-sm italic leading-relaxed mb-6 text-center">
                "Flow state, or 'being in the zone,' is a mental state of complete absorption where distractions vanish, time warps, and performance peaks effortlessly. We built this app to help you calibrate your mind to trigger it on command."
              </Text>
              <Text weight="black" className="text-slate-500 text-[9px] uppercase tracking-[0.3em] opacity-60">
                — Insight Archive
              </Text>
            </MotiView>
          ) : (
            <MotiView
              key="calibration-phase"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 500 }}
              className="w-full"
            >
              <Text weight="black" className="text-[#06b6d4] text-[10px] uppercase tracking-[0.2em] mb-6 text-center">
                This means full calibration of 6 cognitive skills:
              </Text>

              <View className="space-y-4">
                {REGIONS.map((region, i) => (
                  <View key={region.name} className="gap-1 mb-3">
                    <View className="flex-row justify-between items-center px-1">
                      <Text weight="black" className="text-[8px] tracking-widest text-slate-500 uppercase">{region.name}</Text>
                      <MotiView 
                        animate={{ opacity: barsAnimated ? 1 : 0 }}
                        transition={{ type: 'timing' }}
                      >
                        <Text variant="mono" weight="monoMedium" className="text-[8px] text-white">
                          100%
                        </Text>
                      </MotiView>
                    </View>
                    <View className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <MotiView
                        from={{ width: "0%" }}
                        animate={{ width: barsAnimated ? "100%" : "0%" }}
                        transition={{ 
                          type: 'timing',
                          duration: 1500, 
                          delay: 100 + (i * 100),
                        }}
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: region.color,
                          shadowColor: region.color,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.3,
                          shadowRadius: 10,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      </View>

      <View className="mt-8 w-full">
        <Pressable 
          onPress={onNext}
          className="w-full py-5 bg-cyan-500 rounded-full items-center shadow-lg active:scale-95"
          style={{
            shadowColor: '#06b6d4',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
          }}
        >
          <Text weight="black" className="text-black text-sm uppercase tracking-widest">
            Complete Calibration
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default NewStep2Definition;
