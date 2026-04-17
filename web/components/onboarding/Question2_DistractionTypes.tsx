import { QuestionShell } from '@/components/onboarding/QuestionShell';
import { CheckOption } from '@/components/onboarding/QuestionInputs';

const DISTRACTION_TYPES = ['social_media', 'news', 'video', 'shopping', 'gaming', 'other'];

export function Question2_DistractionTypes({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <QuestionShell title="What are your biggest distractions?">
      <p className="text-sm text-gray-500 -mt-2">Select all that apply</p>
      {DISTRACTION_TYPES.map(type => (
        <CheckOption
          key={type}
          label={type.replace('_', ' ')}
          checked={value.includes(type)}
          onChange={() => onToggle(type)}
        />
      ))}
    </QuestionShell>
  );
}
