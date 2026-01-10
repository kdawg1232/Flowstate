import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, Linking, Alert, Switch } from 'react-native';
import { User, Settings, HelpCircle, Sun, Moon, LogOut, Shield, FileText, Trash2, Smartphone, Lock, Unlock } from 'lucide-react-native';
import { Text } from '../ui/Text';
import type { UserStats } from '../types';
import ScreenTime from '../native/ScreenTime';
import { getMilestoneForReps } from '../screentime';

const handleOpenPrivacy = () => Linking.openURL('https://getflowstate.netlify.app/privacy');
const handleOpenTerms = () => Linking.openURL('https://getflowstate.netlify.app/terms');

type Props = {
  theme: 'light' | 'dark';
  username?: string;
  stats: UserStats;
  onUpdateStats: (stats: UserStats) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
};

export function ProfileScreen({ theme, username, stats, onUpdateStats, onToggleTheme, onLogout, onDeleteAccount }: Props) {
  const isDark = theme === 'dark';
  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const cardBgClass = isDark ? 'bg-slate-900' : 'bg-white border border-slate-200';
  const bgClass = isDark ? 'bg-slate-950' : 'bg-slate-50';

  const handleOpenSupport = () => Linking.openURL('https://getflowstate.netlify.app/support');

  const screenTime = stats.screenTime || {
    allocatedMinutes: 0,
    usedMinutes: 0,
    restrictedAppTokens: [],
    isTrackingEnabled: false
  };

  const toggleScreenTime = async () => {
    const turningOn = !screenTime.isTrackingEnabled;
    
    if (turningOn) {
      console.log('[ScreenTime] Toggle ON requested');
      const authorized = await ScreenTime.requestAuthorization();
      if (!authorized) {
        Alert.alert("Permission Required", "FlowState needs Screen Time permission to restrict apps.");
        return;
      }
      
      // Set initial budget based on current milestone (or 0 if no milestone reached)
      const currentAllocatedMinutes = screenTime.allocatedMinutes || 0;
      console.log('[ScreenTime] Setting initial budget from Profile toggle:', currentAllocatedMinutes);
      await ScreenTime.setScreenTimeBudget(currentAllocatedMinutes);
    }
    console.log('[ScreenTime] Setting isTrackingEnabled to', turningOn);

    onUpdateStats({
      ...stats,
      screenTime: {
        ...screenTime,
        isTrackingEnabled: turningOn
      }
    });
  };

  const selectApps = async () => {
    try {
      const tokens = await ScreenTime.selectAppsToRestrict();
      onUpdateStats({
        ...stats,
        screenTime: {
          ...screenTime,
          restrictedAppTokens: tokens
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const currentMilestone = getMilestoneForReps(stats.maxDailyReps || 0);
  const protocolName = currentMilestone ? `${currentMilestone.label.toUpperCase()} PROTOCOL` : 'BASE PROTOCOL';
  const displayMinutes = screenTime.allocatedMinutes === 60 ? '∞' : `${screenTime.allocatedMinutes}m/hr`;

  const confirmDelete = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently erase all your progress and data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive", 
          onPress: onDeleteAccount 
        }
      ]
    );
  };

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
        <Text weight="black" className={`text-2xl ${textColorClass}`}>{username || 'Flow Member'}</Text>
        <Text weight="bold" variant="mono" className={`${subTextColorClass} text-sm`}>FLOW_ID: {Math.floor(Math.random() * 90000) + 10000}-XP</Text>
      </View>

      <View className="gap-6">
        <View>
          <Text weight="black" className={`text-xs ${subTextColorClass} uppercase tracking-widest mb-3 ml-1`}>Screen Time Control</Text>
          <View className={`${cardBgClass} rounded-3xl overflow-hidden`}>
             <View className={`flex-row items-center justify-between p-4 ${isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
               <View className="flex-row items-center gap-3">
                 <Lock size={18} color="#06b6d4" />
                 <View>
                   <Text weight="semibold" className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Active Enforcement</Text>
                   <Text weight="black" className="text-[9px] text-slate-500 uppercase tracking-widest">Blocks apps when reps run out</Text>
                 </View>
               </View>
               <Switch 
                 value={screenTime.isTrackingEnabled} 
                 onValueChange={toggleScreenTime}
                 trackColor={{ false: '#334155', true: '#06b6d4' }}
                 thumbColor="#ffffff"
               />
             </View>

             <Pressable 
               onPress={selectApps} 
               disabled={!screenTime.isTrackingEnabled}
               className={`flex-row items-center justify-between p-4 ${!screenTime.isTrackingEnabled ? 'opacity-40' : ''} ${isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}
             >
               <View className="flex-row items-center gap-3">
                 <Smartphone size={18} color="#94a3b8" />
                 <Text weight="semibold" className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Restricted Apps</Text>
               </View>
               <View className="flex-row items-center gap-2">
                 <Text weight="bold" className="text-xs text-cyan-500">{screenTime.restrictedAppTokens.length} Selected</Text>
               </View>
             </Pressable>

             <View className="p-4 bg-cyan-500/5">
                <View className="flex-row justify-between items-end">
                   <View>
                     <Text weight="black" variant="mono" className="text-cyan-500 text-lg">{displayMinutes}</Text>
                     <Text weight="bold" className="text-[10px] text-slate-500 uppercase">{protocolName}</Text>
                   </View>
                   <View className="items-end">
                     <Text weight="black" variant="mono" className="text-slate-400 text-lg">{screenTime.usedMinutes}m</Text>
                     <Text weight="bold" className="text-[10px] text-slate-500 uppercase">Hourly Consumption</Text>
                   </View>
                </View>
                <View className="h-1.5 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
                   <View 
                     className="h-full bg-cyan-500" 
                     style={{ width: `${Math.min(100, (screenTime.usedMinutes / (screenTime.allocatedMinutes || 1)) * 100)}%` }} 
                   />
                </View>
             </View>

             {screenTime.isTrackingEnabled && (
               <Pressable 
                 onPress={async () => {
                   try {
                     await ScreenTime.clearShield();
                     Alert.alert("Restriction Removed", "App restrictions have been cleared. You can now use your apps freely until your next hourly limit is reached.");
                   } catch (error) {
                     console.error('Failed to clear shield:', error);
                     Alert.alert("Error", "Failed to remove restriction. Please try again.");
                   }
                 }}
                 className={`flex-row items-center justify-center gap-2 p-4 ${isDark ? 'border-t border-slate-800' : 'border-t border-slate-100'}`}
               >
                 <Unlock size={16} color="#f59e0b" />
                 <Text weight="bold" className="text-sm text-amber-500">Remove Current Restriction</Text>
               </Pressable>
             )}
          </View>
        </View>

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
          <Text weight="black" className={`text-xs ${subTextColorClass} uppercase tracking-widest mb-3 ml-1`}>Legal</Text>
          <View className={`${cardBgClass} rounded-3xl overflow-hidden`}>
             <Pressable onPress={handleOpenPrivacy} className={`flex-row items-center justify-between p-4 ${isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
               <View className="flex-row items-center gap-3">
                 <Shield size={18} color="#94a3b8" />
                 <Text weight="semibold" className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Privacy Policy</Text>
               </View>
             </Pressable>
             
             <Pressable onPress={handleOpenTerms} className={`flex-row items-center justify-between p-4 ${isDark ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
               <View className="flex-row items-center gap-3">
                 <FileText size={18} color="#94a3b8" />
                 <Text weight="semibold" className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Terms of Service</Text>
               </View>
             </Pressable>

             <Pressable onPress={confirmDelete} className="flex-row items-center justify-between p-4">
               <View className="flex-row items-center gap-3">
                 <Trash2 size={18} color="#f43f5e" />
                 <Text weight="semibold" className="text-sm text-rose-500">Delete Account & Data</Text>
               </View>
             </Pressable>
          </View>
        </View>

        <View>
          <Text weight="black" className={`text-xs ${subTextColorClass} uppercase tracking-widest mb-3 ml-1`}>Support</Text>
          <View className={`${cardBgClass} rounded-3xl overflow-hidden`}>
             <Pressable onPress={handleOpenSupport} className="flex-row items-center justify-between p-4">
               <View className="flex-row items-center gap-3">
                 <HelpCircle size={18} color="#94a3b8" />
                 <Text weight="semibold" className={`text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>Help Center & Support</Text>
               </View>
             </Pressable>
          </View>
        </View>
      </View>

      <View className="mt-12 items-center">
        <Text weight="bold" className="text-slate-600 text-xs">FlowState v1.0.4 - System Secure</Text>
      </View>
    </ScrollView>
  );
}
