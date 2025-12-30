import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Zap, ArrowRight, Lock, ShieldCheck, User } from 'lucide-react-native';
import { Text as FText } from '../ui/Text';

type Props = {
  onLoginSuccess: () => void;
};

export function LoginScreen({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const canSubmit = useMemo(() => username.length > 0 && password.length > 0, [username, password]);

  const submit = () => {
    if (username === 'admin' && password === 'admin') {
      onLoginSuccess();
      return;
    }
    Alert.alert('Access denied', 'Use admin / admin');
  };

  return (
    <View className="flex-1 bg-[#0a0a0c] px-6 items-center justify-center">
      {/* Background glow */}
      <View className="absolute inset-0 opacity-20">
        <View className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/20 blur-[120px]" />
        <View className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/20 blur-[120px]" />
      </View>

      <View className="w-full max-w-md z-10">
        <View className="items-center mb-12">
          <View className="w-20 h-20 bg-cyan-500/10 border border-cyan-500/30 rounded-3xl items-center justify-center mb-6">
            <Zap color="#06b6d4" size={40} />
          </View>
          <FText weight="black" className="text-white text-4xl tracking-tighter italic uppercase mb-2">
            FlowState
          </FText>
          <FText variant="mono" weight="monoMedium" className="text-slate-500 text-[10px] uppercase tracking-[0.4em]">
            Neural Access Required
          </FText>
        </View>

        <View className="space-y-3">
          <View className="relative">
            <User color="#64748b" size={18} style={rnStyles.iconLeft} />
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="IDENTITY"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white uppercase text-sm"
            />
          </View>
          <View className="relative">
            <Lock color="#64748b" size={18} style={rnStyles.iconLeft} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="ACCESS_CODE"
              placeholderTextColor="#475569"
              secureTextEntry
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white uppercase text-sm"
            />
          </View>

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-2xl items-center justify-center flex-row gap-2 ${
              canSubmit ? 'bg-cyan-500' : 'bg-cyan-500/50'
            }`}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <FText weight="black" className="text-black text-sm uppercase tracking-[0.2em]">
              Initialize Link
            </FText>
            <ArrowRight color="#001018" size={18} />
          </Pressable>
        </View>

        <FText className="mt-8 text-center text-slate-600 text-[10px] uppercase tracking-[0.2em]" weight="extrabold">
          Prototype login: admin / admin
        </FText>
      </View>

      <View className="absolute bottom-10 left-0 right-0 items-center opacity-20">
        <ShieldCheck color="#1f2937" size={64} />
      </View>
    </View>
  );
}

const rnStyles = StyleSheet.create({
  iconLeft: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -9,
  },
});

