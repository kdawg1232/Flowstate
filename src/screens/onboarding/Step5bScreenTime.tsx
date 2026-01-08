import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Shield, Smartphone, Lock, Check, AlertCircle } from 'lucide-react-native';
import { Text } from '../../ui/Text';
import ScreenTime from '../../native/ScreenTime';

interface Props {
  onNext: () => void;
  onBack: () => void;
  onScreenTimeEnabled: (enabled: boolean) => void;
}

const Step5bScreenTime: React.FC<Props> = ({ onNext, onBack, onScreenTimeEnabled }) => {
  const [authorized, setAuthorized] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedApps, setSelectedApps] = useState(false);

  const handleEnableScreenTime = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Platform Not Supported', 'Screen Time controls are only available on iOS devices.');
      return;
    }

    setIsRequesting(true);
    try {
      const result = await ScreenTime.requestAuthorization();
      if (result) {
        setAuthorized(true);
      } else {
        Alert.alert(
          'Permission Required',
          'FlowState needs Screen Time permission to enforce your access limits. You can enable this later in Settings.'
        );
      }
    } catch (error) {
      console.error('Screen Time authorization error:', error);
      Alert.alert('Error', 'Failed to request Screen Time permission.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSelectApps = async () => {
    try {
      await ScreenTime.selectAppsToRestrict();
      setSelectedApps(true);
      
      // Set initial budget to 0 minutes - this starts blocking apps immediately
      // User must earn time through reps to access them
      await ScreenTime.setScreenTimeBudget(0);
      
      // Notify parent that Screen Time is fully configured
      onScreenTimeEnabled(true);
    } catch (error) {
      console.error('App selection error:', error);
    }
  };

  const isComplete = authorized && selectedApps;

  return (
    <View className="flex-1 w-full bg-[#0a0a0c] px-6 pt-32">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header section */}
        <View className="mt-12 mb-10 items-center px-2">
          <View className="w-16 h-16 mb-6 rounded-3xl bg-cyan-500/10 items-center justify-center border border-cyan-500/20">
            <Shield size={32} color="#06b6d4" />
          </View>
          <Text weight="black" className="text-2xl italic tracking-tighter uppercase leading-tight mb-3 text-white text-center">
            Activate{"\n"}
            <Text weight="black" className="text-[#06b6d4]">Enforcement Protocol.</Text>
          </Text>
          <Text weight="bold" className="text-slate-500 text-[9px] uppercase tracking-[0.3em] max-w-[280px] leading-relaxed text-center">
            Enable iOS Screen Time to automatically enforce your access limits.
          </Text>
        </View>

        {/* Step 1: Authorization */}
        <View className="gap-3 mb-8">
          <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 300 }}
          >
            <Pressable
              onPress={handleEnableScreenTime}
              disabled={authorized || isRequesting}
              className={`w-full p-4 rounded-2xl border flex-row items-center gap-4 transition-all relative overflow-hidden ${
                authorized
                  ? 'bg-[#06b6d4]/5 border-[#06b6d4]/20'
                  : 'bg-white/5 border-dashed border-white/20'
              } active:scale-[0.98]`}
              style={authorized ? {
                shadowColor: '#06b6d4',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.05,
                shadowRadius: 20,
              } : undefined}
            >
              {!authorized && (
                <MotiView 
                  from={{ opacity: 0.05 }}
                  animate={{ opacity: 0.15 }}
                  transition={{ 
                    type: 'timing', 
                    duration: 1000, 
                    loop: true, 
                    repeatReverse: true 
                  }}
                  className="absolute inset-0 bg-cyan-400" 
                />
              )}

              <View className="w-12 items-center justify-center">
                <Text variant="mono" weight="black" className={`text-xs ${authorized ? 'text-[#06b6d4]' : 'text-slate-600'}`}>
                  01
                </Text>
              </View>

              <View className="flex-1">
                <Text weight="black" className={`text-[10px] uppercase tracking-widest mb-0.5 ${authorized ? 'text-white' : 'text-slate-500'}`}>
                  {isRequesting ? 'Requesting Permission...' : 'Grant Screen Time Access'}
                </Text>
                <Text weight="bold" className={`text-[9px] ${authorized ? 'text-[#06b6d4]' : 'text-slate-700'}`}>
                  {authorized ? 'Permission granted' : 'Tap to authorize'}
                </Text>
              </View>

              <View className="shrink-0">
                {authorized ? <Check size={16} strokeWidth={3} color="#06b6d4" /> : <Lock size={16} color="#334155" />}
              </View>
            </Pressable>
          </MotiView>

          {/* Step 2: App Selection */}
          <AnimatePresence>
            {authorized && (
              <MotiView
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 300, delay: 100 }}
              >
                <Pressable
                  onPress={handleSelectApps}
                  disabled={selectedApps}
                  className={`w-full p-4 rounded-2xl border flex-row items-center gap-4 transition-all relative overflow-hidden ${
                    selectedApps
                      ? 'bg-[#06b6d4]/5 border-[#06b6d4]/20'
                      : 'bg-white/5 border-dashed border-white/20'
                  } active:scale-[0.98]`}
                  style={selectedApps ? {
                    shadowColor: '#06b6d4',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.05,
                    shadowRadius: 20,
                  } : undefined}
                >
                  {!selectedApps && (
                    <MotiView 
                      from={{ opacity: 0.05 }}
                      animate={{ opacity: 0.15 }}
                      transition={{ 
                        type: 'timing', 
                        duration: 1000, 
                        loop: true, 
                        repeatReverse: true 
                      }}
                      className="absolute inset-0 bg-cyan-400" 
                    />
                  )}

                  <View className="w-12 items-center justify-center">
                    <Text variant="mono" weight="black" className={`text-xs ${selectedApps ? 'text-[#06b6d4]' : 'text-slate-600'}`}>
                      02
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text weight="black" className={`text-[10px] uppercase tracking-widest mb-0.5 ${selectedApps ? 'text-white' : 'text-slate-500'}`}>
                      Select Apps to Restrict
                    </Text>
                    <Text weight="bold" className={`text-[9px] ${selectedApps ? 'text-[#06b6d4]' : 'text-slate-700'}`}>
                      {selectedApps ? 'Apps configured' : 'Choose what to control'}
                    </Text>
                  </View>

                  <View className="shrink-0">
                    {selectedApps ? <Check size={16} strokeWidth={3} color="#06b6d4" /> : <Smartphone size={16} color="#334155" />}
                  </View>
                </Pressable>
              </MotiView>
            )}
          </AnimatePresence>

          {/* Helper text */}
          {!isComplete && (
            <MotiView 
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="items-center mt-2"
            >
              <Text weight="black" className="text-[8px] uppercase tracking-[0.4em] text-slate-700 text-center">
                {!authorized ? 'Tap to enable system permissions' : 'Complete app selection'}
              </Text>
            </MotiView>
          )}
        </View>

        {/* Info box */}
        <AnimatePresence>
          {isComplete && (
            <MotiView 
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl mb-8 flex-row items-center gap-3"
            >
              <AlertCircle size={16} color="#06b6d4" className="shrink-0" />
              <View className="flex-1">
                <Text weight="bold" className="text-[9px] text-cyan-500 uppercase tracking-widest leading-relaxed">
                  <Text weight="black">Protocol Active:</Text> Your selected apps will be blocked when you run out of earned minutes.
                </Text>
              </View>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Skip or Continue buttons */}
        <View className="gap-3">
          <Pressable 
            onPress={onNext}
            disabled={!isComplete}
            className={`w-full py-5 rounded-full items-center transition-all ${
              isComplete 
                ? 'bg-cyan-500 shadow-lg' 
                : 'bg-white/5 opacity-20'
            } active:scale-95`}
            style={isComplete ? {
              shadowColor: '#06b6d4',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 35,
            } : undefined}
          >
            <Text weight="black" className={`text-sm uppercase tracking-widest ${isComplete ? 'text-black' : 'text-slate-800'}`}>
              Continue to Success Stories
            </Text>
          </Pressable>

          {!authorized && (
            <Pressable 
              onPress={onNext}
              className="w-full py-4 items-center active:scale-95"
            >
              <Text weight="bold" className="text-slate-600 text-xs uppercase tracking-widest">
                Skip for now
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default Step5bScreenTime;
