import React from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Brain, ArrowLeft } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Text } from '../../ui/Text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

const Step8Payoff: React.FC<Props> = ({ onComplete, onBack }) => (
  <View className="flex-1 items-center justify-center px-6 bg-[#0a0a0c] relative">
    {/* Edge "Current" Animations - Matching Landing/Step1Hook */}
    <View className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
      <MotiView 
        from={{ translateX: -120 }}
        animate={{ translateX: SCREEN_WIDTH }}
        transition={{ type: 'timing', duration: 3500, loop: true, easing: Easing.linear }}
        className="w-32 h-full bg-amber-400"
      />
    </View>
    <View className="absolute top-0 right-0 bottom-0 w-[1px] overflow-hidden">
      <MotiView 
        from={{ translateY: -120 }}
        animate={{ translateY: SCREEN_HEIGHT }}
        transition={{ type: 'timing', duration: 4500, loop: true, delay: 500, easing: Easing.linear }}
        className="h-32 w-full bg-amber-400"
      />
    </View>
    <View className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden">
      <MotiView 
        from={{ translateX: SCREEN_WIDTH }}
        animate={{ translateX: -120 }}
        transition={{ type: 'timing', duration: 4000, loop: true, delay: 200, easing: Easing.linear }}
        className="w-32 h-full bg-amber-400"
      />
    </View>
    <View className="absolute top-0 left-0 bottom-0 w-[1px] overflow-hidden">
      <MotiView 
        from={{ translateY: SCREEN_HEIGHT }}
        animate={{ translateY: -120 }}
        transition={{ type: 'timing', duration: 5000, loop: true, delay: 800, easing: Easing.linear }}
        className="h-32 w-full bg-amber-400"
      />
    </View>

    <Pressable 
      onPress={onBack}
      className="absolute top-12 left-6 p-2 z-[120]"
    >
      <ArrowLeft size={24} color="#64748b" />
    </Pressable>

    <View className="relative mb-12 items-center justify-center">
      {/* 
          Multi-stop Radial Gradient Glow 
          Matches the "diffuseGlow" logic from Landing.tsx
      */}
      <MotiView 
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ 
          type: 'timing',
          duration: 4000,
          loop: true,
          easing: Easing.inOut(Easing.ease)
        }}
        className="absolute"
      >
        <Svg height="600" width="600" viewBox="0 0 600 600">
          <Defs>
            <RadialGradient id="payoffGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <Stop offset="15%" stopColor="#f59e0b" stopOpacity="0.3" />
              <Stop offset="35%" stopColor="#f59e0b" stopOpacity="0.15" />
              <Stop offset="55%" stopColor="#f59e0b" stopOpacity="0.06" />
              <Stop offset="75%" stopColor="#f59e0b" stopOpacity="0.02" />
              <Stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="300" cy="300" r="300" fill="url(#payoffGlow)" />
        </Svg>
      </MotiView>
      
      {/* Brain Icon */}
      <MotiView
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{ 
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
          color="#f59e0b"
        />
      </MotiView>
    </View>

    <View className="relative z-10 w-full px-4 items-center">
      <Text weight="black" className="text-4xl italic tracking-tighter uppercase mb-4 text-white leading-tight text-center">
        FLOWSTATE IS{"\n"}
        <Text weight="black" className="text-amber-500">100% FREE</Text>
      </Text>
      <Text weight="bold" className="text-slate-400 mb-20 uppercase tracking-[0.3em] text-[10px] text-center">
        There is no free trial
      </Text>

      <Pressable 
        onPress={onComplete}
        className="w-full py-6 bg-cyan-500 rounded-2xl items-center shadow-2xl active:scale-95"
        style={{
          shadowColor: '#06b6d4',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 40,
        }}
      >
        <Text weight="black" className="text-black text-lg uppercase tracking-[0.2em]">
          ENTER FLOWSTATE
        </Text>
      </Pressable>
    </View>
  </View>
);

export default Step8Payoff;
