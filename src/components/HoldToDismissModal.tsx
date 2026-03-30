import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Pressable, StyleSheet, Animated, Vibration, Modal, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '../ui/Text';
import ScreenTime from '../native/ScreenTime';

const HOLD_DURATION = 30000;
const CIRCLE_SIZE = 160;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  visible: boolean;
  onDismissComplete: () => void;
  onCancel: () => void;
  clearShieldOnComplete?: boolean;
};

export function HoldToDismissModal({ visible, onDismissComplete, onCancel, clearShieldOnComplete = true }: Props) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (progressInterval.current) { clearInterval(progressInterval.current); progressInterval.current = null; }
  }, []);

  useEffect(() => {
    if (!visible) {
      cleanup();
      setIsHolding(false);
      setProgress(0);
      setDismissed(false);
      progressAnim.setValue(0);
    }
    return cleanup;
  }, [visible, cleanup, progressAnim]);

  const handlePressIn = () => {
    if (dismissed) return;
    setIsHolding(true);
    startTime.current = Date.now();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    }).start();

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const p = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(p);

      if (Math.floor(elapsed / 5000) > Math.floor((elapsed - 100) / 5000)) {
        Vibration.vibrate(50);
      }
    }, 100);

    holdTimer.current = setTimeout(async () => {
      cleanup();
      setProgress(1);
      Vibration.vibrate([0, 100, 50, 100]);

      if (clearShieldOnComplete) {
        try { await ScreenTime.clearShield(); } catch (e) { console.error('Failed to clear shield:', e); }
      }
      setDismissed(true);
      setTimeout(() => onDismissComplete(), 600);
    }, HOLD_DURATION);
  };

  const handlePressOut = () => {
    if (dismissed) return;
    setIsHolding(false);
    setProgress(0);
    cleanup();
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
  };

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const remainingSeconds = Math.ceil((HOLD_DURATION / 1000) * (1 - progress));

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {dismissed ? (
            <View style={styles.successWrap}>
              <Text weight="black" style={styles.successTitle}>RESTRICTION REMOVED</Text>
              <Text weight="bold" style={styles.successSub}>Apps are now unblocked.</Text>
            </View>
          ) : (
            <>
              <Text weight="black" style={styles.heading}>DISMISS RESTRICTION</Text>
              <Text weight="bold" style={styles.subtitle}>
                Hold down button for 30 seconds{'\n'}to dismiss the restriction.
              </Text>

              <View style={styles.circleWrap}>
                <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                  <Circle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={RADIUS}
                    stroke="rgba(6,182,212,0.15)"
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                  />
                  <AnimatedCircle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={RADIUS}
                    stroke="#06b6d4"
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={strokeDashoffset}
                    rotation="-90"
                    origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                  />
                </Svg>

                <Pressable
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  style={[styles.holdBtn, isHolding && styles.holdBtnActive]}
                >
                  <Text weight="black" style={styles.holdBtnText}>
                    {isHolding ? `${remainingSeconds}s` : 'HOLD'}
                  </Text>
                  {isHolding && (
                    <Text weight="bold" style={styles.holdBtnSub}>Keep holding…</Text>
                  )}
                </Pressable>
              </View>

              <Pressable onPress={onCancel} style={styles.nevermindBtn}>
                <Text weight="bold" style={styles.nevermindText}>Nevermind</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0f172a',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.2)',
    padding: 32,
    alignItems: 'center',
  },
  heading: {
    fontSize: 16,
    color: '#06b6d4',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  circleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  svg: {
    position: 'absolute',
  },
  holdBtn: {
    width: CIRCLE_SIZE - STROKE_WIDTH * 2 - 16,
    height: CIRCLE_SIZE - STROKE_WIDTH * 2 - 16,
    borderRadius: (CIRCLE_SIZE - STROKE_WIDTH * 2 - 16) / 2,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdBtnActive: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6,182,212,0.1)',
  },
  holdBtnText: {
    fontSize: 20,
    color: '#06b6d4',
    letterSpacing: 2,
  },
  holdBtnSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nevermindBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  nevermindText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  successWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  successTitle: {
    fontSize: 18,
    color: '#10b981',
    letterSpacing: 2,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
