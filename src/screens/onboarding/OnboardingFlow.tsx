import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Landing from './Landing';
import Step1Hook from './Step1Hook';
import NewStep2Definition from './NewStep2Definition';
import Step2Quiz from './Step2Quiz';
import Step3Results from './Step3Results';
import Step4Vision from './Step4Vision';
import Step5Solution from './Step5Solution';
import Step6Proof from './Step6Proof';
import Step7Arsenal from './Step7Arsenal';
import Step8Payoff from './Step8Payoff';

interface Props {
  onComplete: () => void;
}

const OnboardingFlow: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => Math.max(0, prev - 1));

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
        return <Step6Proof onNext={nextStep} onBack={prevStep} />;
      case 8:
        return <Step7Arsenal onNext={nextStep} onBack={prevStep} />;
      case 9:
        return <Step8Payoff onComplete={onComplete} onBack={prevStep} />;
      default:
        return <Landing onNext={nextStep} />;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {renderStep()}
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
