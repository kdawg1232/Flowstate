import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, Animated, Vibration } from 'react-native';
import { Text } from '../ui/Text';
import { Unlock, X } from 'lucide-react-native';
import ScreenTime from '../native/ScreenTime';

const HOLD_DURATION = 30000; // 30 seconds in milliseconds

type Props = {
  onDismissComplete: () => void;
  onCancel: () => void;
};

export function DismissScreen({ onDismissComplete, onCancel }: Props) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const handlePressIn = () => {
    setIsHolding(true);
    startTime.current = Date.now();
    
    // Animate progress
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    }).start();

    // Update progress text
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const newProgress = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(newProgress);
      
      // Vibrate every 5 seconds
      if (Math.floor(elapsed / 5000) > Math.floor((elapsed - 100) / 5000)) {
        Vibration.vibrate(50);
      }
    }, 100);

    // Complete after hold duration
    holdTimer.current = setTimeout(async () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      setProgress(1);
      Vibration.vibrate([0, 100, 50, 100]); // Success vibration
      
      try {
        await ScreenTime.clearShield();
        setDismissed(true);
        setTimeout(() => {
          onDismissComplete();
        }, 1000);
      } catch (error) {
        console.error('Failed to clear shield:', error);
      }
    }, HOLD_DURATION);
  };

  const handlePressOut = () => {
    if (dismissed) return;
    
    setIsHolding(false);
    setProgress(0);
    
    // Cancel animations and timers
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 0,
      useNativeDriver: false,
    }).stop();
    
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const remainingSeconds = Math.ceil((HOLD_DURATION / 1000) * (1 - progress));

  if (dismissed) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Unlock size={64} color="#10b981" />
          <Text weight="black" style={styles.successText}>RESTRICTION REMOVED</Text>
          <Text weight="medium" style={styles.successSubtext}>You can now use your apps</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeButton} onPress={onCancel}>
        <X size={24} color="#64748b" />
      </Pressable>

      <View style={styles.content}>
        <Unlock size={48} color="#f59e0b" />
        <Text weight="black" style={styles.title}>DISMISS RESTRICTION</Text>
        <Text weight="medium" style={styles.subtitle}>
          Hold the button below for 30 seconds to remove the current app restriction.
        </Text>
        <Text weight="bold" style={styles.warning}>
          This decision requires commitment.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.holdButton, isHolding && styles.holdButtonActive]}
        >
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          <View style={styles.buttonContent}>
            <Text weight="black" style={styles.buttonText}>
              {isHolding ? `HOLD ${remainingSeconds}s` : 'HOLD TO DISMISS'}
            </Text>
            {isHolding && (
              <Text weight="bold" style={styles.buttonSubtext}>
                Keep holding...
              </Text>
            )}
          </View>
        </Pressable>

        <Text weight="medium" style={styles.hint}>
          Release to cancel
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
    padding: 24,
    justifyContent: 'space-between',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    color: '#f59e0b', // amber-500
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8', // slate-400
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  warning: {
    fontSize: 12,
    color: '#64748b', // slate-500
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  holdButton: {
    width: '100%',
    height: 80,
    backgroundColor: '#1e293b', // slate-800
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155', // slate-700
  },
  holdButtonActive: {
    borderColor: '#f59e0b', // amber-500
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#f59e0b', // amber-500
    opacity: 0.3,
  },
  buttonContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  buttonText: {
    fontSize: 18,
    color: '#f59e0b', // amber-500
    letterSpacing: 2,
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#94a3b8', // slate-400
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#475569', // slate-600
    marginTop: 16,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  successText: {
    fontSize: 24,
    color: '#10b981', // emerald-500
    marginTop: 16,
  },
  successSubtext: {
    fontSize: 16,
    color: '#94a3b8', // slate-400
  },
});
