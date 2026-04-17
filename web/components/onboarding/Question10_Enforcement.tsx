import { QuestionShell } from '@/components/onboarding/QuestionShell';
import { RadioOption } from '@/components/onboarding/QuestionInputs';

const ENFORCEMENT_OPTIONS = [
  { value: 'WARN_ONLY', label: 'Warn only - duck shows up and gives you a look' },
  { value: 'BLUR', label: 'Blur - page goes blurry to annoy you' },
  { value: 'BLOCK', label: 'Block - blur plus cursor trap overlay' },
  { value: 'SHAME_AND_BLOCK', label: 'Shame and block - full roast plus block' },
];

export function Question10_Enforcement({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionShell title="What should the duck do when you're distracted?">
      {ENFORCEMENT_OPTIONS.map(option => (
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
