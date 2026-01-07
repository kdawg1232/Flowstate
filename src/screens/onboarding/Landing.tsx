import React from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Zap } from 'lucide-react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Text } from '../../ui/Text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  onNext: () => void;
  onLogin: () => void;
  onSignUp: () => void;
}

const Landing: React.FC<Props> = ({ onNext, onLogin, onSignUp }) => (
  <View className="flex-1 bg-[#0a0a0c] items-center justify-center px-6">
    {/* Sharp Edge Currents - 1px thickness for high-precision look */}
    <View className="absolute top-0 left-0 right-0 h-[1px] overflow-hidden">
      <MotiView 
        from={{ translateX: -120 }}
        animate={{ translateX: SCREEN_WIDTH }}
        transition={{ 
          type: 'timing',
          duration: 3500,
          loop: true,
          easing: Easing.linear
        }}
        className="w-32 h-full bg-cyan-400"
      />
    </View>
    <View className="absolute top-0 right-0 bottom-0 w-[1px] overflow-hidden">
      <MotiView 
        from={{ translateY: -120 }}
        animate={{ translateY: SCREEN_HEIGHT }}
        transition={{ 
          type: 'timing',
          duration: 4500,
          loop: true,
          delay: 500,
          easing: Easing.linear
        }}
        className="h-32 w-full bg-cyan-400"
      />
    </View>
    <View className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden">
      <MotiView 
        from={{ translateX: SCREEN_WIDTH }}
        animate={{ translateX: -120 }}
        transition={{ 
          type: 'timing',
          duration: 4000,
          loop: true,
          delay: 200,
          easing: Easing.linear
        }}
        className="w-32 h-full bg-cyan-400"
      />
    </View>
    <View className="absolute top-0 left-0 bottom-0 w-[1px] overflow-hidden">
      <MotiView 
        from={{ translateY: SCREEN_HEIGHT }}
        animate={{ translateY: -120 }}
        transition={{ 
          type: 'timing',
          duration: 5000,
          loop: true,
          delay: 800,
          easing: Easing.linear
        }}
        className="h-32 w-full bg-cyan-400"
      />
    </View>

    <View className="relative mb-12 items-center justify-center">
      {/* 
          Multi-stop Radial Gradient Glow 
          Simulates a Gaussian blur (blur-60px) by using an exponential opacity falloff.
          This removes the "hard circle" look without needing Skia or BlurView.
      */}
      <MotiView 
        animate={{ opacity: [0.15, 0.4, 0.15] }}
        transition={{ 
          type: 'timing',
          duration: 4000,
          loop: true,
          easing: Easing.inOut(Easing.ease)
        }}
        className="absolute"
      >
        <Svg height="800" width="800" viewBox="0 0 800 800">
          <Defs>
            <RadialGradient id="diffuseGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <Stop offset="15%" stopColor="#06b6d4" stopOpacity="0.3" />
              <Stop offset="35%" stopColor="#06b6d4" stopOpacity="0.15" />
              <Stop offset="55%" stopColor="#06b6d4" stopOpacity="0.06" />
              <Stop offset="75%" stopColor="#06b6d4" stopOpacity="0.02" />
              <Stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="400" cy="400" r="400" fill="url(#diffuseGlow)" />
        </Svg>
      </MotiView>

      <View className="relative z-10 w-24 h-24 bg-black border border-cyan-500/30 rounded-3xl items-center justify-center shadow-2xl">
        <Zap color="#06b6d4" size={48} />
      </View>
    </View>
    
    <View className="mb-20 items-center">
      <Text weight="black" className="text-4xl italic tracking-tighter uppercase leading-tight text-white text-center">
        Welcome to{"\n"}
        <Text weight="black" className="text-5xl text-white">FlowState</Text>
      </Text>
      <View className="flex flex-col gap-1 mt-4 items-center">
        <Text variant="mono" weight="monoMedium" className="text-slate-500 text-[9px] uppercase tracking-[0.4em]">calibrate your mind</Text>
        <Text variant="mono" weight="monoMedium" className="text-slate-500 text-[9px] uppercase tracking-[0.4em]">Form Discipline</Text>
        <Text variant="mono" weight="monoMedium" className="text-cyan-400 text-[9px] uppercase tracking-[0.4em] font-black">Enter Flowstate</Text>
      </View>
    </View>
    
    <View className="w-full gap-4">
      <Pressable 
        onPress={onLogin}
        className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl items-center active:scale-95"
      >
        <Text weight="black" className="text-white text-sm uppercase tracking-widest">
          Sign In
        </Text>
      </Pressable>
      <Pressable 
        onPress={onNext}
        className="w-full py-5 bg-cyan-500 rounded-2xl items-center active:scale-95 shadow-lg"
        style={{
          shadowColor: '#06b6d4',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        }}
      >
        <Text weight="black" className="text-black text-sm uppercase tracking-widest">
          Create Account
        </Text>
      </Pressable>
    </View>
  </View>
);

export default Landing;
