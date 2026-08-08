import DashboardHeader from "@/components/common/DashboardHeader";
import OverviewCards from "@/components/dashboard/authority/OverviewCards";
import RiskHeatmap from "@/components/dashboard/authority/RiskHeatmap";
import RecentAlerts from "@/components/dashboard/authority/RecentAlerts";
import AnalyticsCards from "@/components/dashboard/authority/AnalyticsCards";
import VolunteerSummary from "@/components/dashboard/authority/VolunteerSummary";
import IncidentFeed from "@/components/dashboard/authority/IncidentFeed";
import TaskApprovalQueue from "@/components/dashboard/authority/TaskApprovalQueue";
import AIRecommendations from "@/components/dashboard/authority/AIRecommendations";

/**
 * Authority Dashboard — composed entirely from src/components/dashboard/authority/*.
 * Every section reads DUMMY JSON from src/data/authorityDashboard.js.
 * No backend is integrated anywhere on this page.
 */
function AuthorityDashboard() {
  return (
    <div className="space-y-6">
      <DashboardHeader subtitle="City-wide incident monitoring and response coordination." />

      <OverviewCards />

      <div className="grid gap-4 lg:grid-cols-3">
        <RiskHeatmap className="lg:col-span-2" />
        <RecentAlerts />
      </div>

      <AnalyticsCards />

      <div className="grid gap-4 lg:grid-cols-2">
        <VolunteerSummary />
        <TaskApprovalQueue />
      </div>

      <IncidentFeed />

      <AIRecommendations />
    </div>
  );
}

export default AuthorityDashboard;
