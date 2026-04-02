import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Apple, ChevronLeft, Mail } from 'lucide-react-native';
import { Text as FText } from '../ui/Text';
import { requireSupabase } from '../lib/supabase';

type Props = {
  onSignUpSuccess: (username: string) => void;
  onGoToSignIn: () => void;
  onBack: () => void;
};

export function SignUpScreen({ onSignUpSuccess, onGoToSignIn, onBack }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(
    () =>
      fullName.trim().length >= 2 &&
      email.trim().length > 3 &&
      password.length >= 6 &&
      password === confirmPassword,
    [fullName, email, password, confirmPassword],
  );

  const handleSignUp = async () => {
    if (!canSubmit) return;
    setIsLoading(true);

    try {
      const supabase = requireSupabase();
      const normalizedEmail = email.trim().toLowerCase();
      const displayName = fullName.trim();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (error) {
        Alert.alert('Sign up failed', error.message);
        return;
      }

      if (data.user?.id) {
        try {
          // Optional app profile row: requires a matching "profiles" table in Supabase.
          await supabase.from('profiles').upsert(
            {
              id: data.user.id,
              email: normalizedEmail,
              display_name: displayName,
            },
            { onConflict: 'id' },
          );
        } catch {
          // If profiles table is not configured yet, auth still succeeds.
        }
      }

      if (data.session) {
        onSignUpSuccess(displayName || normalizedEmail);
      } else {
        Alert.alert(
          'Account created',
          'Check your inbox to confirm your email, then sign in to continue.',
        );
        onGoToSignIn();
      }
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Something went wrong while creating your account.');
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
            className="absolute top-12 left-0 w-10 h-10 items-center justify-center rounded-full bg-slate-900/70 border border-slate-800"
          >
            <ChevronLeft color="#94a3b8" size={20} />
          </Pressable>

          <View className="w-full max-w-md">
            <View className="items-center mb-8">
              <FText weight="black" className="text-white text-4xl tracking-tight mb-4 italic uppercase">
                FlowState
              </FText>
              <FText weight="black" className="text-white text-4xl leading-tight text-center mb-3">
                Smart focus for high performers.
              </FText>
              <FText className="text-slate-400 text-base text-center">
                Get started by creating your account.
              </FText>
            </View>

            {!showEmailForm ? (
              <View className="gap-3">
                <Pressable
                  onPress={() => Alert.alert('Google sign up', 'OAuth can be enabled next by adding Supabase Google provider config.')}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-3.5 px-4 flex-row items-center justify-center gap-3"
                >
                  <Mail color="#ef4444" size={18} />
                  <FText className="text-white text-[15px]" weight="extrabold">
                    Sign up with Google
                  </FText>
                </Pressable>
                <Pressable
                  onPress={() => setShowEmailForm(true)}
                  className="w-full bg-cyan-500 border border-cyan-400 rounded-xl py-3.5 px-4 flex-row items-center justify-center gap-3"
                >
                  <Mail color="#001018" size={18} />
                  <FText className="text-black text-[15px]" weight="black">
                    Sign up with email
                  </FText>
                </Pressable>
                <Pressable
                  onPress={() => Alert.alert('Apple sign up', 'OAuth can be enabled next by adding Supabase Apple provider config.')}
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-3.5 px-4 flex-row items-center justify-center gap-3"
                >
                  <Apple color="#f8fafc" size={18} />
                  <FText className="text-white text-[15px]" weight="extrabold">
                    Sign up with Apple
                  </FText>
                </Pressable>
              </View>
            ) : (
              <View className="gap-3">
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full name"
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-3.5 px-4 text-white"
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-3.5 px-4 text-white"
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-3.5 px-4 text-white"
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-3.5 px-4 text-white"
                />

                <Pressable
                  onPress={handleSignUp}
                  disabled={!canSubmit || isLoading}
                  className={`w-full rounded-xl py-3.5 items-center justify-center ${
                    canSubmit && !isLoading ? 'bg-cyan-500' : 'bg-cyan-500/40'
                  }`}
                >
                  <FText className="text-black text-[15px]" weight="black">
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </FText>
                </Pressable>
                <Pressable
                  onPress={() => setShowEmailForm(false)}
                  className="py-2"
                >
                  <FText className="text-slate-400 text-center text-sm" weight="bold">
                    Back to sign up options
                  </FText>
                </Pressable>
              </View>
            )}

            <View className="mt-8 items-center">
              <FText className="text-slate-400 text-[14px]">
                Already have an account?{' '}
                <FText className="text-cyan-400" weight="extrabold" onPress={onGoToSignIn}>
                  Sign in.
                </FText>
              </FText>
              <FText className="text-slate-500 text-[11px] mt-7 text-center">
                By creating an account, you accept FlowState's Terms of Service.
              </FText>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
