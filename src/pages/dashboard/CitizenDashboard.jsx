import { Eyebrow } from "@/components/ui/typography";
import RiskStatus from "@/components/dashboard/citizen/RiskStatus";
import NearbyShelters from "@/components/dashboard/citizen/NearbyShelters";
import EmergencyAlerts from "@/components/dashboard/citizen/EmergencyAlerts";
import ReportIncidentDialog from "@/components/dashboard/citizen/ReportIncidentDialog";
import EmergencyContacts from "@/components/dashboard/citizen/EmergencyContacts";
import DisasterTips from "@/components/dashboard/citizen/DisasterTips";
import RecentNotifications from "@/components/dashboard/citizen/RecentNotifications";

/**
 * Citizen Dashboard — "Area Overview". Composed entirely from
 * src/components/dashboard/citizen/*, same data/API hooks as before.
 * Ordered by operational priority: area safety status, active alerts,
 * nearby shelters, my reports/updates, emergency contacts, then
 * lower-priority reference content (disaster tips) at the bottom.
 */
function CitizenDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <Eyebrow>Area Overview</Eyebrow>
          <h1 className="mt-0.5 text-lg font-semibold text-foreground">Current Safety Status</h1>
        </div>
        <ReportIncidentDialog />
      </div>

      <RiskStatus />

      <div className="grid gap-4 lg:grid-cols-2">
        <EmergencyAlerts />
        <NearbyShelters />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentNotifications />
        <EmergencyContacts />
      </div>

      <DisasterTips />
    </div>
  );
}

export default CitizenDashboard;
