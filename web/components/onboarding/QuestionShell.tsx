import type { ReactNode } from 'react';

export function QuestionShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}
