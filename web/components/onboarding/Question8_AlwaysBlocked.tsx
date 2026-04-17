import { QuestionShell } from '@/components/onboarding/QuestionShell';

export function Question8_AlwaysBlocked({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <QuestionShell title="Any sites you always want blocked?">
      <p className="text-sm text-gray-500 -mt-2">
        Optional - comma-separated domains (e.g. twitter.com, reddit.com)
      </p>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="twitter.com, reddit.com, instagram.com"
        rows={3}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
      />
    </QuestionShell>
  );
}
