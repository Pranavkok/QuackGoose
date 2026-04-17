import { QuestionShell } from '@/components/onboarding/QuestionShell';

export function Question9_AlwaysProductive({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionShell title="Any sites always productive for you?">
      <p className="text-sm text-gray-500 -mt-2">Optional - comma-separated domains</p>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="notion.so, linear.app, figma.com"
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
      />
    </QuestionShell>
  );
}
