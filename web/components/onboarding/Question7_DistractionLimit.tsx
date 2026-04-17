import { QuestionShell } from '@/components/onboarding/QuestionShell';
import { RadioOption } from '@/components/onboarding/QuestionInputs';

const OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: 'goal_based', label: 'None until I hit my focus goal' },
];

export function Question7_DistractionLimit({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionShell title="How much distraction is acceptable per day?">
      {OPTIONS.map(option => (
        <RadioOption
          key={option.value}
          label={option.label}
          selected={value === option.value}
          onClick={() => onChange(option.value)}
        />
      ))}
    </QuestionShell>
  );
}
