import { QuestionShell } from '@/components/onboarding/QuestionShell';
import { RadioOption } from '@/components/onboarding/QuestionInputs';

const PRODUCTIVITY_TYPES = ['DEVELOPER', 'DESIGNER', 'WRITER', 'STUDENT', 'MANAGER', 'OTHER'];

export function Question1_ProductivityType({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionShell title="What best describes your work?">
      {PRODUCTIVITY_TYPES.map(type => (
        <RadioOption
          key={type}
          label={type.charAt(0) + type.slice(1).toLowerCase()}
          selected={value === type}
          onClick={() => onChange(type)}
        />
      ))}
    </QuestionShell>
  );
}
