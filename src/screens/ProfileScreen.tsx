import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { User, Settings, HelpCircle, Sun, Moon, LogOut } from 'lucide-react-native';
import { Text } from '../ui/Text';

type Props = {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
};

export function ProfileScreen({ theme, onToggleTheme, onLogout }: Props) {
  const isDark = theme === 'dark';
  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const cardBgClass = isDark ? 'bg-slate-900' : 'bg-white border border-slate-200';
  const bgClass = isDark ? 'bg-slate-950' : 'bg-slate-50';

  return (
    <ScrollView className={`flex-1 ${bgClass}`} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
      <View className="items-center py-8">
        <View className="relative mb-4">
          <View className="w-24 h-24 rounded-full bg-cyan-600 p-1">
            <View className={`w-full h-full rounded-full ${isDark ? 'bg-slate-900' : 'bg-white'} items-center justify-center overflow-hidden`}>
              <User size={48} color={isDark ? "#94a3b8" : "#cbd5e1"} />
            </View>
          </View>
          <View className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-slate-950 rounded-full" />
        </View>
        <Text weight="black" className={`text-2xl ${textColorClass}`}>System Admin</Text>
        <Text weight="bold" variant="mono" className={`${subTextColorClass} text-sm`}>FLOW_ID: 88293-XP</Text>
      </View>

      <View className="gap-6">
        <View>
          <Text weight="black" className={`text-xs ${subTextColorClass} uppercase tracking-widest mb-3 ml-1`}>Account</Text>
          <View className={`${cardBgClass} rounded-3xl overflow-hidden`}>
             <Pressable onPress={onToggleTheme} className={`flex-row items-center justify-between p-4 ${isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
               <View className="flex-row items-center gap-3">
                 {isDark ? <Moon size={18} color="#818cf8" /> : <Sun size={18} color="#f59e0b" />}
                 <Text weight="semibold" className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Light Mode</Text>
               </View>
               <View className={`w-10 h-5 rounded-full relative ${!isDark ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                 <View className={`absolute top-1 w-3 h-3 rounded-full bg-white ${!isDark ? 'right-1' : 'left-1'}`} />
               </View>
             </Pressable>
             
             <View className={`flex-row items-center justify-between p-4 ${isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
               <View className="flex-row items-center gap-3">
                 <Settings size={18} color="#94a3b8" />
                 <Text weight="semibold" className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Settings</Text>
               </View>
             </View>

             <Pressable onPress={onLogout} className="flex-row items-center justify-between p-4">
               <View className="flex-row items-center gap-3">
                 <LogOut size={18} color="#f43f5e" />
                 <Text weight="semibold" className="text-sm text-rose-500">Disconnect session</Text>
               </View>
             </Pressable>
          </View>
        </View>

        <View>
          <Text weight="black" className={`text-xs ${subTextColorClass} uppercase tracking-widest mb-3 ml-1`}>Support</Text>
          <View className={`${cardBgClass} rounded-3xl overflow-hidden`}>
             <View className="flex-row items-center justify-between p-4">
               <View className="flex-row items-center gap-3">
                 <HelpCircle size={18} color="#94a3b8" />
                 <Text weight="semibold" className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Help Center</Text>
               </View>
             </View>
          </View>
        </View>
      </View>

      <View className="mt-12 items-center">
        <Text weight="bold" className="text-slate-600 text-xs">FlowState v1.0.4 - System Secure</Text>
      </View>
    </ScrollView>
  );
}
