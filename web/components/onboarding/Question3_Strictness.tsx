import { QuestionShell } from '@/components/onboarding/QuestionShell';

export function Question3_Strictness({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <QuestionShell title="How strict should the duck be?">
      <div className="space-y-3">
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={event => onChange(parseInt(event.target.value, 10))}
          className="w-full accent-black"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Gentle nudges</span>
          <span className="font-semibold text-black text-sm">{value}/5</span>
          <span>Full chaos mode</span>
        </div>
      </div>
    </QuestionShell>
  );
}
