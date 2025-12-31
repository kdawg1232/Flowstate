import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Zap, ArrowRight, User, Lock, ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { Text as FText } from '../ui/Text';
import { getJson, setJson } from '../storage';
import { FLOWSTATE_USERS_KEY } from '../initialState';
import type { UserAccount } from '../types';

type Props = {
  onSignUpSuccess: (username: string) => void;
  onBack: () => void;
};

export function SignUpScreen({ onSignUpSuccess, onBack }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => 
    username.length >= 3 && 
    password.length >= 4 && 
    password === confirmPassword, 
  [username, password, confirmPassword]);

  const handleSignUp = async () => {
    if (!canSubmit) return;
    setIsLoading(true);

    try {
      const users = await getJson<UserAccount[]>(FLOWSTATE_USERS_KEY) || [];
      
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        Alert.alert('Identity Conflict', 'This identity already exists in the neural network.');
        setIsLoading(false);
        return;
      }

      const newUser: UserAccount = {
        username: username.trim(),
        password: password
      };

      await setJson(FLOWSTATE_USERS_KEY, [...users, newUser]);
      onSignUpSuccess(newUser.username);
    } catch (e) {
      Alert.alert('System Error', 'Failed to initialize neural link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#0a0a0c]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
        <View className="flex-1 items-center justify-center py-12">
          <Pressable 
            onPress={onBack}
            className="absolute top-12 left-0 w-10 h-10 items-center justify-center rounded-full bg-slate-900/50 border border-slate-800"
          >
            <ChevronLeft color="#94a3b8" size={20} />
          </Pressable>

          <View className="w-full max-w-md">
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl items-center justify-center mb-6">
                <Zap color="#818cf8" size={40} />
              </View>
              <FText weight="black" className="text-white text-3xl tracking-tighter italic uppercase mb-2">
                Sign Up
              </FText>
              <FText variant="mono" weight="monoMedium" className="text-slate-500 text-[10px] uppercase tracking-[0.4em]">
                Create your account
              </FText>
            </View>

            <View className="space-y-3">
              <View className="relative">
                <User color="#64748b" size={18} style={rnStyles.iconLeft} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="USERNAME"
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
                  placeholder="PASSWORD"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white uppercase text-sm"
                />
              </View>
              <View className="relative">
                <ShieldAlert color="#64748b" size={18} style={rnStyles.iconLeft} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="CONFIRM PASSWORD"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white uppercase text-sm"
                />
              </View>

              <Pressable
                onPress={handleSignUp}
                disabled={!canSubmit || isLoading}
                className={`w-full py-5 rounded-2xl items-center justify-center flex-row gap-2 mt-4 ${
                  canSubmit && !isLoading ? 'bg-indigo-500' : 'bg-indigo-500/30'
                }`}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <FText weight="black" className="text-white text-sm uppercase tracking-[0.2em]">
                  {isLoading ? 'Creating Account...' : 'Sign Up'}
                </FText>
                {!isLoading && <ArrowRight color="white" size={18} />}
              </Pressable>
            </View>

            <View className="mt-10 items-center">
              <FText className="text-slate-600 text-[10px] uppercase tracking-[0.2em]">
                Local-only encryption active
              </FText>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const rnStyles = StyleSheet.create({
  iconLeft: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -9,
    zIndex: 1,
  },
});
