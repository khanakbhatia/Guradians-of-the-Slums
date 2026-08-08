import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { ROUTES } from "@/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { DataText, Eyebrow, H1, Text } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";

// recharts is a meaningful chunk of weight — lazy-load it so the
// landing page's first paint doesn't wait on it.
const TrendAreaChart = lazy(() =>
  import("@/components/ui/charts").then((m) => ({ default: m.TrendAreaChart }))
);

const PREVIEW_TREND = [
  { name: "00", v: 4 }, { name: "04", v: 7 }, { name: "08", v: 5 },
  { name: "12", v: 12 }, { name: "16", v: 9 }, { name: "20", v: 14 }, { name: "24", v: 10 },
];

function Hero() {
  return (
    <section className="border-b border-border">
      <div className="container grid gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
        <div>
          <Eyebrow className="mb-3 block text-muted-foreground">
            IBM Hackathon — Municipal Disaster Response
          </Eyebrow>

          <H1 className="text-3xl leading-[1.15] sm:text-[2.5rem] sm:leading-[1.12]">
            A shared operating picture for informal-settlement emergency response.
          </H1>

          <Text className="mt-4 max-w-lg text-muted-foreground">
            Guardians of the Slums gives citizens, field volunteers, and municipal authorities one
            coordinated view of every hazard — from first report to resolution — with AI-assisted
            triage built on the IBM stack.
          </Text>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link to={ROUTES.REGISTER}>
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-5 font-mono text-2xs text-muted-foreground">
            <span><DataText className="text-foreground">128</DataText> zones monitored</span>
            <span><DataText className="text-foreground">2,340</DataText> volunteers onboard</span>
            <span><DataText className="text-foreground">9.4m</DataText> avg. response time</span>
          </div>
        </div>

        {/* Operational preview — reads as a real console screenshot, not decoration */}
        <Card variant="elevated" className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
            <Eyebrow>Live Response Feed</Eyebrow>
            <StatusChip variant="success" pulse>Live</StatusChip>
          </div>
          <div className="space-y-3.5 p-3.5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Eyebrow>Incidents / 24h</Eyebrow>
                <DataText className="text-foreground">61 total</DataText>
              </div>
              <Suspense fallback={<Skeleton className="h-[110px] w-full" />}>
                <TrendAreaChart data={PREVIEW_TREND} areaKey="v" height={110} />
              </Suspense>
            </div>

            <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
              {[
                { label: "Open", value: "22" },
                { label: "Dispatched", value: "14" },
                { label: "Resolved", value: "25" },
              ].map((s) => (
                <div key={s.label} className="px-2.5 py-2">
                  <Eyebrow>{s.label}</Eyebrow>
                  <div className="mt-0.5 font-mono text-base font-medium text-foreground">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {[
                { id: "INC-2291", zone: "Dharavi Sector 4", sev: "destructive" },
                { id: "INC-2290", zone: "Govandi East", sev: "warning" },
              ].map((row) => (
                <div key={row.id} className="flex items-center gap-2 border border-border px-2.5 py-1.5">
                  <StatusChip variant={row.sev} dot />
                  <DataText className="text-muted-foreground">{row.id}</DataText>
                  <span className="ml-auto truncate text-xs text-foreground/80">{row.zone}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default Hero;
