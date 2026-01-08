import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import Landing from './Landing';
import Step1Hook from './Step1Hook';
import NewStep2Definition from './NewStep2Definition';
import Step2Quiz from './Step2Quiz';
import Step3Results from './Step3Results';
import Step4Vision from './Step4Vision';
import Step5Solution from './Step5Solution';
import Step5bScreenTime from './Step5bScreenTime';
import Step6Proof from './Step6Proof';
import Step7Arsenal from './Step7Arsenal';
import Step8Payoff from './Step8Payoff';
import { ProgressBar } from './ProgressBar';

interface Props {
  onComplete: (screenTimeEnabled?: boolean) => void;
}

const OnboardingFlow: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for back
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [screenTimeEnabled, setScreenTimeEnabled] = useState(false);

  const nextStep = () => {
    setDirection(1);
    setStep(prev => prev + 1);
  };
  const prevStep = () => {
    setDirection(-1);
    setStep(prev => Math.max(0, prev - 1));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Landing onNext={nextStep} onLogin={nextStep} onSignUp={nextStep} />;
      case 1:
        return <Step1Hook onNext={nextStep} onBack={prevStep} />;
      case 2:
        return <NewStep2Definition onNext={nextStep} onBack={prevStep} />;
      case 3:
        return (
          <Step2Quiz 
            onNext={nextStep} 
            onBack={prevStep} 
            selectedTags={selectedTags} 
            toggleTag={toggleTag} 
          />
        );
      case 4:
        return <Step3Results onNext={nextStep} onBack={prevStep} />;
      case 5:
        return <Step4Vision onNext={nextStep} onBack={prevStep} />;
      case 6:
        return <Step5Solution onNext={nextStep} onBack={prevStep} />;
      case 7:
        return <Step5bScreenTime onNext={nextStep} onBack={prevStep} onScreenTimeEnabled={setScreenTimeEnabled} />;
      case 8:
        return <Step6Proof onNext={nextStep} onBack={prevStep} />;
      case 9:
        return <Step7Arsenal onNext={nextStep} onBack={prevStep} />;
      case 10:
        return <Step8Payoff onComplete={() => onComplete(screenTimeEnabled)} onBack={prevStep} />;
      default:
        return <Landing onNext={nextStep} />;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {step > 0 && (
          <View className="absolute top-16 left-6 right-6 flex-row items-center z-[200]">
            <Pressable 
              onPress={prevStep}
              className="p-2 mr-4"
            >
              <ArrowLeft size={24} color="#64748b" />
            </Pressable>
            <ProgressBar progress={step / 10} />
          </View>
        )}
        
        <AnimatePresence exitBeforeEnter>
          <MotiView
            key={step}
            from={{ 
              opacity: 0, 
              translateX: direction * 50 
            }}
            animate={{ 
              opacity: 1, 
              translateX: 0 
            }}
            exit={{ 
              opacity: 0, 
              translateX: -direction * 50 
            }}
            transition={{ 
              type: 'timing', 
              duration: 400,
            }}
            style={StyleSheet.absoluteFill}
          >
            {renderStep()}
          </MotiView>
        </AnimatePresence>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  content: {
    flex: 1,
  },
});

export default OnboardingFlow;
