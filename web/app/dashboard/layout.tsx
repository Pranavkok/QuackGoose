import { EmployeeShell } from '@/components/layout/EmployeeShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>;
}
