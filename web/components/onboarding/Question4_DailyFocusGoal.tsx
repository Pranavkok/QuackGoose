import { QuestionShell } from '@/components/onboarding/QuestionShell';

export function Question4_DailyFocusGoal({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionShell title="How many hours is a productive day for you?">
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={12}
          step={0.5}
          value={value}
          onChange={event => onChange(event.target.value)}
          className="w-28 border border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-black"
        />
        <span className="text-gray-500">hours of focused work</span>
      </div>
    </QuestionShell>
  );
}
