import { QuestionShell } from '@/components/onboarding/QuestionShell';

export function Question5_WorkStart({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionShell title="What time does your workday start?">
      <input
        type="time"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-black"
      />
    </QuestionShell>
  );
}
