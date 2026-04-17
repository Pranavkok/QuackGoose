'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OnboardingAnswers } from '@/components/onboarding/types';
import { Question1_ProductivityType } from '@/components/onboarding/Question1_ProductivityType';
import { Question2_DistractionTypes } from '@/components/onboarding/Question2_DistractionTypes';
import { Question3_Strictness } from '@/components/onboarding/Question3_Strictness';
import { Question4_DailyFocusGoal } from '@/components/onboarding/Question4_DailyFocusGoal';
import { Question5_WorkStart } from '@/components/onboarding/Question5_WorkStart';
import { Question6_WorkEnd } from '@/components/onboarding/Question6_WorkEnd';
import { Question7_DistractionLimit } from '@/components/onboarding/Question7_DistractionLimit';
import { Question8_AlwaysBlocked } from '@/components/onboarding/Question8_AlwaysBlocked';
import { Question9_AlwaysProductive } from '@/components/onboarding/Question9_AlwaysProductive';
import { Question10_Enforcement } from '@/components/onboarding/Question10_Enforcement';

const DEFAULT: OnboardingAnswers = {
  productivityType: '',
  distractionTypes: [],
  strictnessLevel: 3,
  dailyFocusGoalHours: '4',
  workStartTime: '09:00',
  workEndTime: '18:00',
  distractionLimit: '60',
  alwaysBlockedDomains: '',
  alwaysProductiveDomains: '',
  enforcementLevel: 'BLUR',
};

export default function QuestionWizard() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const TOTAL = 10;

  function update<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function toggleDistraction(val: string) {
    setAnswers(prev => ({
      ...prev,
      distractionTypes: prev.distractionTypes.includes(val)
        ? prev.distractionTypes.filter(d => d !== val)
        : [...prev.distractionTypes, val],
    }));
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });
      if (!res.ok) throw new Error('Failed to save');
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const canProceed = () => {
    if (step === 1) return answers.productivityType !== '';
    if (step === 2) return answers.distractionTypes.length > 0;
    if (step === 4) return parseFloat(answers.dailyFocusGoalHours) > 0;
    if (step === 10) return answers.enforcementLevel !== '';
    return true;
  };

  function renderStep() {
    if (step === 1) {
      return (
        <Question1_ProductivityType
          value={answers.productivityType}
          onChange={value => update('productivityType', value)}
        />
      );
    }
    if (step === 2) {
      return (
        <Question2_DistractionTypes
          value={answers.distractionTypes}
          onToggle={toggleDistraction}
        />
      );
    }
    if (step === 3) {
      return (
        <Question3_Strictness
          value={answers.strictnessLevel}
          onChange={value => update('strictnessLevel', value)}
        />
      );
    }
    if (step === 4) {
      return (
        <Question4_DailyFocusGoal
          value={answers.dailyFocusGoalHours}
          onChange={value => update('dailyFocusGoalHours', value)}
        />
      );
    }
    if (step === 5) {
      return (
        <Question5_WorkStart
          value={answers.workStartTime}
          onChange={value => update('workStartTime', value)}
        />
      );
    }
    if (step === 6) {
      return (
        <Question6_WorkEnd
          value={answers.workEndTime}
          onChange={value => update('workEndTime', value)}
        />
      );
    }
    if (step === 7) {
      return (
        <Question7_DistractionLimit
          value={answers.distractionLimit}
          onChange={value => update('distractionLimit', value)}
        />
      );
    }
    if (step === 8) {
      return (
        <Question8_AlwaysBlocked
          value={answers.alwaysBlockedDomains}
          onChange={value => update('alwaysBlockedDomains', value)}
        />
      );
    }
    if (step === 9) {
      return (
        <Question9_AlwaysProductive
          value={answers.alwaysProductiveDomains}
          onChange={value => update('alwaysProductiveDomains', value)}
        />
      );
    }
    return (
      <Question10_Enforcement
        value={answers.enforcementLevel}
        onChange={value => update('enforcementLevel', value)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#fef3c7,_#fff_45%,_#eef2ff)] px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {step} of {TOTAL}</span>
            <span>{Math.round((step / TOTAL) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL) * 100}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-6">
          <div key={step} className="qf-step-enter">
            {renderStep()}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
              className="px-5 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            {step < TOTAL ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={loading || !canProceed()}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving…' : 'Start Tracking 🦆'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
