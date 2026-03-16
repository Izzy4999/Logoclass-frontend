import PageHeader from "@/components/shared/PageHeader";
import StatsCard from "@/components/shared/StatsCard";
import { useAuth } from "@/hooks/useAuth";
import { UserCheck, BookOpen, Wallet, Bell } from "lucide-react";

export default function ParentDashboard() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "Parent"}`}
        description="Track your child's progress"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Attendance" value="—" icon={UserCheck} />
        <StatsCard title="Subjects" value="—" icon={BookOpen} iconColor="text-secondary" />
        <StatsCard title="Pending Fees" value="—" icon={Wallet} iconColor="text-orange-500" />
        <StatsCard title="Notifications" value="—" icon={Bell} iconColor="text-cta" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <p className="text-muted-foreground">Child overview coming soon.</p>
      </div>
    </div>
  );
}
