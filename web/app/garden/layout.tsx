import { EmployeeShell } from '@/components/layout/EmployeeShell';

export default async function GardenLayout({ children }: { children: React.ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>;
}
