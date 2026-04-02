import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Text as FText } from '../ui/Text';
import { requireSupabase } from '../lib/supabase';

type Props = {
  onLoginSuccess: (username: string) => void;
  onGoToSignUp: () => void;
  onBack: () => void;
};

export function LoginScreen({ onLoginSuccess, onGoToSignUp, onBack }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const canSubmit = useMemo(() => email.trim().length > 3 && password.length > 0, [email, password]);

  const submit = async () => {
    if (!canSubmit) return;
    setIsLoading(true);

    try {
      const supabase = requireSupabase();
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        Alert.alert('Sign in failed', error?.message ?? 'Invalid email or password.');
        return;
      }

      const displayName =
        (data.user.user_metadata?.display_name as string | undefined) ||
        data.user.email ||
        'FlowState User';
      onLoginSuccess(displayName);
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Something went wrong while signing in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#f5f7f6]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
        <View className="flex-1 items-center justify-center py-12">
          <Pressable 
            onPress={onBack}
            className="absolute top-12 left-0 w-10 h-10 items-center justify-center rounded-full bg-white border border-[#dcdedc]"
          >
            <ChevronLeft color="#3f3f46" size={20} />
          </Pressable>

          <View className="w-full max-w-md">
            <View className="items-center mb-8">
              <FText weight="black" className="text-[#151515] text-3xl tracking-tight mb-2">
                Log In
              </FText>
              <FText className="text-[#666] text-center">
                Continue your FlowState journey.
              </FText>
            </View>

            <View className="gap-3">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                className="w-full bg-white border border-[#d8dad8] rounded-md py-3.5 px-4 text-[#111]"
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                className="w-full bg-white border border-[#d8dad8] rounded-md py-3.5 px-4 text-[#111]"
              />
              <Pressable
                onPress={submit}
                disabled={!canSubmit || isLoading}
                className={`w-full rounded-md py-3.5 items-center justify-center mt-1 ${
                  canSubmit && !isLoading ? 'bg-[#111]' : 'bg-[#111]/40'
                }`}
              >
                <FText className="text-white text-[15px]" weight="extrabold">
                  {isLoading ? 'Logging in...' : 'Log in'}
                </FText>
              </Pressable>
            </View>

            <View className="mt-8 items-center">
              <FText className="text-[#5d6260] text-[14px]">
                Don't have an account?{' '}
                <FText className="text-[#0f766e]" weight="extrabold" onPress={onGoToSignUp}>
                  Create one.
                </FText>
              </FText>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
