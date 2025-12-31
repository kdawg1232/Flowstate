import React from 'react';
import { Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { Zap, ArrowRight, UserPlus, LogIn, ShieldCheck } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { MotiView } from 'moti';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  onGoToLogin: () => void;
  onGoToSignUp: () => void;
};

export function LandingScreen({ onGoToLogin, onGoToSignUp }: Props) {
  return (
    <View className="flex-1 bg-[#0a0a0c] px-6 items-center justify-center">
      {/* Background glow */}
      <View className="absolute inset-0 opacity-20">
        <View className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-500/20 blur-[120px]" />
        <View className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/20 blur-[120px]" />
      </View>

      <MotiView 
        from={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'timing', duration: 1000 }}
        className="w-full max-w-md z-10 items-center"
      >
        <View className="w-24 h-24 bg-cyan-500/10 border border-cyan-500/30 rounded-[2.5rem] items-center justify-center mb-8 shadow-2xl">
          <Zap color="#06b6d4" size={48} />
        </View>

        <Text weight="black" className="text-white text-5xl tracking-tighter italic uppercase mb-2 text-center">
          FlowState
        </Text>
        <Text variant="mono" weight="monoMedium" className="text-slate-500 text-[10px] uppercase tracking-[0.4em] mb-12 text-center">
          Peak Performance Protocol
        </Text>

        <View className="w-full gap-4">
          <Pressable
            onPress={onGoToSignUp}
            className="w-full bg-cyan-500 py-5 rounded-2xl items-center justify-center flex-row gap-3 shadow-xl active:scale-95"
          >
            <UserPlus color="#001018" size={20} />
            <Text weight="black" className="text-black text-sm uppercase tracking-[0.2em]">
              Sign Up
            </Text>
          </Pressable>

          <Pressable
            onPress={onGoToLogin}
            className="w-full bg-slate-900/50 border border-slate-800 py-5 rounded-2xl items-center justify-center flex-row gap-3 active:scale-95"
          >
            <LogIn color="#94a3b8" size={20} />
            <Text weight="black" className="text-slate-300 text-sm uppercase tracking-[0.2em]">
              Sign In
            </Text>
          </Pressable>
        </View>

        <View className="mt-12 max-w-[280px]">
          <Text className="text-slate-600 text-[10px] text-center uppercase tracking-[0.1em] leading-loose">
            By continuing, you agree to our <Text weight="bold" className="text-slate-400">Security Protocols</Text> and <Text weight="bold" className="text-slate-400">Data Sovereignty Policies</Text>.
          </Text>
        </View>
      </MotiView>

      <View className="absolute bottom-10 opacity-10">
        <ShieldCheck color="#ffffff" size={48} />
      </View>
    </View>
  );
}
