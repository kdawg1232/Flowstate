import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Brain, ArrowRight } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Text } from '../../ui/Text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const Step1Hook: React.FC<Props> = ({ onNext, onBack }) => {
  const [textIndex, setTextIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const messages = [
    "The modern world is engineered to distract you.",
    "I want you to steal your focus back, form discipline, and unlock full potential.",
    "I want you to enter Flowstate."
  ];

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTextIndex(prev => (prev < messages.length - 1 ? prev + 1 : prev));
    }, 4500);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleDotClick = (index: number) => {
    setTextIndex(index);
    resetTimer();
  };

  const isFinalStep = textIndex === messages.length - 1;
  const activeColor = isFinalStep ? '#06b6d4' : '#ffffff';

  return (
    <View className="flex-1 items-center justify-center px-6 bg-[#0a0a0c]">
      {/* Edge "Current" Animations - Maintained for system consistency */}
      <View className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
        <MotiView 
          from={{ translateX: -120 }}
          animate={{ translateX: SCREEN_WIDTH }}
          transition={{ type: 'timing', duration: 3500, loop: true, easing: Easing.linear }}
          className="w-32 h-full bg-cyan-400"
        />
      </View>
      <View className="absolute top-0 right-0 bottom-0 w-[1px] overflow-hidden">
        <MotiView 
          from={{ translateY: -120 }}
          animate={{ translateY: SCREEN_HEIGHT }}
          transition={{ type: 'timing', duration: 4500, loop: true, delay: 500, easing: Easing.linear }}
          className="h-32 w-full bg-cyan-400"
        />
      </View>
      <View className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden">
        <MotiView 
          from={{ translateX: SCREEN_WIDTH }}
          animate={{ translateX: -120 }}
          transition={{ type: 'timing', duration: 4000, loop: true, delay: 200, easing: Easing.linear }}
          className="w-32 h-full bg-cyan-400"
        />
      </View>
      <View className="absolute top-0 left-0 bottom-0 w-[1px] overflow-hidden">
        <MotiView 
          from={{ translateY: SCREEN_HEIGHT }}
          animate={{ translateY: -120 }}
          transition={{ type: 'timing', duration: 5000, loop: true, delay: 800, easing: Easing.linear }}
          className="h-32 w-full bg-cyan-400"
        />
      </View>

      <View className="mb-20 items-center justify-center">
        {/* Diffuse Brain Glow using SVG Radial Gradient */}
        <MotiView 
          animate={{ 
            opacity: isFinalStep ? [0.2, 0.4, 0.2] : [0.1, 0.2, 0.1],
            scale: isFinalStep ? 1.1 : 1
          }}
          transition={{ 
            type: 'timing', 
            duration: isFinalStep ? 3000 : 4000, 
            loop: true, 
            easing: Easing.inOut(Easing.ease) 
          }}
          className="absolute"
        >
          <Svg height="600" width="600" viewBox="0 0 600 600">
            <Defs>
              <RadialGradient id="brainGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor={activeColor} stopOpacity="0.5" />
                <Stop offset="20%" stopColor={activeColor} stopOpacity="0.3" />
                <Stop offset="45%" stopColor={activeColor} stopOpacity="0.1" />
                <Stop offset="70%" stopColor={activeColor} stopOpacity="0.03" />
                <Stop offset="100%" stopColor={activeColor} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="300" cy="300" r="300" fill="url(#brainGlow)" />
          </Svg>
        </MotiView>
        
        {/* Brain Icon */}
        <MotiView
          animate={isFinalStep ? { 
            scale: 1.1,
            opacity: 1,
          } : {
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={isFinalStep ? { type: 'timing', duration: 1500 } : { 
            type: 'timing',
            duration: 3000,
            loop: true,
            repeatReverse: true
          }}
          className="relative z-10"
        >
          <Brain 
            size={120} 
            strokeWidth={1} 
            color={activeColor}
            style={isFinalStep ? {
              shadowColor: '#06b6d4',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 20,
            } : undefined}
          />
        </MotiView>
      </View>

      <View className="h-40 items-center z-10">
        <AnimatePresence exitBeforeEnter>
          <MotiView 
            key={textIndex}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -10 }}
            transition={{ type: 'timing', duration: 500 }}
            className="items-center"
          >
            <Text weight="bold" className="text-xl leading-relaxed max-w-[280px] text-slate-200 italic mb-8 text-center">
              {messages[textIndex]}
            </Text>
          </MotiView>
        </AnimatePresence>

        {/* Navigation Dots */}
        <View className="flex flex-row gap-3">
          {messages.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => handleDotClick(i)}
              className="p-2"
            >
              <MotiView 
                animate={{ 
                  width: textIndex === i ? 24 : 8,
                  backgroundColor: textIndex === i ? (isFinalStep ? '#06b6d4' : '#ffffff') : '#334155'
                }}
                transition={{ type: 'timing', duration: 500 }}
                className="h-2 rounded-full"
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View className="h-24 items-center justify-center mt-12 z-20">
        <AnimatePresence>
          {isFinalStep && (
            <MotiView 
              from={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="items-center justify-center"
            >
              <Pressable 
                onPress={onNext}
                className="w-16 h-16 bg-cyan-500 rounded-full items-center justify-center shadow-lg active:scale-90 border border-cyan-500/30"
                style={{
                  shadowColor: '#06b6d4',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 40,
                }}
              >
                <ArrowRight size={32} strokeWidth={3} color="black" />
              </Pressable>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </View>
  );
};

export default Step1Hook;
