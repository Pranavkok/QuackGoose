import { EmployeeShell } from '@/components/layout/EmployeeShell';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>;
}
