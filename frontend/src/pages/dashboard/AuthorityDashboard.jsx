import DashboardHeader from "@/components/common/DashboardHeader";
import RiskHeatmap from "@/components/dashboard/authority/RiskHeatmap";
import RecentAlerts from "@/components/dashboard/authority/RecentAlerts";
import AnalyticsCards from "@/components/dashboard/authority/AnalyticsCards";
import VolunteerSummary from "@/components/dashboard/authority/VolunteerSummary";
import TaskApprovalQueue from "@/components/dashboard/authority/TaskApprovalQueue";

/**
 * Authority Dashboard — composed from src/components/dashboard/authority/*.
 * Operational feeds use the backend through React Query hooks.
 *
 * OverviewCards, IncidentFeed and AIRecommendations were intentionally
 * removed from this layout: they showed persistent loading/retry states
 * rather than content, which was unacceptable for the live dashboard.
 * The components themselves are left in place under
 * src/components/dashboard/authority/ (nothing was deleted), so any of
 * them can be re-added here by restoring its import and its line below.
 */
function AuthorityDashboard() {
  return (
    <div className="space-y-6">
      <DashboardHeader subtitle="City-wide incident monitoring and response coordination." />

      <div className="grid gap-4 lg:grid-cols-3">
        <RiskHeatmap className="lg:col-span-2" />
        <RecentAlerts />
      </div>

      <AnalyticsCards />

      <div className="grid gap-4 lg:grid-cols-2">
        <VolunteerSummary />
        <TaskApprovalQueue />
      </div>
    </div>
  );
}

export default AuthorityDashboard;
