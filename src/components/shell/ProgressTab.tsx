import ProgressDashboard from "@/components/progress/ProgressDashboard";
import AdminSubscribersCard from "@/components/admin/AdminSubscribersCard";

export default function ProgressTab() {
  return (
    <div className="space-y-3 pb-4">
      <header className="pt-2">
        <h1 className="text-2xl font-extrabold">My Progress</h1>
        <p className="text-sm text-muted-foreground">Streaks, XP, weekly targets and revision</p>
      </header>
      <AdminSubscribersCard />
      <ProgressDashboard />
    </div>
  );
}
