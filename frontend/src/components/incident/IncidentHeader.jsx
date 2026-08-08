import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, TriangleAlert, UserPlus, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Eyebrow, H2, Muted } from "@/components/ui/typography";
import { SEVERITY_VARIANT } from "@/constants/variants";

const STATUS_VARIANT = { open: "neutral", "in-progress": "info", dispatched: "primary", resolved: "success" };

function IncidentHeader({ incident, onAction }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back
      </button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <DataText className="text-muted-foreground">{incident.id}</DataText>
            <StatusChip variant={SEVERITY_VARIANT[incident.severity]}>{incident.severity}</StatusChip>
            <StatusChip variant={STATUS_VARIANT[incident.status]} dot={false}>
              {incident.status.replace("-", " ")}
            </StatusChip>
          </div>
          <H2 className="mt-2">{incident.title}</H2>
          <Muted className="mt-1">
            {incident.zone} · Reported {incident.reportedAt} · {incident.reportedBy}
          </Muted>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onAction("escalate")}>
            <TriangleAlert className="size-4" /> Escalate
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction("reassign")}>
            <UserPlus className="size-4" /> Reassign
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction("dispatch")}>
            <Zap className="size-4" /> Dispatch
          </Button>
          <Button variant="success" size="sm" onClick={() => onAction("resolve")}>
            <CheckCircle2 className="size-4" /> Mark resolved
          </Button>
        </div>
      </div>

      <Eyebrow className="block">Description</Eyebrow>
      <p className="max-w-3xl text-sm leading-relaxed text-foreground/90">{incident.description}</p>
    </div>
  );
}

export default IncidentHeader;
